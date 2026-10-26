import re

import psycopg
from flask import Blueprint, g, request
from werkzeug.security import generate_password_hash

from helpers.auth import papel_obrigatorio
from helpers.database import getConexao
from helpers.validacao import corpo_json, ErroValidacao, escapar_like, texto

bp = Blueprint("usuarios", __name__, url_prefix="/usuarios")

GERENCIAVEIS = {
    "administrador_chefe": ("administrador", "organizador", "usuario"),
    "administrador": ("organizador", "usuario"),
    "organizador": ("usuario",),
}
PAPEIS_GESTAO = tuple(GERENCIAVEIS)
EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
CAMPOS = "id, nome, email, papel, ativo, criado_em"


def _serializar(u):
    return {
        "id": u["id"],
        "nome": u["nome"],
        "email": u["email"],
        "papel": u["papel"],
        "ativo": u["ativo"],
        "criadoEm": u["criado_em"].isoformat(),
    }


def _validar_email(dados):
    email = texto(dados, "email", 160).lower()
    if not EMAIL.match(email):
        raise ErroValidacao("Informe um e-mail válido.")
    return email


def _validar_senha(dados, obrigatoria):
    senha = dados.get("senha")
    if senha in (None, ""):
        if obrigatoria:
            raise ErroValidacao("O campo 'senha' é obrigatório.")
        return None
    if not isinstance(senha, str) or not 8 <= len(senha) <= 128:
        raise ErroValidacao("A senha deve ter de 8 a 128 caracteres.")
    return senha


def _email_em_uso(conexao, email, ignorar_id=0):
    return (
        conexao.execute(
            "SELECT 1 FROM usuarios WHERE lower(email) = %s AND id <> %s",
            (email, ignorar_id),
        ).fetchone()
        is not None
    )


@bp.get("")
@papel_obrigatorio(*PAPEIS_GESTAO)
def listar():
    termo = request.args.get("q", "").strip()[:100]
    apenas_usuarios = g.usuario["papel"] == "organizador"
    with getConexao() as conexao:
        linhas = conexao.execute(
            f"""
            SELECT {CAMPOS} FROM usuarios
             WHERE (%(q)s = '' OR f_unaccent(lower(nome || ' ' || email))
                    LIKE '%%' || f_unaccent(lower(%(q)s)) || '%%')
               AND (NOT %(so_usuarios)s OR papel = 'usuario')
             ORDER BY nome
             LIMIT 300
            """,
            {"q": escapar_like(termo), "so_usuarios": apenas_usuarios},
        ).fetchall()
    return [_serializar(u) for u in linhas], 200


@bp.post("")
@papel_obrigatorio(*PAPEIS_GESTAO)
def criar():
    dados = corpo_json()
    try:
        nome = texto(dados, "nome", 120)
        email = _validar_email(dados)
        senha = _validar_senha(dados, obrigatoria=True)
        papel = dados.get("papel", "usuario")
    except ErroValidacao as erro:
        return {"erro": str(erro)}, 400
    if papel not in GERENCIAVEIS[g.usuario["papel"]]:
        return {"erro": "Você não tem permissão para criar usuários desse nível."}, 403

    with getConexao() as conexao:
        if _email_em_uso(conexao, email):
            return {"erro": "Já existe um usuário com esse e-mail."}, 409
        novo = conexao.execute(
            f"INSERT INTO usuarios (nome, email, senha_hash, papel) VALUES (%s, %s, %s, %s) "
            f"RETURNING {CAMPOS}",
            (nome, email, generate_password_hash(senha), papel),
        ).fetchone()
    return _serializar(novo), 201


@bp.put("/<int:usuario_id>")
@papel_obrigatorio(*PAPEIS_GESTAO)
def atualizar(usuario_id):
    dados = corpo_json()
    meu_papel = g.usuario["papel"]
    eu_mesmo = usuario_id == g.usuario["id"]

    with getConexao() as conexao:
        alvo = conexao.execute(
            f"SELECT {CAMPOS} FROM usuarios WHERE id = %s", (usuario_id,)
        ).fetchone()
        if alvo is None:
            return {"erro": "Usuário não encontrado."}, 404
        if not eu_mesmo and alvo["papel"] not in GERENCIAVEIS[meu_papel]:
            return {"erro": "Você não tem permissão para editar este usuário."}, 403

        try:
            nome = texto(dados, "nome", 120)
            email = _validar_email(dados)
            senha = _validar_senha(dados, obrigatoria=False)
            ativo = dados.get("ativo", alvo["ativo"])
            if not isinstance(ativo, bool):
                raise ErroValidacao("O campo 'ativo' deve ser verdadeiro ou falso.")
            papel = dados.get("papel", alvo["papel"])
        except ErroValidacao as erro:
            return {"erro": str(erro)}, 400

        if eu_mesmo:
            if papel != alvo["papel"] or not ativo:
                return {
                    "erro": "Você não pode alterar o seu próprio nível nem desativar a sua conta."
                }, 400
        elif papel != alvo["papel"] and papel not in GERENCIAVEIS[meu_papel]:
            return {"erro": "Você não tem permissão para atribuir esse nível."}, 403
        if _email_em_uso(conexao, email, usuario_id):
            return {"erro": "Já existe um usuário com esse e-mail."}, 409

        conexao.execute(
            "UPDATE usuarios SET nome = %s, email = %s, papel = %s, ativo = %s WHERE id = %s",
            (nome, email, papel, ativo, usuario_id),
        )
        if senha:
            conexao.execute(
                "UPDATE usuarios SET senha_hash = %s WHERE id = %s",
                (generate_password_hash(senha), usuario_id),
            )
        atualizado = conexao.execute(
            f"SELECT {CAMPOS} FROM usuarios WHERE id = %s", (usuario_id,)
        ).fetchone()
    return _serializar(atualizado), 200


@bp.delete("/<int:usuario_id>")
@papel_obrigatorio(*PAPEIS_GESTAO)
def excluir(usuario_id):
    if usuario_id == g.usuario["id"]:
        return {"erro": "Você não pode excluir a sua própria conta."}, 400
    try:
        with getConexao() as conexao:
            alvo = conexao.execute(
                "SELECT papel FROM usuarios WHERE id = %s", (usuario_id,)
            ).fetchone()
            if alvo is None:
                return {"erro": "Usuário não encontrado."}, 404
            if alvo["papel"] not in GERENCIAVEIS[g.usuario["papel"]]:
                return {
                    "erro": "Você não tem permissão para excluir este usuário."
                }, 403
            removido = conexao.execute(
                "DELETE FROM usuarios WHERE id = %s RETURNING id", (usuario_id,)
            ).fetchone()
    except psycopg.errors.ForeignKeyViolation:
        return {
            "erro": "Não foi possível excluir: há dados vinculados a este usuário."
        }, 409
    if removido is None:
        return {"erro": "Usuário não encontrado."}, 404
    return {"mensagem": "Usuário excluído com sucesso."}, 200
