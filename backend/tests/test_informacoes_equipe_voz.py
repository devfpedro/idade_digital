import io
import unittest
import wave

from tests.base import PREFIXO, Base, png, sufixo


class Informacoes(Base):
    def corpo(self, **extra):
        return {
            "nome": f"{PREFIXO} Dica {sufixo()}",
            "descricao": "Resumo",
            "conteudo": "Texto completo",
            **extra,
        }

    def test_crud_completo_com_capa_e_links(self):
        up = self.enviar_imagem(png())[1]["url"]
        corpo = self.corpo(
            imagem=up,
            videoUrl="https://www.youtube.com/watch?v=abc",
            artigoUrl="https://www.gov.br",
            artigoFonte="Governo",
            artigoTitulo="Artigo",
            artigoResumo="Resumo do artigo",
        )
        status, dados = self.chamar("POST", "/informacoes", corpo, "admin")
        self.assertEqual(status, 201, dados)
        iid = dados["id"]
        lido = self.chamar("GET", f"/informacoes/{iid}", papel="usuario")[1]
        self.assertEqual(
            (lido["imagem"], lido["videoUrl"], lido["artigoFonte"]),
            (up, corpo["videoUrl"], "Governo"),
        )
        self.assertEqual(
            self.chamar(
                "PUT",
                f"/informacoes/{iid}",
                {**corpo, "nome": corpo["nome"] + " ed", "imagem": ""},
                "chefe",
            )[0],
            200,
        )
        self.assertEqual(
            self.cli.get(up).status_code,
            404,
            "a capa trocada deve ser apagada do disco",
        )
        self.assertEqual(
            self.chamar("DELETE", f"/informacoes/{iid}", papel="admin")[0], 200
        )
        self.assertEqual(
            self.chamar("GET", f"/informacoes/{iid}", papel="usuario")[0], 404
        )

    def test_so_gestores_alteram(self):
        for papel in ("org", "usuario"):
            self.assertEqual(
                self.chamar("POST", "/informacoes", self.corpo(), papel)[0], 403
            )
            self.assertEqual(
                self.chamar("PUT", "/informacoes/1", self.corpo(), papel)[0], 403
            )
            self.assertEqual(
                self.chamar("DELETE", "/informacoes/1", papel=papel)[0], 403
            )

    def test_validacoes(self):
        for extra in (
            {"videoUrl": "https://vimeo.com/1"},
            {"videoUrl": "nao-e-link"},
            {"artigoUrl": "javascript:alert(1)"},
            {"imagem": "/uploads/../../etc/passwd"},
            {"imagem": "javascript:alert(1)"},
            {"nome": ""},
            {"descricao": "x" * 2001},
            {"conteudo": "x" * 20001},
            {"artigoResumo": "x" * 1001},
        ):
            with self.subTest(extra=str(extra)[:40]):
                self.assertEqual(
                    self.chamar("POST", "/informacoes", self.corpo(**extra), "admin")[
                        0
                    ],
                    400,
                )

    def test_nome_repetido(self):
        corpo = self.corpo()
        self.assertEqual(self.chamar("POST", "/informacoes", corpo, "admin")[0], 201)
        self.assertEqual(self.chamar("POST", "/informacoes", corpo, "admin")[0], 409)

    def test_recriar_titulo_de_informacao_excluida(self):
        capa = self.enviar_imagem(png())[1]["url"]
        corpo = self.corpo(imagem=capa)
        iid = self.chamar("POST", "/informacoes", corpo, "admin")[1]["id"]
        self.assertEqual(
            self.chamar("DELETE", f"/informacoes/{iid}", papel="admin")[0], 200
        )
        novo = {**corpo, "descricao": "Resumo novo", "imagem": ""}
        status, dados = self.chamar("POST", "/informacoes", novo, "admin")
        self.assertEqual(
            status, 201, "o título de uma informação excluída pode ser reutilizado"
        )
        lido = self.chamar("GET", f"/informacoes/{dados['id']}", papel="usuario")[1]
        self.assertEqual((lido["descricao"], lido["imagem"]), ("Resumo novo", None))
        self.assertEqual(
            self.cli.get(capa).status_code,
            404,
            "a capa antiga deve ser apagada do disco",
        )
        self.assertEqual(self.chamar("POST", "/informacoes", novo, "admin")[0], 409)

    def test_busca_ignora_acentos_e_caixa(self):
        marca = sufixo()
        self.chamar(
            "POST",
            "/informacoes",
            self.corpo(nome=f"{PREFIXO} Proteção {marca}"),
            "admin",
        )
        achados = self.chamar(
            "GET",
            "/informacoes",
            papel="usuario",
            query_string={"q": f"PROTECAO {marca}"},
        )[1]
        self.assertEqual(len(achados), 1)


