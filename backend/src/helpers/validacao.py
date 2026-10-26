import re

from flask import request


def corpo_json():
    """Corpo da requisição como dicionário (qualquer outra coisa vira {} e falha na validação)."""
    dados = request.get_json(silent=True)
    return dados if isinstance(dados, dict) else {}


class ErroValidacao(ValueError):
    pass


def texto(dados, campo, maximo, obrigatorio=True):
    valor = dados.get(campo)
    if valor is None or (isinstance(valor, str) and not valor.strip()):
        if obrigatorio:
            raise ErroValidacao(f"O campo '{campo}' é obrigatório.")
        return None
    if not isinstance(valor, str):
        raise ErroValidacao(f"O campo '{campo}' deve ser um texto.")
    valor = valor.strip()
    if len(valor) > maximo:
        raise ErroValidacao(f"O campo '{campo}' aceita no máximo {maximo} caracteres.")
    return valor


def escapar_like(termo):
    return termo.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def url(dados, campo, hosts=None, obrigatorio=False):
    from urllib.parse import urlparse

    valor = texto(dados, campo, 500, obrigatorio)
    if valor is None:
        return None
    analisada = urlparse(valor)
    if analisada.scheme not in ("http", "https") or not analisada.hostname:
        raise ErroValidacao("O link informado deve começar com http:// ou https://.")
    if hosts and not any(analisada.hostname == h or analisada.hostname.endswith("." + h) for h in hosts):
        raise ErroValidacao(f"O link deve ser de um destes sites: {', '.join(hosts)}.")
    return valor


PADRAO_UPLOAD = re.compile(r"^/uploads/[a-f0-9]{32}\.(png|jpg|webp)$")


def imagem(dados, campo="imagem"):
    valor = texto(dados, campo, 500, obrigatorio=False)
    if valor is None or PADRAO_UPLOAD.match(valor):
        return valor
    return url(dados, campo)
