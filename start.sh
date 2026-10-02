#!/usr/bin/env bash
# Idade Digital — execução unificada (backend Flask + frontend Vite)
# Uso: ./start.sh   (ou: bash start.sh)
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cleanup() {
  echo ""
  echo "Encerrando servidores..."
  [[ -n "${PID_BACKEND:-}" ]] && kill "$PID_BACKEND" 2>/dev/null || true
  [[ -n "${PID_FRONTEND:-}" ]] && kill "$PID_FRONTEND" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# ---------- 1. Frontend (npm install se necessário) ----------
if [[ ! -d "$RAIZ/frontend/node_modules" ]]; then
  echo "[start] Instalando dependências do frontend (npm install)..."
  (cd "$RAIZ/frontend" && npm install)
fi

# ---------- 2. Backend (venv + pip install se necessário) ----------
PYTHON="$RAIZ/backend/venv/bin/python"
if [[ ! -x "$PYTHON" ]]; then
  if ! command -v python3 >/dev/null 2>&1; then
    echo "[start] ERRO: Python 3 não encontrado no PATH." >&2
    exit 1
  fi
  echo "[start] Criando ambiente virtual do backend..."
  (cd "$RAIZ/backend" && python3 -m venv venv)
fi

echo "[start] Instalando/verificando dependências do backend (pip)..."
"$PYTHON" -m pip install -q -r "$RAIZ/backend/src/requeriments.txt"

# ---------- 3. Sobe o Flask em background ----------
echo "[start] Iniciando backend Flask em http://127.0.0.1:5000 ..."
FLASK_RELOADER=false "$PYTHON" "$RAIZ/backend/src/app.py" &
PID_BACKEND=$!

# ---------- 4. Sobe o Vite em primeiro plano ----------
echo "[start] Iniciando frontend Vite em http://localhost:5173 ..."
(cd "$RAIZ/frontend" && npm run dev) &
PID_FRONTEND=$!

echo ""
echo "[start] Backend:  http://127.0.0.1:5000/status"
echo "[start] Frontend: http://localhost:5173"
echo "[start] Pressione Ctrl+C para encerrar os dois servidores."
echo ""

# Encerra o backend quando o Vite terminar (Ctrl+C já dispara o trap)
wait "$PID_FRONTEND"