class Uploads(Base):
    def test_formatos_aceitos_e_recusados(self):
        self.assertEqual(self.enviar_imagem(png())[0], 201)
        self.assertEqual(
            self.enviar_imagem(b"\xff\xd8\xff\xe0" + b"0" * 50, "a.jpg")[0], 201
        )
        self.assertEqual(
            self.enviar_imagem(b"RIFF\x00\x00\x00\x00WEBPVP8 " + b"0" * 20, "a.webp")[
                0
            ],
            201,
        )
        for conteudo, nome in (
            (b"texto comum", "a.png"),
            (b"<svg xmlns='http://www.w3.org/2000/svg'/>", "a.svg"),
            (b"GIF89a" + b"0" * 20, "a.gif"),
            (b"%PDF-1.4", "a.pdf"),
            (b"MZ\x90\x00", "a.exe"),
            (b"", "vazio.png"),
        ):
            with self.subTest(nome=nome):
                self.assertEqual(self.enviar_imagem(conteudo, nome)[0], 400)

    def test_limite_de_4_mb(self):
        self.assertEqual(
            self.enviar_imagem(png() + b"0" * (4 * 1024 * 1024 + 1))[0], 413
        )

    def test_sem_arquivo_e_sem_permissao(self):
        self.assertEqual(
            self.chamar(
                "POST",
                "/uploads",
                papel="admin",
                data={},
                content_type="multipart/form-data",
            )[0],
            400,
        )
        for papel in ("org", "usuario"):
            self.assertEqual(self.enviar_imagem(png(), papel=papel)[0], 403)

    def test_nome_do_arquivo_e_aleatorio_e_ignora_o_original(self):
        url = self.enviar_imagem(png(), "../../etc/passwd.png")[1]["url"]
        self.assertRegex(url, r"^/uploads/[a-f0-9]{32}\.png$")


class Equipe(Base):
    def corpo(self, **extra):
        return {
            "categoria": "integrante",
            "nome": f"{PREFIXO} Pessoa {sufixo()}",
            "funcao": "Desenvolvimento",
            "github": "https://github.com/octocat",
            **extra,
        }

    def test_crud_por_categoria(self):
        casos = [
            self.corpo(),
            {
                "categoria": "parceiro",
                "nome": f"{PREFIXO} Instituição {sufixo()}",
                "funcao": "Grupo de apoio",
                "descricao": "Ajuda o projeto",
            },
            {
                "categoria": "colaborador",
                "nome": f"{PREFIXO} Aluno {sufixo()}",
                "funcao": "Testes",
            },
        ]
        for corpo in casos:
            with self.subTest(categoria=corpo["categoria"]):
                status, dados = self.chamar("POST", "/equipe", corpo, "admin")
                self.assertEqual(status, 201, dados)
                self.assertEqual(
                    self.chamar(
                        "PUT",
                        f"/equipe/{dados['id']}",
                        {**corpo, "funcao": "Outra função"},
                        "chefe",
                    )[0],
                    200,
                )
                self.assertEqual(
                    self.chamar("DELETE", f"/equipe/{dados['id']}", papel="chefe")[0],
                    200,
                )
                self.assertEqual(
                    self.chamar("DELETE", f"/equipe/{dados['id']}", papel="chefe")[0],
                    404,
                )

    def test_recriar_cadastro_excluido(self):
        corpo = self.corpo()
        antigo = self.chamar("POST", "/equipe", corpo, "admin")[1]["id"]
        self.assertEqual(
            self.chamar("DELETE", f"/equipe/{antigo}", papel="admin")[0], 200
        )
        status, dados = self.chamar(
            "POST", "/equipe", {**corpo, "funcao": "Nova função"}, "admin"
        )
        self.assertEqual(
            status, 201, "o nome de um cadastro removido pode ser reutilizado"
        )
        self.assertEqual(dados["id"], antigo)
        equipe = self.chamar("GET", "/equipe", papel="usuario")[1]["integrantes"]
        achados = [p for p in equipe if p["nome"] == corpo["nome"]]
        self.assertEqual([p["funcao"] for p in achados], ["Nova função"])
        self.assertEqual(self.chamar("POST", "/equipe", corpo, "admin")[0], 409)

    def test_github_aceita_link_arroba_ou_usuario_e_gera_foto(self):
        for entrada in (
            "https://github.com/octocat",
            "github.com/octocat",
            "@octocat",
            "octocat",
            "https://www.github.com/octocat/",
        ):
            with self.subTest(entrada=entrada):
                _, dados = self.chamar(
                    "POST", "/equipe", self.corpo(github=entrada), "admin"
                )
                pessoas = self.chamar("GET", "/equipe", papel="usuario")[1][
                    "integrantes"
                ]
                pessoa = next(p for p in pessoas if p["id"] == dados["id"])
                self.assertEqual(
                    (pessoa["github"], pessoa["githubUrl"]),
                    ("octocat", "https://github.com/octocat"),
                )
                self.assertTrue(
                    pessoa["avatarUrl"].startswith("https://github.com/octocat.png")
                )

    def test_validacoes(self):
        invalidos = [
            self.corpo(github=""),
            self.corpo(github="https://evil.com/octocat"),
            self.corpo(github="a b"),
            self.corpo(github="-ruim"),
            self.corpo(github="x" * 40),
            self.corpo(categoria="outra"),
            self.corpo(nome=""),
            self.corpo(funcao=""),
            {
                "categoria": "parceiro",
                "nome": f"{PREFIXO} P",
                "funcao": "Grupo de apoio",
            },
        ]
        for corpo in invalidos:
            with self.subTest(corpo=str(corpo)[:60]):
                self.assertEqual(self.chamar("POST", "/equipe", corpo, "admin")[0], 400)

    def test_permissoes(self):
        for papel in ("org", "usuario"):
            self.assertEqual(
                self.chamar("POST", "/equipe", self.corpo(), papel)[0], 403
            )
        self.assertEqual(self.chamar("GET", "/equipe", papel="usuario")[0], 200)


