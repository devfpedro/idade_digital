import os
import secrets
from pathlib import Path

from dotenv import load_dotenv

RAIZ_BACKEND = Path(__file__).resolve().parent.parent
load_dotenv(RAIZ_BACKEND / ".env")

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "idade_digital")
DB_USER = os.getenv("DB_USER", "idade_digital")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

# Sem SECRET_KEY definida, gera uma por execução: os logins caem ao reiniciar.
SECRET_KEY = os.getenv("SECRET_KEY") or secrets.token_hex(32)
SECRET_KEY_EFEMERA = not os.getenv("SECRET_KEY")

TOKEN_HORAS = int(os.getenv("TOKEN_HORAS", "8"))

VOZ_PIPER = [
    v.strip() for v in os.getenv("VOZ_PIPER", "faber,cadu,jeff").split(",") if v.strip()
]
VOZ_DIR = RAIZ_BACKEND / "voz_modelos"
