import unittest

from tests.base import Base, png, sufixo


class Autenticacao(Base):
    def test_login_com_email_em_maiusculas(self):
        status, dados = self.chamar(
            "POST",
            "/auth/login",
            {"email": self.EMAILS["usuario"].upper(), "senha": "x"},
        )
        self.assertEqual(status, 401)
        self.assertNotIn("token", dados)

    def test_login_exige_campos(self):
        self.assertEqual(self.chamar("POST", "/auth/login", {})[0], 400)
        self.assertEqual(
            self.chamar("POST", "/auth/login", {"email": "a@b.com"})[0], 400
        )

    def test_mensagem_generica_nao_revela_se_o_email_existe(self):
        _, a = self.chamar(
            "POST",
            "/auth/login",
            {"email": self.EMAILS["usuario"], "senha": "errada-123"},
        )
        _, b = self.chamar(
            "POST",
            "/auth/login",
            {"email": f"nao.existe.{sufixo()}@x.com", "senha": "errada-123"},
        )
        self.assertEqual(a["erro"], b["erro"])

    def test_bloqueio_apos_varias_falhas(self):
        email = f"brute.{sufixo()}@x.com"
        codigos = [
            self.chamar("POST", "/auth/login", {"email": email, "senha": "x" * 8})[0]
            for _ in range(7)
        ]
        self.assertEqual(codigos[:5], [401] * 5)
        self.assertEqual(codigos[5:], [429, 429])

    def test_me_devolve_o_papel(self):
        status, dados = self.chamar("GET", "/auth/me", papel="chefe")
        self.assertEqual((status, dados["papel"]), (200, "administrador_chefe"))

    def test_token_adulterado_ou_ausente(self):
        for cab in (
            {},
            {"Authorization": "Bearer abc"},
            {"Authorization": self.token["chefe"]},
            {"Authorization": "Bearer " + self.token["chefe"][:-3] + "xxx"},
        ):
            self.assertEqual(self.chamar("GET", "/cursos", headers=cab)[0], 401, cab)

    def test_conta_desativada_perde_o_acesso_na_hora(self):
        uid, email, senha = self.novo_usuario()
        self.entrar(email, senha)
        corpo = {"nome": "ZZ-Teste Pessoa", "email": email, "ativo": False}
        self.assertEqual(self.chamar("PUT", f"/usuarios/{uid}", corpo, "chefe")[0], 200)
        self.assertEqual(
            self.chamar(
                "GET",
                "/cursos",
                headers={"Authorization": f"Bearer {self.token[email]}"},
            )[0],
            401,
        )
        self.assertEqual(
            self.chamar("POST", "/auth/login", {"email": email, "senha": senha})[0], 401
        )


class Seguranca(Base):
    ROTAS_PROTEGIDAS = [
        ("GET", "/cursos"),
        ("GET", "/cursos/1"),
        ("GET", "/cursos/1/modulos/1"),
        ("GET", "/informacoes"),
        ("GET", "/informacoes/1"),
        ("GET", "/equipe"),
        ("GET", "/usuarios"),
        ("GET", "/voz/vozes"),
        ("POST", "/voz"),
        ("POST", "/cursos"),
        ("PUT", "/cursos/1"),
        ("DELETE", "/cursos/1"),
        ("POST", "/cursos/1/modulos"),
        ("POST", "/usuarios"),
        ("POST", "/equipe"),
        ("POST", "/uploads"),
        ("PUT", "/cursos/1/modulos/1/conteudos/1/concluir"),
    ]

    def test_toda_rota_protegida_exige_login(self):
        for metodo, caminho in self.ROTAS_PROTEGIDAS:
            with self.subTest(rota=f"{metodo} {caminho}"):
                self.assertEqual(self.chamar(metodo, caminho)[0], 401)

    def test_rotas_publicas(self):
        for caminho in ("/status", "/health", "/voz/publica/disponivel"):
            self.assertIn(self.chamar("GET", caminho)[0], (200,), caminho)

    def test_injecao_de_sql_na_busca_e_tratada_como_texto(self):
        for ataque in (
            "'; DROP TABLE cursos; --",
            "' OR '1'='1",
            "%' UNION SELECT 1,2,3,4,5,6,7--",
            "\\",
            "%",
            "_",
        ):
            for rota in ("/cursos", "/informacoes", "/usuarios"):
                with self.subTest(ataque=ataque, rota=rota):
                    status, dados = self.chamar(
                        "GET", rota, papel="chefe", query_string={"q": ataque}
                    )
                    self.assertEqual(status, 200, dados)
        self.assertEqual(
            self.chamar("GET", "/cursos", papel="chefe")[0], 200
        )  # a tabela continua lá

    def test_injecao_em_login(self):
        status, _ = self.chamar(
            "POST",
            "/auth/login",
            {"email": "' OR 1=1 --@x.com", "senha": "' OR '1'='1"},
        )
        self.assertEqual(status, 401)

    def test_json_invalido_ou_tipo_errado(self):
        resposta = self.cli.post(
            "/auth/login", data="{nao e json", content_type="application/json"
        )
        self.assertIn(resposta.status_code, (400, 401))
        for corpo in ([], "texto", 123, {"email": ["a"], "senha": {"x": 1}}):
            self.assertIn(self.chamar("POST", "/auth/login", corpo)[0], (400, 401, 415))

    def test_erros_sao_json_e_em_portugues(self):
        status, dados = self.chamar("GET", "/rota-que-nao-existe")
        self.assertEqual((status, dados["erro"]), (404, "Recurso não encontrado."))
        status, dados = self.chamar("DELETE", "/status")
        self.assertEqual(
            (status, dados["erro"]), (405, "Método não permitido para este recurso.")
        )

    def test_cors_so_para_origens_do_frontend(self):
        ok = self.cli.get("/status", headers={"Origin": "http://localhost:5173"})
        ruim = self.cli.get("/status", headers={"Origin": "https://site-malicioso.com"})
        self.assertEqual(
            ok.headers.get("Access-Control-Allow-Origin"), "http://localhost:5173"
        )
        self.assertIsNone(ruim.headers.get("Access-Control-Allow-Origin"))

    def test_upload_servido_com_nosniff_e_sem_traversal(self):
        status, dados = self.enviar_imagem(png())
        self.assertEqual(status, 201)
        with self.cli.get(dados["url"]) as resposta:  # fechar solta o arquivo (Windows)
            self.assertEqual(resposta.headers["X-Content-Type-Options"], "nosniff")
            self.assertEqual(resposta.mimetype, "image/png")
        for caminho in (
            "/uploads/..%2f..%2fapp.py",
            "/uploads/app.py",
            "/uploads/%2e%2e/config.py",
            "/uploads/" + "a" * 32 + ".png",
        ):
            self.assertEqual(self.cli.get(caminho).status_code, 404, caminho)

    def test_senhas_nao_aparecem_em_respostas(self):
        for rota in ("/usuarios", "/auth/me"):
            texto = str(self.chamar("GET", rota, papel="chefe")[1])
            self.assertNotIn("senha", texto.lower())
            self.assertNotIn("scrypt", texto)


if __name__ == "__main__":
    unittest.main()
