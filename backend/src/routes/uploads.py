import secrets

from flask import Blueprint, abort, request, send_from_directory

from helpers import uploads
from helpers.auth import admin_obrigatorio

bp = Blueprint("uploads", __name__)

LIMITE_BYTES = 4 * 1024 * 1024


@bp.post("/uploads")
@admin_obrigatorio
def enviar():
    arquivo = request.files.get("arquivo")
    if arquivo is None:
        return {"erro": "Escolha uma imagem para enviar."}, 400
    conteudo = arquivo.read(LIMITE_BYTES + 1)
    if len(conteudo) > LIMITE_BYTES:
        return {"erro": "A imagem é grande demais (máximo de 4 MB)."}, 413
    extensao = uploads.extensao_da_imagem(conteudo)
    if extensao is None:
        return {"erro": "Formato não aceito. Envie uma imagem PNG, JPG ou WEBP."}, 400

    uploads.PASTA.mkdir(exist_ok=True)
    nome = f"{secrets.token_hex(16)}.{extensao}"
    (uploads.PASTA / nome).write_bytes(conteudo)
    return {"url": f"/uploads/{nome}"}, 201


@bp.get("/uploads/<nome>")
def baixar(nome):
    # Pública de propósito: o navegador carrega <img> sem enviar o token.
    if not uploads.NOME_VALIDO.match(nome):
        abort(404)
    resposta = send_from_directory(
        uploads.PASTA,
        nome,
        mimetype=uploads.TIPOS_MIME[nome.rsplit(".", 1)[-1]],
        max_age=86400,
    )
    resposta.headers["X-Content-Type-Options"] = "nosniff"
    return resposta
