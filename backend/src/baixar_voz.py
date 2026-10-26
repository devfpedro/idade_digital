import shutil
import sys
import urllib.request

import config

BASE = "https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR"
QUALIDADE = {"faber": "medium", "cadu": "medium", "jeff": "medium", "edresson": "low"}


def baixar(url, destino):
    temporario = destino.with_name(destino.name + ".parte")
    with urllib.request.urlopen(url, timeout=60) as resposta, open(
        temporario, "wb"
    ) as saida:
        shutil.copyfileobj(resposta, saida)
    temporario.replace(destino)  # só aparece completo


def main():
    config.VOZ_DIR.mkdir(exist_ok=True)
    falhou = False
    for voz in config.VOZ_PIPER:
        if voz not in QUALIDADE:
            print(
                f"[voz] Voz desconhecida em VOZ_PIPER: '{voz}' (use: {', '.join(QUALIDADE)}).",
                file=sys.stderr,
            )
            falhou = True
            continue
        nome = f"pt_BR-{voz}-{QUALIDADE[voz]}.onnx"
        if (config.VOZ_DIR / nome).exists() and (
            config.VOZ_DIR / f"{nome}.json"
        ).exists():
            continue
        print(f"[voz] Baixando a voz '{voz}' (cerca de 60 MB, só na primeira vez)...")
        try:
            for arquivo in (nome, f"{nome}.json"):
                baixar(
                    f"{BASE}/{voz}/{QUALIDADE[voz]}/{arquivo}", config.VOZ_DIR / arquivo
                )
        except OSError as erro:
            print(
                f"[voz] AVISO: não foi possível baixar '{voz}': {erro}", file=sys.stderr
            )
            falhou = True
    return 1 if falhou else 0


if __name__ == "__main__":
    sys.exit(main())
