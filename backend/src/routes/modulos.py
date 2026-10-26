from flask import Blueprint, g

from helpers.auth import login_obrigatorio
from helpers.database import getConexao

bp = Blueprint("modulos", __name__)


def _modulo_liberado(conexao, usuario_id, modulo):
    """O 1º módulo é livre; os demais só após concluir o módulo anterior do curso.

    Administrador Chefe e Administrador acessam qualquer módulo (precisam editá-los)."""
    if modulo["ordem"] == 1 or g.usuario["papel"] in (
        "administrador_chefe",
        "administrador",
    ):
        return True
    return (
        conexao.execute(
            """
        SELECT 1 FROM modulos anterior
          JOIN progresso_modulo pm ON pm.modulo_id = anterior.id AND pm.usuario_id = %s
         WHERE anterior.curso_id = %s AND anterior.ordem = %s
        """,
            (usuario_id, modulo["curso_id"], modulo["ordem"] - 1),
        ).fetchone()
        is not None
    )


def _carregar_modulo(conexao, curso_id, ordem):
    return conexao.execute(
        "SELECT m.id, m.curso_id, m.ordem, m.titulo, m.descricao, c.nome AS curso_nome "
        "FROM modulos m JOIN cursos c ON c.id = m.curso_id "
        "WHERE m.curso_id = %s AND m.ordem = %s AND c.ativo",
        (curso_id, ordem),
    ).fetchone()


def _proxima_ordem(conexao, modulo):
    existe = conexao.execute(
        "SELECT 1 FROM modulos WHERE curso_id = %s AND ordem = %s",
        (modulo["curso_id"], modulo["ordem"] + 1),
    ).fetchone()
    return modulo["ordem"] + 1 if existe else None


@bp.get("/cursos/<int:curso_id>/modulos/<int:ordem>")
@login_obrigatorio
def detalhar(curso_id, ordem):
    uid = g.usuario["id"]
    with getConexao() as conexao:
        modulo = _carregar_modulo(conexao, curso_id, ordem)
        if modulo is None:
            return {"erro": "Módulo não encontrado."}, 404
        if not _modulo_liberado(conexao, uid, modulo):
            return {"erro": "Conclua o módulo anterior para liberar este."}, 403

        conteudos = conexao.execute(
            """
            SELECT c.id, c.ordem, c.tipo, c.titulo, c.texto, c.url,
                   (pc.conteudo_id IS NOT NULL) AS concluido
              FROM conteudos c
              LEFT JOIN progresso_conteudo pc ON pc.conteudo_id = c.id AND pc.usuario_id = %s
             WHERE c.modulo_id = %s
             ORDER BY c.ordem
            """,
            (uid, modulo["id"]),
        ).fetchall()
        concluido = (
            conexao.execute(
                "SELECT 1 FROM progresso_modulo WHERE usuario_id = %s AND modulo_id = %s",
                (uid, modulo["id"]),
            ).fetchone()
            is not None
        )
        proxima = _proxima_ordem(conexao, modulo)

    return {
        "id": modulo["id"],
        "cursoId": modulo["curso_id"],
        "cursoNome": modulo["curso_nome"],
        "ordem": modulo["ordem"],
        "titulo": modulo["titulo"],
        "descricao": modulo["descricao"],
        "concluido": concluido,
        "proximaOrdem": proxima,
        "conteudos": [
            {
                "id": c["id"],
                "ordem": c["ordem"],
                "tipo": c["tipo"],
                "titulo": c["titulo"],
                "texto": c["texto"],
                "url": c["url"],
                "concluido": c["concluido"],
            }
            for c in conteudos
        ],
    }, 200


@bp.put(
    "/cursos/<int:curso_id>/modulos/<int:ordem>/conteudos/<int:conteudo_id>/concluir"
)
@login_obrigatorio
def concluir_conteudo(curso_id, ordem, conteudo_id):
    uid = g.usuario["id"]
    with getConexao() as conexao:
        modulo = _carregar_modulo(conexao, curso_id, ordem)
        if modulo is None:
            return {"erro": "Módulo não encontrado."}, 404
        modulo_id = modulo["id"]
        if not _modulo_liberado(conexao, uid, modulo):
            return {"erro": "Conclua o módulo anterior para liberar este."}, 403
        if (
            conexao.execute(
                "SELECT 1 FROM conteudos WHERE id = %s AND modulo_id = %s",
                (conteudo_id, modulo_id),
            ).fetchone()
            is None
        ):
            return {"erro": "Conteúdo não encontrado neste módulo."}, 404

        conexao.execute(
            "INSERT INTO progresso_conteudo (usuario_id, conteudo_id) VALUES (%s, %s) "
            "ON CONFLICT DO NOTHING",
            (uid, conteudo_id),
        )
        pendentes = conexao.execute(
            """
            SELECT count(*) AS n FROM conteudos c
             WHERE c.modulo_id = %s
               AND NOT EXISTS (SELECT 1 FROM progresso_conteudo pc
                                WHERE pc.conteudo_id = c.id AND pc.usuario_id = %s)
            """,
            (modulo_id, uid),
        ).fetchone()["n"]

        recem_concluido = False
        if pendentes == 0:
            recem_concluido = (
                conexao.execute(
                    "INSERT INTO progresso_modulo (usuario_id, modulo_id) VALUES (%s, %s) "
                    "ON CONFLICT DO NOTHING RETURNING modulo_id",
                    (uid, modulo_id),
                ).fetchone()
                is not None
            )
        proxima = _proxima_ordem(conexao, modulo)

    return {
        "conteudoId": conteudo_id,
        "moduloConcluido": pendentes == 0,
        "recemConcluido": recem_concluido,
        "proximaOrdem": proxima if pendentes == 0 else None,
    }, 200
