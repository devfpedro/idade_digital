from flask import Blueprint, request

from helpers.auth import admin_obrigatorio
from helpers.database import getConexao
from helpers.validacao import corpo_json, ErroValidacao, texto, url

bp = Blueprint("gestao_cursos", __name__)

TIPOS = ("texto", "video", "link")
HOSTS_YOUTUBE = ("youtube.com", "youtu.be")


def _campos_modulo(dados):
    return (
        texto(dados, "titulo", 150),
        texto(dados, "descricao", 2000, obrigatorio=False) or "",
    )


def _campos_conteudo(dados):
    tipo = dados.get("tipo")
    if tipo not in TIPOS:
        raise ErroValidacao("O tipo deve ser: texto, video ou link.")
    titulo = texto(dados, "titulo", 150)
    corpo = texto(dados, "texto", 20000, obrigatorio=tipo == "texto") or ""
    endereco = None
    if tipo == "video":
        endereco = url(dados, "url", hosts=HOSTS_YOUTUBE, obrigatorio=True)
    elif tipo == "link":
        endereco = url(dados, "url", obrigatorio=True)
    return tipo, titulo, corpo, endereco


def _modulo(conexao, curso_id, ordem):
    """Busca o módulo e o trava (FOR UPDATE) enquanto durar a transação."""
    return conexao.execute(
        "SELECT m.id FROM modulos m JOIN cursos c ON c.id = m.curso_id "
        "WHERE m.curso_id = %s AND m.ordem = %s AND c.ativo FOR UPDATE OF m",
        (curso_id, ordem),
    ).fetchone()


def _recalcular_conclusao(conexao, modulo_id):
    """Quem já concluiu todos os conteúdos que restaram passa a ter o módulo concluído."""
    conexao.execute(
        """
        INSERT INTO progresso_modulo (usuario_id, modulo_id)
        SELECT pc.usuario_id, %(m)s
          FROM progresso_conteudo pc JOIN conteudos c ON c.id = pc.conteudo_id
         WHERE c.modulo_id = %(m)s
         GROUP BY pc.usuario_id
        HAVING count(*) = (SELECT count(*) FROM conteudos WHERE modulo_id = %(m)s)
        ON CONFLICT DO NOTHING
        """,
        {"m": modulo_id},
    )


@bp.post("/cursos/<int:curso_id>/modulos")
@admin_obrigatorio
def criar_modulo(curso_id):
    try:
        titulo, descricao = _campos_modulo(corpo_json())
    except ErroValidacao as erro:
        return {"erro": str(erro)}, 400
    with getConexao() as conexao:
        # FOR UPDATE: duas criações simultâneas não podem calcular o mesmo número
        if (
            conexao.execute(
                "SELECT 1 FROM cursos WHERE id = %s AND ativo FOR UPDATE", (curso_id,)
            ).fetchone()
            is None
        ):
            return {"erro": "Curso não encontrado."}, 404
        novo = conexao.execute(
            "INSERT INTO modulos (curso_id, ordem, titulo, descricao) VALUES "
            "(%s, (SELECT COALESCE(MAX(ordem), 0) + 1 FROM modulos WHERE curso_id = %s), %s, %s) "
            "RETURNING ordem",
            (curso_id, curso_id, titulo, descricao),
        ).fetchone()
    return {"ordem": novo["ordem"], "mensagem": "Módulo criado com sucesso."}, 201


@bp.put("/cursos/<int:curso_id>/modulos/<int:ordem>")
@admin_obrigatorio
def atualizar_modulo(curso_id, ordem):
    try:
        titulo, descricao = _campos_modulo(corpo_json())
    except ErroValidacao as erro:
        return {"erro": str(erro)}, 400
    with getConexao() as conexao:
        alterado = conexao.execute(
            "UPDATE modulos SET titulo = %s, descricao = %s WHERE curso_id = %s AND ordem = %s RETURNING id",
            (titulo, descricao, curso_id, ordem),
        ).fetchone()
    if alterado is None:
        return {"erro": "Módulo não encontrado."}, 404
    return {"mensagem": "Módulo atualizado com sucesso."}, 200


