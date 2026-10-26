import io
import json
import secrets
import struct
import sys
import unittest
import zlib
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "backend" / "src"))

from app import app  # noqa: E402
from helpers import uploads  # noqa: E402
from helpers.database import getConexao  # noqa: E402

PREFIXO = "ZZ-Teste"
EMAIL_PREFIXO = "zz.teste."


def _contas():
    for nome in ("users_mock.json", "users_mock.json.example"):
        arquivo = RAIZ / "backend" / "db" / nome
        if arquivo.exists():
            return {
                u["email"]: u
                for u in json.loads(arquivo.read_text(encoding="utf-8"))["users"]
            }
    raise RuntimeError("users_mock.json não encontrado")


def png(largura=8, altura=8):
    def bloco(tipo, dados):
        return (
            struct.pack(">I", len(dados))
            + tipo
            + dados
            + struct.pack(">I", zlib.crc32(tipo + dados) & 0xFFFFFFFF)
        )

    linhas = b"".join(b"\x00" + b"\x20\x60\xc0" * largura for _ in range(altura))
    return (
        b"\x89PNG\r\n\x1a\n"
        + bloco(b"IHDR", struct.pack(">IIBBBBB", largura, altura, 8, 2, 0, 0, 0))
        + bloco(b"IDAT", zlib.compress(linhas))
        + bloco(b"IEND", b"")
    )


def sufixo():
    return secrets.token_hex(3)


class Base(unittest.TestCase):
    EMAILS = {
        "chefe": "pedro.henrique@idade.digital",
        "admin": "administrador.teste@idade.digital",
        "org": "organizador.teste@idade.digital",
        "usuario": "usuario.teste@idade.digital",
    }

    @classmethod
    def setUpClass(cls):
        cls.enviados = []  # imagens enviadas durante os testes (apagadas no final)
        app.testing = True
        cls.cli = app.test_client()
        contas = _contas()
        cls.token = {}
        cls.dados = {}
        for papel, email in cls.EMAILS.items():
            resposta = cls.cli.post(
                "/auth/login", json={"email": email, "senha": contas[email]["senha"]}
            )
            if resposta.status_code != 200:
                raise unittest.SkipTest(
                    f"Não foi possível entrar como {papel} ({email}): rode o start.sh/start.bat antes."
                )
            cls.token[papel] = resposta.get_json()["token"]
            cls.dados[papel] = resposta.get_json()["usuario"]

    @classmethod
    def tearDownClass(cls):
        for caminho in cls.enviados:
            uploads.remover_upload(caminho)
        with getConexao() as con:
            for caminho in con.execute(
                "SELECT imagem FROM cursos WHERE nome LIKE %s", (PREFIXO + "%",)
            ).fetchall():
                uploads.remover_upload(caminho["imagem"])
            for caminho in con.execute(
                "SELECT imagem FROM informacoes WHERE nome LIKE %s", (PREFIXO + "%",)
            ).fetchall():
                uploads.remover_upload(caminho["imagem"])
            con.execute("DELETE FROM cursos WHERE nome LIKE %s", (PREFIXO + "%",))
            con.execute("DELETE FROM informacoes WHERE nome LIKE %s", (PREFIXO + "%",))
            con.execute(
                "DELETE FROM colaboradores WHERE nome LIKE %s", (PREFIXO + "%",)
            )
            con.execute(
                "DELETE FROM usuarios WHERE email LIKE %s", (EMAIL_PREFIXO + "%",)
            )

    def chamar(self, metodo, caminho, corpo=None, papel=None, **extras):
        cabecalhos = extras.pop("headers", {})
        if papel:
            cabecalhos["Authorization"] = f"Bearer {self.token[papel]}"
        resposta = self.cli.open(
            caminho, method=metodo, json=corpo, headers=cabecalhos, **extras
        )
        if resposta.mimetype == "application/json":
            return resposta.status_code, resposta.get_json()
        return resposta.status_code, resposta.data

    def enviar_imagem(self, conteudo, nome="capa.png", papel="admin"):
        status, dados = self.chamar(
            "POST",
            "/uploads",
            papel=papel,
            data={"arquivo": (io.BytesIO(conteudo), nome)},
            content_type="multipart/form-data",
        )
        if status == 201:
            self.enviados.append(dados["url"])
        return status, dados

    def novo_curso(self, **extra):
        corpo = {
            "nome": f"{PREFIXO} Curso {sufixo()}",
            "descricao": "Curso de teste",
            "categoria": "Celular",
            **extra,
        }
        status, dados = self.chamar("POST", "/cursos", corpo, "admin")
        self.assertEqual(status, 201, dados)
        return dados["id"], corpo

    def novo_usuario(
        self, papel_criador="chefe", papel="usuario", senha="senha-teste-123"
    ):
        email = f"{EMAIL_PREFIXO}{sufixo()}@idade.digital"
        status, dados = self.chamar(
            "POST",
            "/usuarios",
            {
                "nome": f"{PREFIXO} Pessoa",
                "email": email,
                "senha": senha,
                "papel": papel,
            },
            papel_criador,
        )
        self.assertEqual(status, 201, dados)
        return dados["id"], email, senha

    def entrar(self, email, senha):
        status, dados = self.chamar(
            "POST", "/auth/login", {"email": email, "senha": senha}
        )
        self.assertEqual(status, 200, dados)
        self.token[email] = dados["token"]
        return email
