from flask import Blueprint, g, request

from helpers.auth import admin_obrigatorio, login_obrigatorio
from helpers.database import getConexao
from helpers import uploads
from helpers.validacao import corpo_json, ErroValidacao, escapar_like, imagem, texto
from models.curso import Curso

bp = Blueprint("cursos", __name__, url_prefix="/cursos")

GESTORES_DE_CONTEUDO = ("administrador_chefe", "administrador")

_EXPRESSAO_BUSCA = (
    "f_unaccent(lower(c.nome || ' ' || c.descricao || ' ' || c.categoria))"
)


@bp.get("")
@login_obrigatorio
def listar():
    termo = request.args.get("q", "").strip()[:100]
    categoria = request.args.get("categoria", "").strip()[:60]

    consulta = f"""
        SELECT c.id, c.nome, c.descricao, c.categoria, c.imagem,
               (SELECT count(*) FROM modulos m WHERE m.curso_id = c.id) AS qtd_modulos,
               (SELECT count(*) FROM progresso_modulo pm JOIN modulos m ON m.id = pm.modulo_id
                 WHERE m.curso_id = c.id AND pm.usuario_id = %(uid)s) AS modulos_concluidos
          FROM cursos c
         WHERE c.ativo
           AND (%(q)s = '' OR {_EXPRESSAO_BUSCA}
                LIKE '%%' || f_unaccent(lower(%(q)s)) || '%%')
           AND (%(cat)s = '' OR c.categoria = %(cat)s)
         ORDER BY c.id
    """
    with getConexao() as conexao:
        linhas = conexao.execute(
            consulta,
            {"uid": g.usuario["id"], "q": escapar_like(termo), "cat": categoria},
        ).fetchall()
    return [Curso.de_linha(l).to_dict() for l in linhas], 200


@bp.get("/<int:curso_id>")
@login_obrigatorio
def detalhar(curso_id):
    with getConexao() as conexao:
        curso = conexao.execute(
            "SELECT id, nome, descricao, categoria, imagem FROM cursos "
            "WHERE id = %s AND ativo",
            (curso_id,),
        ).fetchone()
        if curso is None:
            return {"erro": "Curso não encontrado."}, 404

        modulos = conexao.execute(
            """
            SELECT m.id, m.ordem, m.titulo, m.descricao,
                   (SELECT count(*) FROM conteudos c WHERE c.modulo_id = m.id) AS qtd_conteudos,
                   EXISTS (SELECT 1 FROM progresso_modulo pm
                            WHERE pm.modulo_id = m.id AND pm.usuario_id = %s) AS concluido
              FROM modulos m
             WHERE m.curso_id = %s
             ORDER BY m.ordem
            """,
            (g.usuario["id"], curso_id),
        ).fetchall()

    resposta = Curso.de_linha(curso).to_dict()
    lista = []
    gestor = g.usuario["papel"] in GESTORES_DE_CONTEUDO
    anterior_concluido = True  # o 1º módulo sempre está liberado
    for m in modulos:
        if m["concluido"]:
            situacao = "concluido"
        elif anterior_concluido or gestor:
            situacao = "disponivel"
        else:
            situacao = "bloqueado"
        anterior_concluido = m["concluido"]
        lista.append(
            {
                "id": m["id"],
                "ordem": m["ordem"],
                "titulo": m["titulo"],
                "descricao": m["descricao"],
                "qtdConteudos": m["qtd_conteudos"],
                "situacao": situacao,
            }
        )
    resposta["qtdModulos"] = len(lista)
    resposta["modulosConcluidos"] = sum(
        1 for m in lista if m["situacao"] == "concluido"
    )
    resposta["modulos"] = lista
    return resposta, 200


def _campos_curso(dados):
    return (
        texto(dados, "nome", 150),
        texto(dados, "descricao", 2000),
        texto(dados, "categoria", 60),
        imagem(dados),
    )


@bp.post("")
@admin_obrigatorio
def criar():
    try:
        campos = _campos_curso(corpo_json())
    except ErroValidacao as erro:
        return {"erro": str(erro)}, 400
    with getConexao() as conexao:
        existente = conexao.execute(
            "SELECT 1 FROM cursos WHERE nome = %s", (campos[0],)
        ).fetchone()
        if existente:
            return {"erro": "Já existe um curso com esse nome."}, 409
        novo = conexao.execute(
            "INSERT INTO cursos (nome, descricao, categoria, imagem) "
            "VALUES (%s, %s, %s, %s) RETURNING id",
            campos,
        ).fetchone()
    return {"id": novo["id"], "mensagem": "Curso criado com sucesso."}, 201


@bp.put("/<int:curso_id>")
@admin_obrigatorio
def atualizar(curso_id):
    try:
        campos = _campos_curso(corpo_json())
    except ErroValidacao as erro:
        return {"erro": str(erro)}, 400
    with getConexao() as conexao:
        conflito = conexao.execute(
            "SELECT 1 FROM cursos WHERE nome = %s AND id <> %s", (campos[0], curso_id)
        ).fetchone()
        if conflito:
            return {"erro": "Já existe um curso com esse nome."}, 409
        anterior = conexao.execute(
            "SELECT imagem FROM cursos WHERE id = %s", (curso_id,)
        ).fetchone()
        alterado = conexao.execute(
            "UPDATE cursos SET nome = %s, descricao = %s, categoria = %s, imagem = %s "
            "WHERE id = %s AND ativo RETURNING id",
            (*campos, curso_id),
        ).fetchone()
    if alterado is None:
        return {"erro": "Curso não encontrado."}, 404
    if anterior and anterior["imagem"] != campos[3]:
        uploads.remover_upload(anterior["imagem"])
    return {"mensagem": "Curso atualizado com sucesso."}, 200


@bp.delete("/<int:curso_id>")
@admin_obrigatorio
def remover(curso_id):
    with getConexao() as conexao:
        removido = conexao.execute(
            "DELETE FROM cursos WHERE id = %s RETURNING imagem", (curso_id,)
        ).fetchone()
    if removido is None:
        return {"erro": "Curso não encontrado."}, 404
    uploads.remover_upload(removido["imagem"])
    return {"mensagem": "Curso excluído com sucesso."}, 200