@bp.delete("/cursos/<int:curso_id>/modulos/<int:ordem>")
@admin_obrigatorio
def excluir_modulo(curso_id, ordem):
    with getConexao() as conexao:
        conexao.execute("SELECT 1 FROM cursos WHERE id = %s FOR UPDATE", (curso_id,))
        removido = conexao.execute(
            "DELETE FROM modulos WHERE curso_id = %s AND ordem = %s RETURNING id",
            (curso_id, ordem),
        ).fetchone()
        if removido is None:
            return {"erro": "Módulo não encontrado."}, 404
        conexao.execute("SET CONSTRAINTS ALL DEFERRED")
        conexao.execute(
            "UPDATE modulos SET ordem = ordem - 1 WHERE curso_id = %s AND ordem > %s",
            (curso_id, ordem),
        )
    return {"mensagem": "Módulo excluído com sucesso."}, 200


@bp.post("/cursos/<int:curso_id>/modulos/<int:ordem>/conteudos")
@admin_obrigatorio
def criar_conteudo(curso_id, ordem):
    try:
        campos = _campos_conteudo(corpo_json())
    except ErroValidacao as erro:
        return {"erro": str(erro)}, 400
    with getConexao() as conexao:
        modulo = _modulo(conexao, curso_id, ordem)
        if modulo is None:
            return {"erro": "Módulo não encontrado."}, 404
        novo = conexao.execute(
            "INSERT INTO conteudos (modulo_id, ordem, tipo, titulo, texto, url) VALUES "
            "(%s, (SELECT COALESCE(MAX(ordem), 0) + 1 FROM conteudos WHERE modulo_id = %s), %s, %s, %s, %s) "
            "RETURNING id",
            (modulo["id"], modulo["id"], *campos),
        ).fetchone()
    return {"id": novo["id"], "mensagem": "Conteúdo adicionado com sucesso."}, 201


@bp.put("/cursos/<int:curso_id>/modulos/<int:ordem>/conteudos/<int:conteudo_id>")
@admin_obrigatorio
def atualizar_conteudo(curso_id, ordem, conteudo_id):
    try:
        campos = _campos_conteudo(corpo_json())
    except ErroValidacao as erro:
        return {"erro": str(erro)}, 400
    with getConexao() as conexao:
        modulo = _modulo(conexao, curso_id, ordem)
        if modulo is None:
            return {"erro": "Módulo não encontrado."}, 404
        alterado = conexao.execute(
            "UPDATE conteudos SET tipo = %s, titulo = %s, texto = %s, url = %s "
            "WHERE id = %s AND modulo_id = %s RETURNING id",
            (*campos, conteudo_id, modulo["id"]),
        ).fetchone()
    if alterado is None:
        return {"erro": "Conteúdo não encontrado."}, 404
    return {"mensagem": "Conteúdo atualizado com sucesso."}, 200


@bp.delete("/cursos/<int:curso_id>/modulos/<int:ordem>/conteudos/<int:conteudo_id>")
@admin_obrigatorio
def excluir_conteudo(curso_id, ordem, conteudo_id):
    with getConexao() as conexao:
        modulo = _modulo(conexao, curso_id, ordem)
        if modulo is None:
            return {"erro": "Módulo não encontrado."}, 404
        removido = conexao.execute(
            "DELETE FROM conteudos WHERE id = %s AND modulo_id = %s RETURNING ordem",
            (conteudo_id, modulo["id"]),
        ).fetchone()
        if removido is None:
            return {"erro": "Conteúdo não encontrado."}, 404
        conexao.execute("SET CONSTRAINTS ALL DEFERRED")
        conexao.execute(
            "UPDATE conteudos SET ordem = ordem - 1 WHERE modulo_id = %s AND ordem > %s",
            (modulo["id"], removido["ordem"]),
        )
        _recalcular_conclusao(conexao, modulo["id"])
    return {"mensagem": "Conteúdo excluído com sucesso."}, 200
