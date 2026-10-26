import unittest

from tests.base import Base, sufixo

PAPEIS = ("administrador_chefe", "administrador", "organizador", "usuario")
PERMITIDOS = {
    "chefe": ("administrador", "organizador", "usuario"),
    "admin": ("organizador", "usuario"),
    "org": ("usuario",),
    "usuario": (),
}


class NiveisDeUsuario(Base):
    def test_criar_usuario_respeita_a_hierarquia(self):
        for quem, permitidos in PERMITIDOS.items():
            for nivel in PAPEIS:
                with self.subTest(quem=quem, cria=nivel):
                    email = f"zz.teste.{sufixo()}@idade.digital"
                    status, _ = self.chamar(
                        "POST",
                        "/usuarios",
                        {
                            "nome": "ZZ-Teste",
                            "email": email,
                            "senha": "senha-teste-123",
                            "papel": nivel,
                        },
                        quem,
                    )
                    self.assertEqual(status, 201 if nivel in permitidos else 403)

    def test_editar_usuario_respeita_a_hierarquia(self):
        alvos = {}
        for nivel in PAPEIS[1:]:
            alvos[nivel] = self.novo_usuario("chefe", nivel)
        for quem, permitidos in PERMITIDOS.items():
            for nivel, (uid, email, _) in alvos.items():
                with self.subTest(quem=quem, edita=nivel):
                    status, _ = self.chamar(
                        "PUT",
                        f"/usuarios/{uid}",
                        {"nome": "ZZ-Teste Editado", "email": email},
                        quem,
                    )
                    self.assertEqual(status, 200 if nivel in permitidos else 403)

    def test_excluir_usuario_respeita_a_hierarquia(self):
        for quem, permitidos in PERMITIDOS.items():
            for nivel in PAPEIS[1:]:
                uid, _, _ = self.novo_usuario("chefe", nivel)
                with self.subTest(quem=quem, exclui=nivel):
                    status, _ = self.chamar("DELETE", f"/usuarios/{uid}", papel=quem)
                    self.assertEqual(status, 200 if nivel in permitidos else 403)

    def test_promocao_e_rebaixamento(self):
        uid, email, _ = self.novo_usuario("chefe", "usuario")
        corpo = lambda papel: {
            "nome": "ZZ-Teste",
            "email": email,
            "papel": papel,
        }  # noqa: E731
        self.assertEqual(
            self.chamar("PUT", f"/usuarios/{uid}", corpo("organizador"), "admin")[0],
            200,
        )
        self.assertEqual(
            self.chamar("PUT", f"/usuarios/{uid}", corpo("administrador"), "admin")[0],
            403,
        )
        self.assertEqual(
            self.chamar("PUT", f"/usuarios/{uid}", corpo("administrador"), "org")[0],
            403,
        )
        self.assertEqual(
            self.chamar("PUT", f"/usuarios/{uid}", corpo("administrador"), "chefe")[0],
            200,
        )
        self.assertEqual(
            self.chamar("PUT", f"/usuarios/{uid}", corpo("usuario"), "chefe")[0], 200
        )

    def test_so_existe_um_administrador_chefe(self):
        status, dados = self.chamar(
            "POST",
            "/usuarios",
            {
                "nome": "ZZ-Teste",
                "email": f"zz.teste.{sufixo()}@x.com",
                "senha": "senha-teste-123",
                "papel": "administrador_chefe",
            },
            "chefe",
        )
        self.assertEqual(status, 403, dados)

    def test_ninguem_muda_o_proprio_nivel_nem_se_exclui(self):
        eu = self.dados["chefe"]
        corpo = {"nome": eu["nome"], "email": eu["email"]}
        self.assertEqual(
            self.chamar(
                "PUT", f"/usuarios/{eu['id']}", {**corpo, "papel": "usuario"}, "chefe"
            )[0],
            400,
        )
        self.assertEqual(
            self.chamar(
                "PUT", f"/usuarios/{eu['id']}", {**corpo, "ativo": False}, "chefe"
            )[0],
            400,
        )
        self.assertEqual(
            self.chamar("DELETE", f"/usuarios/{eu['id']}", papel="chefe")[0], 400
        )

    def test_listagem_por_nivel(self):
        niveis = lambda papel: {
            u["papel"] for u in self.chamar("GET", "/usuarios", papel=papel)[1]
        }  # noqa: E731
        self.assertEqual(niveis("org"), {"usuario"})
        self.assertGreater(len(niveis("admin")), 1)
        self.assertEqual(self.chamar("GET", "/usuarios", papel="usuario")[0], 403)

    def test_validacoes(self):
        base = {
            "nome": "ZZ-Teste",
            "email": f"zz.teste.{sufixo()}@x.com",
            "senha": "senha-teste-123",
        }
        casos = [
            ({**base, "senha": "curta"}, 400),
            ({**base, "email": "sem-arroba"}, 400),
            ({**base, "nome": ""}, 400),
            ({**base, "nome": "x" * 121}, 400),
            ({**base, "senha": "x" * 129}, 400),
            ({**base, "papel": "deus"}, 403),
        ]
        for corpo, esperado in casos:
            with self.subTest(corpo={k: str(v)[:12] for k, v in corpo.items()}):
                self.assertEqual(
                    self.chamar("POST", "/usuarios", corpo, "chefe")[0], esperado
                )

    def test_email_unico_sem_diferenciar_maiusculas(self):
        _, email, _ = self.novo_usuario()
        corpo = {"nome": "ZZ-Teste", "email": email.upper(), "senha": "senha-teste-123"}
        self.assertEqual(self.chamar("POST", "/usuarios", corpo, "chefe")[0], 409)

    def test_troca_de_senha_vale_no_proximo_login(self):
        uid, email, senha = self.novo_usuario()
        self.assertEqual(
            self.chamar(
                "PUT",
                f"/usuarios/{uid}",
                {"nome": "ZZ-Teste", "email": email, "senha": "outra-senha-456"},
                "chefe",
            )[0],
            200,
        )
        self.assertEqual(
            self.chamar("POST", "/auth/login", {"email": email, "senha": senha})[0], 401
        )
        self.assertEqual(
            self.chamar(
                "POST", "/auth/login", {"email": email, "senha": "outra-senha-456"}
            )[0],
            200,
        )

    def test_usuario_comum_nao_altera_conteudo(self):
        tentativas = [
            ("POST", "/cursos", {"nome": "x", "descricao": "d", "categoria": "c"}),
            ("POST", "/informacoes", {"nome": "x", "descricao": "d"}),
            (
                "POST",
                "/equipe",
                {"categoria": "parceiro", "nome": "x", "funcao": "y", "descricao": "d"},
            ),
            ("POST", "/cursos/1/modulos", {"titulo": "x"}),
        ]
        for papel in ("usuario", "org"):
            for metodo, rota, corpo in tentativas:
                with self.subTest(papel=papel, rota=rota):
                    self.assertEqual(self.chamar(metodo, rota, corpo, papel)[0], 403)


if __name__ == "__main__":
    unittest.main()
