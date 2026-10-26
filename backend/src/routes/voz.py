import threading
import time
from collections import defaultdict, deque

from flask import Blueprint, Response, request

from helpers import voz
from helpers.auth import login_obrigatorio
from helpers.validacao import corpo_json

bp = Blueprint("voz", __name__, url_prefix="/voz")

MAX_CARACTERES = 1200  # o front envia a página em trechos menores que isso
MAX_CARACTERES_PUBLICO = 600
PEDIDOS_POR_MINUTO_PUBLICO = 40

_pedidos = defaultdict(deque)
_trava = threading.Lock()


def _limite_publico_excedido():
    agora = time.monotonic()
    with _trava:
        fila = _pedidos[request.remote_addr]
        while fila and agora - fila[0] > 60:
            fila.popleft()
        if len(fila) >= PEDIDOS_POR_MINUTO_PUBLICO:
            return True
        fila.append(agora)
        return False


def _responder(texto, voz_id=None, ritmo=None):
    if not isinstance(texto, str) or not texto.strip():
        return {"erro": "Informe o texto a ser lido."}, 400
    try:
        audio = voz.sintetizar(texto.strip(), voz_id, ritmo)
    except ValueError:
        return {"erro": "O texto não tem nada para ser lido."}, 400
    except LookupError:
        return {
            "erro": "A leitura em voz natural não está instalada neste servidor."
        }, 503
    return Response(
        audio, mimetype="audio/wav", headers={"Cache-Control": "private, max-age=3600"}
    )


@bp.get("/vozes")
@login_obrigatorio
def listar():
    vozes = voz.vozes_disponiveis()
    return {
        "disponivel": bool(vozes),
        "vozes": vozes,
        "ritmos": list(voz.RITMOS),
        "ritmoPadrao": voz.RITMO_PADRAO,
    }, 200


@bp.post("")
@login_obrigatorio
def falar():
    dados = corpo_json()
    texto = dados.get("texto")
    if isinstance(texto, str) and len(texto) > MAX_CARACTERES:
        return {
            "erro": f"O texto aceita no máximo {MAX_CARACTERES} caracteres por vez."
        }, 400
    return _responder(texto, dados.get("voz"), dados.get("ritmo"))


@bp.get("/publica/disponivel")
def disponivel_publico():
    return {"disponivel": bool(voz.vozes_disponiveis())}, 200


@bp.post("/publica")
def falar_publico():
    dados = corpo_json()
    texto = dados.get("texto")
    if isinstance(texto, str) and len(texto) > MAX_CARACTERES_PUBLICO:
        return {
            "erro": f"O texto aceita no máximo {MAX_CARACTERES_PUBLICO} caracteres por vez."
        }, 400
    if _limite_publico_excedido():
        return {"erro": "Muitos pedidos de leitura. Aguarde um instante."}, 429
    return _responder(texto, voz.VOZ_PADRAO, voz.RITMO_PADRAO)
