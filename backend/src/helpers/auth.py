import threading
import time
from collections import defaultdict, deque
from functools import wraps

from flask import g, request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

import config
from helpers.database import getConexao

_serializador = URLSafeTimedSerializer(config.SECRET_KEY, salt="idade-digital-auth")

MAX_FALHAS = 5
JANELA_SEGUNDOS = 300
_falhas = defaultdict(deque)
_trava = threading.Lock()


def gerar_token(usuario_id):
    return _serializador.dumps({"uid": usuario_id})


def _usuario_do_token(token):
    try:
        dados = _serializador.loads(token, max_age=config.TOKEN_HORAS * 3600)
    except (BadSignature, SignatureExpired):
        return None
    with getConexao() as conexao:
        return conexao.execute(
            "SELECT id, nome, email, papel FROM usuarios WHERE id = %s AND ativo",
            (dados.get("uid"),),
        ).fetchone()


def _resposta_nao_autorizado(mensagem="Faça login para continuar."):
    return {"erro": mensagem}, 401


def login_obrigatorio(funcao):
    @wraps(funcao)
    def interna(*args, **kwargs):
        cabecalho = request.headers.get("Authorization", "")
        if not cabecalho.startswith("Bearer "):
            return _resposta_nao_autorizado()
        usuario = _usuario_do_token(cabecalho[7:].strip())
        if usuario is None:
            return _resposta_nao_autorizado("Sessão inválida ou expirada.")
        g.usuario = usuario
        return funcao(*args, **kwargs)

    return interna


def papel_obrigatorio(*papeis):

    def decorador(funcao):
        @login_obrigatorio
        @wraps(funcao)
        def interna(*args, **kwargs):
            if g.usuario["papel"] not in papeis:
                return {"erro": "Você não tem permissão para esta ação."}, 403
            return funcao(*args, **kwargs)

        return interna

    return decorador


admin_obrigatorio = papel_obrigatorio("administrador_chefe", "administrador")


def _chave_tentativa(email):
    return f"{request.remote_addr}|{email}"


def login_bloqueado(email):
    agora = time.monotonic()
    with _trava:
        fila = _falhas[_chave_tentativa(email)]
        while fila and agora - fila[0] > JANELA_SEGUNDOS:
            fila.popleft()
        return len(fila) >= MAX_FALHAS


def registrar_falha_login(email):
    with _trava:
        _falhas[_chave_tentativa(email)].append(time.monotonic())


def limpar_falhas_login(email):
    with _trava:
        _falhas.pop(_chave_tentativa(email), None)
