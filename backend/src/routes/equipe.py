import re

from flask import Blueprint, request

from helpers.auth import admin_obrigatorio, login_obrigatorio
from helpers.database import getConexao
from helpers.validacao import corpo_json, ErroValidacao, texto

bp = Blueprint("equipe", __name__, url_prefix="/equipe")

CATEGORIAS = {
    "integrante": "integrantes",
    "parceiro": "parceiros",
    "colaborador": "colaboradores",
}
COM_GITHUB = ("integrante", "colaborador")
# aceita "https://github.com/usuario", "github.com/usuario", "@usuario" ou "usuario"
GITHUB = re.compile(
    r"^(?:https?://)?(?:www\.)?(?:github\.com/)?@?([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)/?$"
)


def _serializar(l):
    usuario = l["github"]
    return {
        "id": l["id"],
        "nome": l["nome"],
        "funcao": l["funcao"],
        "descricao": l["descricao"],
        "github": usuario,
        "githubUrl": f"https://github.com/{usuario}" if usuario else None,
        "avatarUrl": f"https://github.com/{usuario}.png?size=240" if usuario else None,
    }


@bp.get("")
@login_obrigatorio
def listar():
    with getConexao() as conexao:
        linhas = conexao.execute(
            "SELECT id, categoria, nome, funcao, descricao, github FROM colaboradores "
            "WHERE ativo ORDER BY ordem, nome"
        ).fetchall()
    resposta = {grupo: [] for grupo in CATEGORIAS.values()}
    for l in linhas:
        resposta[CATEGORIAS[l["categoria"]]].append(_serializar(l))
    return resposta, 200


def _github(dados):
    valor = texto(dados, "github", 200, obrigatorio=False)
    if not valor:
        return None
    encontrado = GITHUB.match(valor)
    if not encontrado:
        raise ErroValidacao(
            "Informe o link do perfil no GitHub (ex.: https://github.com/usuario)."
        )
    return encontrado.group(1)


def _campos(dados):
    categoria = dados.get("categoria")
    if categoria not in CATEGORIAS:
        raise ErroValidacao(
            "A categoria deve ser: integrante, parceiro ou colaborador."
        )
    descricao = (
        texto(dados, "descricao", 1000, obrigatorio=categoria == "parceiro") or ""
    )
    github = _github(dados) if categoria in COM_GITHUB else None
    if categoria == "integrante" and not github:
        raise ErroValidacao("Informe o link do perfil do integrante no GitHub.")
    return (
        categoria,
        texto(dados, "nome", 160),
        texto(dados, "funcao", 160),
        descricao,
        github,
    )


@bp.post("")
@admin_obrigatorio
def criar():
    try:
        campos = _campos(corpo_json())
    except ErroValidacao as erro:
        return {"erro": str(erro)}, 400
    with getConexao() as conexao:
        if conexao.execute(
            "SELECT 1 FROM colaboradores WHERE categoria = %s AND nome = %s", campos[:2]
        ).fetchone():
            return {"erro": "Já existe um cadastro com esse nome nessa categoria."}, 409
        novo = conexao.execute(
            "INSERT INTO colaboradores (categoria, nome, funcao, descricao, github, ordem) "
            "VALUES (%s, %s, %s, %s, %s, "
            "(SELECT COALESCE(MAX(ordem), 0) + 1 FROM colaboradores WHERE categoria = %s)) "
            "RETURNING id",
            (*campos, campos[0]),
        ).fetchone()
    return {"id": novo["id"], "mensagem": "Cadastro criado com sucesso."}, 201


@bp.put("/<int:colaborador_id>")
@admin_obrigatorio
def atualizar(colaborador_id):
    try:
        campos = _campos(corpo_json())
    except ErroValidacao as erro:
        return {"erro": str(erro)}, 400
    with getConexao() as conexao:
        if conexao.execute(
            "SELECT 1 FROM colaboradores WHERE categoria = %s AND nome = %s AND id <> %s",
            (*campos[:2], colaborador_id),
        ).fetchone():
            return {"erro": "Já existe um cadastro com esse nome nessa categoria."}, 409
        alterado = conexao.execute(
            "UPDATE colaboradores SET categoria = %s, nome = %s, funcao = %s, descricao = %s, "
            "github = %s WHERE id = %s AND ativo RETURNING id",
            (*campos, colaborador_id),
        ).fetchone()
    if alterado is None:
        return {"erro": "Cadastro não encontrado."}, 404
    return {"mensagem": "Cadastro atualizado com sucesso."}, 200


@bp.delete("/<int:colaborador_id>")
@admin_obrigatorio
def remover(colaborador_id):
    with getConexao() as conexao:
        removido = conexao.execute(
            "UPDATE colaboradores SET ativo = FALSE WHERE id = %s AND ativo RETURNING id",
            (colaborador_id,),
        ).fetchone()
    if removido is None:
        return {"erro": "Cadastro não encontrado."}, 404
    return {"mensagem": "Cadastro removido com sucesso."}, 200
