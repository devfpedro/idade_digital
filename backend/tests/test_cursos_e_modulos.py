import unittest

from tests.base import PREFIXO, Base, png, sufixo


class CursosEModulos(Base):
    def curso_com_modulos(self, quantidade=3):
        cid, corpo = self.novo_curso()
        for n in range(1, quantidade + 1):
            status, _ = self.chamar(
                "POST",
                f"/cursos/{cid}/modulos",
                {"titulo": f"Módulo {n}", "descricao": "d"},
                "admin",
            )
            self.assertEqual(status, 201)
        return cid, corpo

    def texto(self, cid, ordem, titulo="Texto"):
        status, dados = self.chamar(
            "POST",
            f"/cursos/{cid}/modulos/{ordem}/conteudos",
            {"tipo": "texto", "titulo": titulo, "texto": "Conteúdo de teste."},
            "admin",
        )
        self.assertEqual(status, 201, dados)
        return dados["id"]

    def situacoes(self, cid, papel="usuario"):
        return [
            m["situacao"]
            for m in self.chamar("GET", f"/cursos/{cid}", papel=papel)[1]["modulos"]
        ]

    def test_criar_editar_e_excluir_curso(self):
        cid, corpo = self.novo_curso()
        self.assertEqual(
            self.chamar("POST", "/cursos", corpo, "admin")[0], 409
        )  # nome repetido
        self.assertEqual(
            self.chamar(
                "PUT", f"/cursos/{cid}", {**corpo, "descricao": "Nova"}, "chefe"
            )[0],
            200,
        )
        self.assertEqual(
            self.chamar("GET", f"/cursos/{cid}", papel="usuario")[1]["descricao"],
            "Nova",
        )
        self.assertEqual(self.chamar("DELETE", f"/cursos/{cid}", papel="chefe")[0], 200)
        self.assertEqual(self.chamar("GET", f"/cursos/{cid}", papel="usuario")[0], 404)
        self.assertEqual(self.chamar("DELETE", f"/cursos/{cid}", papel="chefe")[0], 404)
        self.assertEqual(
            self.chamar("POST", "/cursos", corpo, "admin")[0], 201
        )  # o nome pode ser reutilizado

    def test_so_gestores_criam_e_excluem_cursos(self):
        cid, corpo = self.novo_curso()
        for papel in ("org", "usuario"):
            self.assertEqual(
                self.chamar(
                    "POST", "/cursos", {**corpo, "nome": corpo["nome"] + "x"}, papel
                )[0],
                403,
            )
            self.assertEqual(self.chamar("PUT", f"/cursos/{cid}", corpo, papel)[0], 403)
            self.assertEqual(
                self.chamar("DELETE", f"/cursos/{cid}", papel=papel)[0], 403
            )

    def test_validacao_do_curso(self):
        for corpo in (
            {},
            {"nome": "", "descricao": "d", "categoria": "c"},
            {"nome": "n", "descricao": "d"},
            {"nome": "x" * 151, "descricao": "d", "categoria": "c"},
            {
                "nome": "n",
                "descricao": "d",
                "categoria": "c",
                "imagem": "javascript:alert(1)",
            },
            {"nome": "n", "descricao": 5, "categoria": "c"},
        ):
            with self.subTest(corpo=str(corpo)[:40]):
                self.assertEqual(self.chamar("POST", "/cursos", corpo, "admin")[0], 400)

    def test_excluir_curso_apaga_modulos_progresso_e_capa(self):
        status, up = self.enviar_imagem(png())
        cid, corpo = self.novo_curso(imagem=up["url"])
        self.chamar("POST", f"/cursos/{cid}/modulos", {"titulo": "M1"}, "admin")
        conteudo = self.texto(cid, 1)
        self.chamar(
            "PUT",
            f"/cursos/{cid}/modulos/1/conteudos/{conteudo}/concluir",
            papel="usuario",
        )
        self.assertEqual(self.cli.get(up["url"]).status_code, 200)
        self.assertEqual(self.chamar("DELETE", f"/cursos/{cid}", papel="admin")[0], 200)
        self.assertEqual(self.cli.get(up["url"]).status_code, 404)

    def test_curso_aparece_na_lista_e_na_busca_sem_acento(self):
        marca = sufixo()
        cid, _ = self.novo_curso(nome=f"{PREFIXO} Informática básica {marca}")
        achados = [
            c["id"]
            for c in self.chamar(
                "GET",
                "/cursos",
                papel="usuario",
                query_string={"q": f"informatica basica {marca}"},
            )[1]
        ]
        self.assertEqual(achados, [cid])

    def test_modulos_sao_numerados_em_sequencia(self):
        cid, _ = self.curso_com_modulos(4)
        ordens = [
            m["ordem"]
            for m in self.chamar("GET", f"/cursos/{cid}", papel="usuario")[1]["modulos"]
        ]
        self.assertEqual(ordens, [1, 2, 3, 4])

    def test_modulo_so_libera_ao_concluir_o_anterior(self):
        cid, _ = self.curso_com_modulos(3)
        for n in (1, 2, 3):
            self.texto(cid, n)
        self.assertEqual(self.situacoes(cid), ["disponivel", "bloqueado", "bloqueado"])
        self.assertEqual(
            self.chamar("GET", f"/cursos/{cid}/modulos/2", papel="usuario")[0], 403
        )
        m1 = self.chamar("GET", f"/cursos/{cid}/modulos/1", papel="usuario")[1]
        resposta = self.chamar(
            "PUT",
            f"/cursos/{cid}/modulos/1/conteudos/{m1['conteudos'][0]['id']}/concluir",
            papel="usuario",
        )[1]
        self.assertTrue(resposta["moduloConcluido"] and resposta["recemConcluido"])
        self.assertEqual(resposta["proximaOrdem"], 2)
        self.assertEqual(self.situacoes(cid), ["concluido", "disponivel", "bloqueado"])
        self.assertEqual(
            self.chamar("GET", f"/cursos/{cid}/modulos/2", papel="usuario")[0], 200
        )
        self.assertEqual(
            self.chamar("GET", f"/cursos/{cid}/modulos/3", papel="usuario")[0], 403
        )

    def test_nao_da_para_concluir_conteudo_de_modulo_bloqueado_nem_de_outro_modulo(
        self,
    ):
        cid, _ = self.curso_com_modulos(2)
        c1, c2 = self.texto(cid, 1), self.texto(cid, 2)
        self.assertEqual(
            self.chamar(
                "PUT",
                f"/cursos/{cid}/modulos/2/conteudos/{c2}/concluir",
                papel="usuario",
            )[0],
            403,
        )
        self.assertEqual(
            self.chamar(
                "PUT",
                f"/cursos/{cid}/modulos/1/conteudos/{c2}/concluir",
                papel="usuario",
            )[0],
            404,
        )
        self.assertEqual(
            self.chamar(
                "PUT",
                f"/cursos/{cid}/modulos/1/conteudos/{c1}/concluir",
                papel="usuario",
            )[0],
            200,
        )

    def test_modulo_com_varios_conteudos_so_conclui_com_todos(self):
        cid, _ = self.curso_com_modulos(2)
        a, b = self.texto(cid, 1, "A"), self.texto(cid, 1, "B")
        r1 = self.chamar(
            "PUT", f"/cursos/{cid}/modulos/1/conteudos/{a}/concluir", papel="usuario"
        )[1]
        self.assertFalse(r1["moduloConcluido"])
        self.assertEqual(self.situacoes(cid), ["disponivel", "bloqueado"])
        r2 = self.chamar(
            "PUT", f"/cursos/{cid}/modulos/1/conteudos/{b}/concluir", papel="usuario"
        )[1]
        self.assertTrue(r2["recemConcluido"])
        again = self.chamar(
            "PUT", f"/cursos/{cid}/modulos/1/conteudos/{b}/concluir", papel="usuario"
        )[1]
        self.assertFalse(again["recemConcluido"])  # idempotente

    def test_progresso_e_individual(self):
        cid, _ = self.curso_com_modulos(2)
        c1 = self.texto(cid, 1)
        self.chamar(
            "PUT", f"/cursos/{cid}/modulos/1/conteudos/{c1}/concluir", papel="usuario"
        )
        self.assertEqual(self.situacoes(cid, "usuario")[0], "concluido")
        self.assertEqual(self.situacoes(cid, "org")[0], "disponivel")
        lista = {c["id"]: c for c in self.chamar("GET", "/cursos", papel="usuario")[1]}
        self.assertEqual(
            (lista[cid]["qtdModulos"], lista[cid]["modulosConcluidos"]), (2, 1)
        )

    def test_gestores_veem_todos_os_modulos_liberados(self):
        cid, _ = self.curso_com_modulos(3)
        for n in (1, 2, 3):
            self.texto(cid, n)
        self.assertEqual(self.situacoes(cid, "admin"), ["disponivel"] * 3)
        self.assertEqual(
            self.chamar("GET", f"/cursos/{cid}/modulos/3", papel="chefe")[0], 200
        )
        self.assertEqual(
            self.chamar("GET", f"/cursos/{cid}/modulos/3", papel="org")[0], 403
        )

    def test_excluir_modulo_renumera_os_seguintes(self):
        cid, _ = self.curso_com_modulos(4)
        self.assertEqual(
            self.chamar("DELETE", f"/cursos/{cid}/modulos/2", papel="chefe")[0], 200
        )
        modulos = self.chamar("GET", f"/cursos/{cid}", papel="usuario")[1]["modulos"]
        self.assertEqual(
            [(m["ordem"], m["titulo"]) for m in modulos],
            [(1, "Módulo 1"), (2, "Módulo 3"), (3, "Módulo 4")],
        )
        self.assertEqual(
            self.chamar("DELETE", f"/cursos/{cid}/modulos/9", papel="chefe")[0], 404
        )

    def test_excluir_conteudo_pendente_conclui_o_modulo_de_quem_terminou_o_resto(self):
        cid, _ = self.curso_com_modulos(2)
        a = self.texto(cid, 1, "A")
        b = self.texto(cid, 1, "B")
        self.chamar(
            "PUT", f"/cursos/{cid}/modulos/1/conteudos/{a}/concluir", papel="usuario"
        )
        self.assertEqual(self.situacoes(cid)[1], "bloqueado")
        self.assertEqual(
            self.chamar(
                "DELETE", f"/cursos/{cid}/modulos/1/conteudos/{b}", papel="admin"
            )[0],
            200,
        )
        self.assertEqual(self.situacoes(cid), ["concluido", "disponivel"])
        ordens = [
            c["ordem"]
            for c in self.chamar("GET", f"/cursos/{cid}/modulos/1", papel="admin")[1][
                "conteudos"
            ]
        ]
        self.assertEqual(ordens, [1])

    def test_validacao_dos_conteudos(self):
        cid, _ = self.curso_com_modulos(1)
        rota = f"/cursos/{cid}/modulos/1/conteudos"
        invalidos = [
            {"tipo": "texto", "titulo": "t"},
            {"tipo": "video", "titulo": "t", "url": "https://vimeo.com/1"},
            {"tipo": "video", "titulo": "t"},
            {"tipo": "link", "titulo": "t", "url": "ftp://x.com"},
            {"tipo": "link", "titulo": "t", "url": "javascript:alert(1)"},
            {"tipo": "outro", "titulo": "t"},
            {"tipo": "texto", "titulo": "", "texto": "x"},
        ]
        for corpo in invalidos:
            with self.subTest(corpo=str(corpo)):
                self.assertEqual(self.chamar("POST", rota, corpo, "admin")[0], 400)
        validos = [
            {
                "tipo": "video",
                "titulo": "v",
                "url": "https://www.youtube.com/watch?v=abc",
            },
            {"tipo": "video", "titulo": "v", "url": "https://youtu.be/abc"},
            {"tipo": "link", "titulo": "l", "url": "https://www.gov.br"},
        ]
        for corpo in validos:
            self.assertEqual(self.chamar("POST", rota, corpo, "admin")[0], 201)

    def test_editar_conteudo_e_modulo(self):
        cid, _ = self.curso_com_modulos(1)
        c = self.texto(cid, 1)
        corpo = {"tipo": "texto", "titulo": "Novo título", "texto": "Novo texto"}
        self.assertEqual(
            self.chamar(
                "PUT", f"/cursos/{cid}/modulos/1/conteudos/{c}", corpo, "admin"
            )[0],
            200,
        )
        self.assertEqual(
            self.chamar(
                "PUT",
                f"/cursos/{cid}/modulos/1",
                {"titulo": "Título novo", "descricao": "x"},
                "admin",
            )[0],
            200,
        )
        m = self.chamar("GET", f"/cursos/{cid}/modulos/1", papel="usuario")[1]
        self.assertEqual(
            (m["titulo"], m["conteudos"][0]["titulo"]), ("Título novo", "Novo título")
        )
        self.assertEqual(
            self.chamar(
                "PUT", f"/cursos/{cid}/modulos/1/conteudos/999999", corpo, "admin"
            )[0],
            404,
        )

    def test_recursos_inexistentes(self):
        for caminho in (
            "/cursos/999999",
            "/cursos/999999/modulos/1",
            "/cursos/1/modulos/999",
        ):
            self.assertEqual(
                self.chamar("GET", caminho, papel="usuario")[0], 404, caminho
            )
        self.assertEqual(
            self.chamar("POST", "/cursos/999999/modulos", {"titulo": "x"}, "admin")[0],
            404,
        )


if __name__ == "__main__":
    unittest.main()
