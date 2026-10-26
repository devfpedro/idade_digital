import hashlib
import io
import re
import threading
import wave
from collections import OrderedDict

import config

VOZ_PADRAO = "faber"
NOMES = {"faber": "Faber", "cadu": "Cadu", "jeff": "Jeff", "edresson": "Edresson"}
# length_scale do Piper: quanto maior, mais devagar (1.0 = velocidade original do modelo)
RITMOS = {"rapido": 1.15, "normal": 1.3, "devagar": 1.5}
RITMO_PADRAO = "normal"  # o recomendado
PAUSA_ENTRE_FRASES_S = 0.3
LIMITE_CACHE = 64

_vozes = {}
_cache = OrderedDict()
_trava = threading.Lock()

# Emojis, setas e símbolos que o sintetizador pronunciaria de forma estranha (ou em inglês)
_SIMBOLOS = re.compile(
    "[\U0001f000-\U0001faff\U00002600-\U000027bf\U00002190-\U000021ff\U0000fe0f\U0000200d]"
)


def limpar_texto(texto):
    texto = _SIMBOLOS.sub(" ", texto)
    texto = texto.replace("•", ". ").replace("%", " por cento").replace("&", " e ")
    texto = re.sub(r"[\"“”«»]", "", texto)
    texto = re.sub(r"\s*\n\s*", ". ", texto)
    texto = re.sub(r"([.!?:;])\s*\.", r"\1", texto)
    return re.sub(r"\s{2,}", " ", texto).strip()


def _modelo(voz_id):
    for caminho in config.VOZ_DIR.glob(f"pt_BR-{voz_id}-*.onnx"):
        if caminho.with_name(caminho.name + ".json").exists():
            return caminho
    return None


def vozes_disponiveis():
    try:
        import piper  # noqa: F401
    except ImportError:
        return []
    if not config.VOZ_DIR.exists():
        return []
    ids = {p.name.split("-")[1] for p in config.VOZ_DIR.glob("pt_BR-*.onnx")}
    ordenadas = sorted(ids, key=lambda v: (v != VOZ_PADRAO, v))
    return [
        {"id": v, "nome": NOMES.get(v, v.capitalize()), "padrao": v == VOZ_PADRAO}
        for v in ordenadas
        if _modelo(v)
    ]


def sintetizar(texto, voz_id=None, ritmo=None):
    from piper import SynthesisConfig

    ids = [v["id"] for v in vozes_disponiveis()]
    if not ids:
        raise LookupError("Nenhuma voz instalada.")
    voz_id = voz_id if voz_id in ids else ids[0]
    ritmo = ritmo if ritmo in RITMOS else RITMO_PADRAO
    texto = limpar_texto(texto)
    if not texto:
        raise ValueError("Sem texto legível.")

    chave = (voz_id, ritmo, hashlib.sha256(texto.encode("utf-8")).hexdigest())
    with _trava:
        if chave in _cache:
            _cache.move_to_end(chave)
            return _cache[chave]

        if voz_id not in _vozes:
            from piper import PiperVoice

            _vozes[voz_id] = PiperVoice.load(str(_modelo(voz_id)))
        voz = _vozes[voz_id]
        configuracao = SynthesisConfig(length_scale=RITMOS[ritmo])

        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as arquivo:
            definido = False
            for trecho in voz.synthesize(texto, syn_config=configuracao):
                if not definido:
                    arquivo.setnchannels(trecho.sample_channels)
                    arquivo.setsampwidth(trecho.sample_width)
                    arquivo.setframerate(trecho.sample_rate)
                    definido = True
                    silencio = b"\x00" * (
                        int(trecho.sample_rate * PAUSA_ENTRE_FRASES_S)
                        * trecho.sample_width
                        * trecho.sample_channels
                    )
                else:
                    arquivo.writeframes(silencio)  # pausa curta entre as frases
                arquivo.writeframes(trecho.audio_int16_bytes)
        audio = buffer.getvalue()

        _cache[chave] = audio
        if len(_cache) > LIMITE_CACHE:
            _cache.popitem(last=False)
        return audio
