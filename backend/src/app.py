import os

from flask import Flask
from flask_cors import CORS

app = Flask(__name__)

# Origens autorizadas a chamar a API (frontend Vite em desenvolvimento)
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]

# CORS: aceita requisições do frontend Vite (dev em 5173/4173), com cookies
CORS(
    app,
    resources={r"/*": {"origins": CORS_ORIGINS}},
    supports_credentials=True,
)


@app.route("/status")
def status():
    return {"status": "ok", "message": "API funcionando"}, 200


@app.route("/health")
def health():
    return {"version": "1.0.0"}, 200


def variavel_ambiente_ligada(nome, padrao="true"):
    """Lê uma flag de ambiente do tipo liga/desliga (padrão: ligada)."""
    return os.getenv(nome, padrao).strip().lower() != "false"


def main(arg=None):
    """Inicia o servidor Flask (usado por start.sh / start.bat).

    FLASK_DEBUG=false desliga o modo debug e FLASK_RELOADER=false desliga o
    reloader (o start.sh usa isso para não deixar processos órfãos na porta).
    """
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=variavel_ambiente_ligada("FLASK_DEBUG"),
        use_reloader=variavel_ambiente_ligada("FLASK_RELOADER"),
    )


if __name__ == "__main__":
    main()
