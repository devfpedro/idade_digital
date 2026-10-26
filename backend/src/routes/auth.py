from flask import Blueprint, g, request
from werkzeug.security import check_password_hash

from helpers.auth import (
    gerar_token,
    limpar_falhas_login,
    login_bloqueado,
    login_obrigatorio,
    registrar_falha_login,
)
from helpers.database import getConexao
from helpers.validacao import corpo_json

bp = Blueprint("auth", __name__, url_prefix="/auth")

# Hash descartável: mantém o tempo de resposta igual quando o e-mail não existe
_HASH_FALSO = "scrypt:32768:8:1$x$" + "0" * 128


@bp.post("/login")
def login():
    dados = corpo_json()
    email = str(dados.get("email", "")).strip().lower()
    senha = str(dados.get("senha", ""))

    if not email or not senha:
        return {"erro": "Preencha o e-mail e a senha para entrar."}, 400
    if login_bloqueado(email):
        return {
            "erro": "Muitas tentativas. Aguarde alguns minutos e tente de novo."
        }, 429

    with getConexao() as conexao:
        usuario = conexao.execute(
            "SELECT id, nome, email, papel, senha_hash FROM usuarios "
            "WHERE lower(email) = %s AND ativo",
            (email,),
        ).fetchone()

    hash_senha = usuario["senha_hash"] if usuario else _HASH_FALSO
    try:
        senha_ok = check_password_hash(hash_senha, senha)
    except ValueError:
        senha_ok = False

    if not usuario or not senha_ok:
        registrar_falha_login(email)
        return {"erro": "E-mail ou senha incorretos. Tente novamente."}, 401

    limpar_falhas_login(email)
    return {
        "token": gerar_token(usuario["id"]),
        "usuario": {
            "id": usuario["id"],
            "nome": usuario["nome"],
            "email": usuario["email"],
            "papel": usuario["papel"],
        },
    }, 200


@bp.get("/me")
@login_obrigatorio
def me():
    return dict(g.usuario), 200
