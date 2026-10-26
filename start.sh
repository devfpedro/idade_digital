#!/usr/bin/env bash
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONT="$RAIZ/frontend"
BACK="$RAIZ/backend"
PORTA_BACK=5000
PORTA_FRONT=5173
PID_BACKEND=""
PID_FRONTEND=""
ENCERRANDO=0

log()  { echo "[start] $*"; }
erro() { echo "[start] ERRO: $*" >&2; }

# ---------- Encerramento limpo (inclui processos-filhos do npm/vite) ----------
matar_arvore() {
  local pid="$1" filho
  for filho in $(pgrep -P "$pid" 2>/dev/null || true); do
    matar_arvore "$filho"
  done
  kill "$pid" 2>/dev/null || true
}

encerrar() {
  [[ "$ENCERRANDO" == "1" ]] && return
  ENCERRANDO=1
  echo ""
  log "Encerrando servidores..."
  [[ -n "$PID_FRONTEND" ]] && matar_arvore "$PID_FRONTEND"
  [[ -n "$PID_BACKEND" ]] && matar_arvore "$PID_BACKEND"
  wait 2>/dev/null || true
}
trap encerrar EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# ---------- 0. Pré-requisitos e arquivos locais ----------
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  erro "Node.js/npm não encontrados no PATH. Instale o Node.js LTS (https://nodejs.org)."
  exit 1
fi
NODE_VERSAO="$(node -p 'process.versions.node')"
NODE_MAIOR="${NODE_VERSAO%%.*}"
NODE_MENOR="$(echo "$NODE_VERSAO" | cut -d. -f2)"
# O Vite 8 exige Node ^20.19.0 ou >=22.12.0
if [[ "$NODE_MAIOR" -lt 20 ]] \
  || { [[ "$NODE_MAIOR" -eq 20 ]] && [[ "$NODE_MENOR" -lt 19 ]]; } \
  || { [[ "$NODE_MAIOR" -eq 21 ]]; } \
  || { [[ "$NODE_MAIOR" -eq 22 ]] && [[ "$NODE_MENOR" -lt 12 ]]; }; then
  erro "Node.js $NODE_VERSAO é incompatível com o Vite 8 (requer ^20.19 ou >=22.12). Atualize para o LTS."
  exit 1
fi

if [[ ! -f "$BACK/db/users_mock.json" && -f "$BACK/db/users_mock.json.example" ]]; then
  log "Criando backend/db/users_mock.json a partir do .example..."
  cp "$BACK/db/users_mock.json.example" "$BACK/db/users_mock.json"
fi

# ---------- 1. Frontend (npm install se necessário/reparado) ----------
# Dependências críticas: se faltar qualquer uma o Vite quebra
# ("Failed to resolve import ..."). MISSING_DEPS acumula as que faltam.
DEPS_CRITICAS="react react-dom react-router-dom react-bootstrap bootstrap"
MISSING_DEPS=""

verificar_deps_front() {
  MISSING_DEPS=""
  local ok=0 d
  [[ -d "$FRONT/node_modules" ]] || return 1
  for d in $DEPS_CRITICAS; do
    if [[ ! -f "$FRONT/node_modules/$d/package.json" ]]; then
      ok=1
      MISSING_DEPS="$MISSING_DEPS $d"
    fi
  done
  [[ -f "$FRONT/node_modules/vite/bin/vite.js" ]] || ok=1
  return "$ok"
}

if ! verificar_deps_front; then
  log "Instalando dependências do frontend (npm install)..."
  (cd "$FRONT" && npm install --no-audit --no-fund) \
    || { erro "npm install falhou. Verifique a mensagem acima."; exit 1; }

  if ! verificar_deps_front; then
    erro "dependências do frontend incompletas."
    log "Executando reparo automático (npm install$MISSING_DEPS)..."
    # shellcheck disable=SC2086
    (cd "$FRONT" && npm install $MISSING_DEPS --no-audit --no-fund) \
      || { erro "npm install falhou. Verifique a mensagem acima."; exit 1; }

    if ! verificar_deps_front; then
      erro "o npm install não recuperou todas as dependências críticas do frontend."
      log "Tente manualmente: cd frontend && npm install --save react react-dom"
      log "  && npm install --save react-router-dom react-bootstrap bootstrap"
      log "e confira o package.json para repor o que ficou faltando."
      exit 1
    fi
  fi
fi

# ---------- 2. Backend (Python saudável + venv + pip) ----------
# A instalação do Python pode estar mutilada (stdlib sem venv/ensurepip/tempfile);
# procura o primeiro interpretador 3.10+ com a stdlib íntegra.
PY_TESTE='import sys, tempfile, venv, ensurepip; sys.exit(0 if sys.version_info >= (3, 10) else 1)'
PYTHON_BIN=""
for candidato in python3 python3.13 python3.12 python3.11 python3.10 python; do
  if command -v "$candidato" >/dev/null 2>&1 && "$candidato" -c "$PY_TESTE" >/dev/null 2>&1; then
    PYTHON_BIN="$(command -v "$candidato")"
    break
  fi
