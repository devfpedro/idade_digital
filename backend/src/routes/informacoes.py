from flask import Blueprint, request

from helpers.auth import admin_obrigatorio, login_obrigatorio
from helpers.database import getConexao
from helpers import uploads
from helpers.validacao import (
    corpo_json,
    ErroValidacao,
    escapar_like,
    imagem,
    texto,
    url,
)
from models.informacoes import Informacoes

bp = Blueprint("informacoes", __name__, url_prefix="/informacoes")

HOSTS_YOUTUBE = ("youtube.com", "youtu.be")

_EXPRESSAO_BUSCA = "f_unaccent(lower(nome || ' ' || descricao || ' ' || conteudo))"


@bp.get("")
@login_obrigatorio
def listar():
    termo = request.args.get("q", "").strip()[:100]
    consulta = f"""
        SELECT id, nome, descricao, conteudo, imagem, video_url,
               artigo_url, artigo_fonte, artigo_titulo, artigo_resumo
          FROM informacoes
         WHERE ativo
           AND (%(q)s = '' OR {_EXPRESSAO_BUSCA}
                LIKE '%%' || f_unaccent(lower(%(q)s)) || '%%')
         ORDER BY id
    """
    with getConexao() as conexao:
        linhas = conexao.execute(consulta, {"q": escapar_like(termo)}).fetchall()
    return [Informacoes.de_linha(l).to_dict() for l in linhas], 200


@bp.get("/<int:info_id>")
@login_obrigatorio
def detalhar(info_id):
    with getConexao() as conexao:
        linha = conexao.execute(
            "SELECT id, nome, descricao, conteudo, imagem, video_url, artigo_url, "
            "artigo_fonte, artigo_titulo, artigo_resumo FROM informacoes "
            "WHERE id = %s AND ativo",
            (info_id,),
        ).fetchone()
    if linha is None:
        return {"erro": "Informação não encontrada."}, 404
    return Informacoes.de_linha(linha).to_dict(), 200


def _campos(dados):
    return (
        texto(dados, "nome", 150),
        texto(dados, "descricao", 2000),
        texto(dados, "conteudo", 20000, obrigatorio=False) or "",
        imagem(dados),
        url(dados, "videoUrl", hosts=HOSTS_YOUTUBE),
        url(dados, "artigoUrl"),
        texto(dados, "artigoFonte", 80, obrigatorio=False),
        texto(dados, "artigoTitulo", 200, obrigatorio=False),
        texto(dados, "artigoResumo", 1000, obrigatorio=False),
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
            "SELECT 1 FROM informacoes WHERE nome = %s", (campos[0],)
        ).fetchone():
            return {"erro": "Já existe uma informação com esse nome."}, 409
        novo = conexao.execute(
            "INSERT INTO informacoes (nome, descricao, conteudo, imagem, video_url, "
            "artigo_url, artigo_fonte, artigo_titulo, artigo_resumo) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
            campos,
        ).fetchone()
    return {"id": novo["id"], "mensagem": "Informação criada com sucesso."}, 201


@bp.put("/<int:info_id>")
@admin_obrigatorio
def atualizar(info_id):
    try:
        campos = _campos(corpo_json())
    except ErroValidacao as erro:
        return {"erro": str(erro)}, 400
    with getConexao() as conexao:
        if conexao.execute(
            "SELECT 1 FROM informacoes WHERE nome = %s AND id <> %s",
            (campos[0], info_id),
        ).fetchone():
            return {"erro": "Já existe uma informação com esse nome."}, 409
        anterior = conexao.execute(
            "SELECT imagem FROM informacoes WHERE id = %s", (info_id,)
        ).fetchone()
        alterado = conexao.execute(
            "UPDATE informacoes SET nome = %s, descricao = %s, conteudo = %s, imagem = %s, "
            "video_url = %s, artigo_url = %s, artigo_fonte = %s, artigo_titulo = %s, "
            "artigo_resumo = %s WHERE id = %s AND ativo RETURNING id",
            (*campos, info_id),
        ).fetchone()
    if alterado is None:
        return {"erro": "Informação não encontrada."}, 404
    if anterior and anterior["imagem"] != campos[3]:
        uploads.remover_upload(anterior["imagem"])
    return {"mensagem": "Informação atualizada com sucesso."}, 200


@bp.delete("/<int:info_id>")
@admin_obrigatorio
def remover(info_id):
    with getConexao() as conexao:
        removido = conexao.execute(
            "UPDATE informacoes SET ativo = FALSE WHERE id = %s AND ativo RETURNING id",
            (info_id,),
        ).fetchone()
    if removido is None:
        return {"erro": "Informação não encontrada."}, 404
    return {"mensagem": "Informação removida com sucesso."}, 200
