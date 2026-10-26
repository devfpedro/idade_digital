import re

import config

PASTA = config.RAIZ_BACKEND / "uploads"
NOME_VALIDO = re.compile(r"^[a-f0-9]{32}\.(png|jpg|webp)$")
TIPOS_MIME = {"png": "image/png", "jpg": "image/jpeg", "webp": "image/webp"}


def extensao_da_imagem(conteudo):
    """Detecta o formato pelos bytes iniciais (não confia no nome nem no tipo enviado)."""
    if conteudo.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if conteudo.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if conteudo[:4] == b"RIFF" and conteudo[8:12] == b"WEBP":
        return "webp"
    return None


def remover_upload(caminho):
    if not caminho or not caminho.startswith("/uploads/"):
        return
    nome = caminho.rsplit("/", 1)[-1]
    if NOME_VALIDO.match(nome):
        (PASTA / nome).unlink(missing_ok=True)
