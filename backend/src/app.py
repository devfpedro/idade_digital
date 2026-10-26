import os
import threading

import psycopg
from flask import Flask, g
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

import config
from helpers.database import getConexao
from routes import (
    auth,
    cursos,
    equipe,
    gestao_cursos,
    informacoes,
    modulos,
    uploads,
    usuarios,
    voz,
)

app = Flask(__name__)
app.config["SECRET_KEY"] = config.SECRET_KEY
app.json.ensure_ascii = False
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024  # imagens de até 4 MB + cabeçalhos


CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]

CORS(
    app,
    resources={r"/*": {"origins": CORS_ORIGINS}},
    supports_credentials=True,
)

for modulo in (
    auth,
    cursos,
    equipe,
    gestao_cursos,
    informacoes,
    modulos,
    uploads,
    usuarios,
    voz,
):
    app.register_blueprint(modulo.bp)


@app.route("/status")
def status():
    return {"status": "ok", "message": "API funcionando"}, 200


@app.route("/health")
def health():
    try:
        with getConexao() as conexao:
            conexao.execute("SELECT 1")
        banco = "ok"
    except psycopg.Error:
        banco = "indisponivel"
    return {"version": "1.0.0", "database": banco}, 200 if banco == "ok" else 503


# Limita as requisições em andamento: cada uma abre uma conexão com o PostgreSQL
# (limite padrão de ~100); acima disso as demais esperam na fila em vez de falhar.
MAX_REQUISICOES_SIMULTANEAS = int(os.getenv("MAX_REQUISICOES_SIMULTANEAS", "40"))
_fila = threading.BoundedSemaphore(MAX_REQUISICOES_SIMULTANEAS)


@app.before_request
def entrar_na_fila():
    g.na_fila = _fila.acquire(timeout=15)
    if not g.na_fila:
        return {"erro": "Servidor ocupado. Tente novamente em instantes."}, 503
    return None


@app.teardown_request
def sair_da_fila(_erro):
    if getattr(g, "na_fila", False):
        _fila.release()
        g.na_fila = False


@app.errorhandler(psycopg.errors.UniqueViolation)
def duplicado(erro):
    """Corrida entre duas gravações iguais: a checagem prévia passou nas duas, o banco barrou uma."""
    return {"erro": "Já existe um cadastro com esses dados."}, 409


@app.errorhandler(psycopg.OperationalError)
def banco_indisponivel(erro):
    app.logger.error("Banco de dados indisponível: %s", erro)
    return {
        "erro": "Serviço temporariamente indisponível. Tente novamente em instantes."
    }, 503


@app.errorhandler(psycopg.Error)
def erro_de_banco(erro):
    app.logger.exception("Erro de banco de dados")
    return {"erro": "Erro interno ao acessar os dados."}, 500


MENSAGENS_HTTP = {
    400: "Requisição inválida.",
    404: "Recurso não encontrado.",
    405: "Método não permitido para este recurso.",
    413: "O arquivo enviado é grande demais.",
    415: "Formato de conteúdo não suportado.",
}


@app.errorhandler(HTTPException)
def erro_http(erro):
    return {
        "erro": MENSAGENS_HTTP.get(erro.code, "Não foi possível concluir a requisição.")
    }, erro.code


def variavel_ambiente_ligada(nome, padrao="true"):
    return os.getenv(nome, padrao).strip().lower() != "false"


def main(arg=None):
    if config.SECRET_KEY_EFEMERA:
        app.logger.warning(
            "SECRET_KEY não definida em backend/.env: logins serão invalidados ao reiniciar."
        )
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=variavel_ambiente_ligada("FLASK_DEBUG", "false"),
        use_reloader=variavel_ambiente_ligada("FLASK_RELOADER"),
    )


if __name__ == "__main__":
    main()