class Voz(Base):
    def setUp(self):
        status, dados = self.chamar("GET", "/voz/vozes", papel="usuario")
        if not dados.get("disponivel"):
            self.skipTest("Piper/modelo de voz não instalado (rode o start.sh/start.bat).")
        self.vozes = [v["id"] for v in dados["vozes"]]

    def duracao(self, wav):
        w = wave.open(io.BytesIO(wav))
        return w.getnframes() / w.getframerate()

    def test_faber_e_a_voz_padrao(self):
        self.assertEqual(self.vozes[0], "faber")
        self.assertEqual(
            self.chamar("GET", "/voz/vozes", papel="usuario")[1]["ritmoPadrao"],
            "normal",
        )

    def test_gera_wav_valido(self):
        status, wav = self.chamar(
            "POST", "/voz", {"texto": "Bem-vindo ao Idade Digital."}, "usuario"
        )
        self.assertEqual((status, wav[:4]), (200, b"RIFF"))
        self.assertGreater(self.duracao(wav), 1)

    def test_ritmos_mudam_a_velocidade(self):
        texto = "Aqui você aprende a usar o celular com calma e segurança."
        d = {
            r: self.duracao(
                self.chamar("POST", "/voz", {"texto": texto, "ritmo": r}, "usuario")[1]
            )
            for r in ("rapido", "normal", "devagar")
        }
        self.assertLess(d["rapido"], d["normal"])
        self.assertLess(d["normal"], d["devagar"])

    def test_texto_com_simbolos_e_vazio(self):
        self.assertEqual(
            self.chamar(
                "POST",
                "/voz",
                {"texto": "🎓 Cursos → módulos • 50% “ok” & mais"},
                "usuario",
            )[0],
            200,
        )
        for texto in ("", "   ", "🎓🎓", None, 5, ["a"]):
            self.assertEqual(
                self.chamar("POST", "/voz", {"texto": texto}, "usuario")[0], 400, texto
            )
        self.assertEqual(
            self.chamar("POST", "/voz", {"texto": "a" * 1201}, "usuario")[0], 400
        )

    def test_voz_desconhecida_usa_a_padrao(self):
        self.assertEqual(
            self.chamar(
                "POST", "/voz", {"texto": "Olá.", "voz": "../../etc/passwd"}, "usuario"
            )[0],
            200,
        )

    def test_rota_publica_do_login(self):
        self.assertTrue(self.chamar("GET", "/voz/publica/disponivel")[1]["disponivel"])
        status, wav = self.chamar(
            "POST",
            "/voz/publica",
            {"texto": "Entre na sua conta.", "voz": "jeff", "ritmo": "rapido"},
        )
        self.assertEqual((status, wav[:4]), (200, b"RIFF"))
        self.assertEqual(
            self.chamar("POST", "/voz/publica", {"texto": "a" * 601})[0], 400
        )


if __name__ == "__main__":
    unittest.main()