done
if [[ -z "$PYTHON_BIN" ]]; then
  erro "nenhum Python 3.10+ utilizável encontrado (versão antiga ou módulos venv/ensurepip ausentes)."
  log "Linux (Debian/Ubuntu): sudo apt install python3 python3-venv python3-pip"
  log "macOS: brew install python  |  ou instale em https://www.python.org"
  exit 1
fi
log "Usando Python: $PYTHON_BIN"

PYTHON="$BACK/venv/bin/python"
# venv inexistente ou quebrado (ex.: copiado de outro sistema/pasta): recria
if [[ -d "$BACK/venv" ]] && ! "$PYTHON" -c "import sys" >/dev/null 2>&1; then
  log "Ambiente virtual existente está inválido; recriando..."
  rm -rf "$BACK/venv"
fi
if [[ ! -x "$PYTHON" ]]; then
  log "Criando ambiente virtual do backend com $PYTHON_BIN..."
  (cd "$BACK" && "$PYTHON_BIN" -m venv venv) \
    || { erro "falha ao criar o venv. Verifique o Python usado acima."; exit 1; }
fi

log "Instalando/verificando dependências do backend (pip)..."
"$PYTHON" -m pip install -q -r "$BACK/src/requeriments.txt" \
  || { erro "pip install falhou. Verifique a mensagem acima e a conexão com a internet."; exit 1; }

# Voz neural da leitura (Piper): baixa o modelo na 1ª vez; sem ele, a leitura usa a voz do navegador
"$PYTHON" "$BACK/src/baixar_voz.py" \
  || log "AVISO: voz natural indisponível; a leitura usará a voz do navegador."

# ---------- 3. Configuração local do backend (.env) e banco de dados ----------
# (o db_init.py cria o backend/.env com SECRET_KEY gerada, se ele não existir)
log "Preparando o banco de dados PostgreSQL..."
if ! "$PYTHON" "$BACK/src/db_init.py"; then
  log "AVISO: banco indisponível. O frontend abre, mas login e cursos não funcionarão"
  log "       até o PostgreSQL ser configurado (veja as instruções acima)."
fi

# ---------- 4. Portas livres ----------
porta_ocupada() {
  "$PYTHON" - "$1" <<'PYEOF'
import socket, sys
s = socket.socket()
s.settimeout(0.5)
ocupada = s.connect_ex(("127.0.0.1", int(sys.argv[1]))) == 0
s.close()
sys.exit(0 if ocupada else 1)
PYEOF
}
for porta in "$PORTA_BACK" "$PORTA_FRONT"; do
  if porta_ocupada "$porta"; then
    erro "a porta $porta já está em uso (outra instância do projeto rodando?). Encerre-a e tente de novo."
    exit 1
  fi
done

# ---------- 5. Sobe o Flask em background ----------
log "Iniciando backend Flask em http://127.0.0.1:$PORTA_BACK ..."
FLASK_DEBUG=false FLASK_RELOADER=false "$PYTHON" "$BACK/src/app.py" &
PID_BACKEND=$!

# Aguarda o backend responder (até ~15 s) para falhar cedo se ele não subir
backend_ok=0
for _ in $(seq 1 30); do
  if ! kill -0 "$PID_BACKEND" 2>/dev/null; then break; fi
  if "$PYTHON" -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:$PORTA_BACK/status', timeout=1)" >/dev/null 2>&1; then
    backend_ok=1
    break
  fi
  sleep 0.5
done
if [[ "$backend_ok" != "1" ]]; then
  erro "o backend não respondeu em http://127.0.0.1:$PORTA_BACK/status. Veja a mensagem acima."
  exit 1
fi
log "Backend rodando em background."

# ---------- 6. Sobe o Vite ----------
log "Iniciando frontend Vite em http://localhost:$PORTA_FRONT ..."
npm --prefix "$FRONT" run dev &
PID_FRONTEND=$!

echo ""
log "Backend:  http://127.0.0.1:$PORTA_BACK/status"
log "Frontend: http://localhost:$PORTA_FRONT"
log "Pressione Ctrl+C para encerrar os dois servidores."
echo ""

# Fica de vigia: encerra tudo se qualquer um dos dois processos cair
# (Ctrl+C dispara os traps de INT/EXIT)
while kill -0 "$PID_FRONTEND" 2>/dev/null; do
  if ! kill -0 "$PID_BACKEND" 2>/dev/null; then
    erro "o backend encerrou inesperadamente. Encerrando o frontend."
    exit 1
  fi
  sleep 1
done
