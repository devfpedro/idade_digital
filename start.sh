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

# ---------- Dependências EXTERNAS (Node.js, Python, PostgreSQL) ----------
# Quando faltam, o script explica, informa o espaço em disco e oferece instalar com
# a tecla "s". INSTALAR_DEPENDENCIAS=s ou n responde sem perguntar (automação).
SUDO=""
[[ "$(id -u)" != "0" ]] && SUDO="sudo"

# Pergunta s/n com UMA tecla. Retorno 0 = sim. Sem terminal interativo a resposta é "não".
perguntar_sn() {
  case "${INSTALAR_DEPENDENCIAS:-}" in
    [sS]) return 0 ;;
    [nN]) return 1 ;;
  esac
  [[ -t 0 ]] || return 1
  local resposta
  read -r -n 1 -p "[start] $1 [s/n]: " resposta || return 1
  echo ""
  [[ "$resposta" == [sS] ]]
}

gerenciador_de_pacotes() {
  local g
  for g in apt-get dnf pacman zypper brew; do
    if command -v "$g" >/dev/null 2>&1; then echo "$g"; return 0; fi
  done
  return 1
}

# oferecer_instalacao NOME FUNÇÃO DOWNLOAD DISCO URL COMANDO [NOTA]
oferecer_instalacao() {
  local nome="$1" funcao="$2" download="$3" disco="$4" url="$5" comando="$6" nota="${7:-}"
  echo ""
  echo "[start] ============================================================"
  echo "[start] DEPENDÊNCIA EXTERNA AUSENTE: $nome"
  echo "[start] $funcao"
  echo "[start]"
  echo "[start] Ela é um programa EXTERNO ao projeto: seria instalada no seu computador,"
  echo "[start] fora da pasta do projeto, com o comando:"
  echo "[start]   $comando"
  echo "[start] Isso ocupa espaço em disco: download de cerca de $download e cerca de"
  echo "[start] $disco depois de instalada (valores aproximados)."
  [[ -n "$nota" ]] && echo "[start] $nota"
  echo "[start] Instalação manual: $url"
  echo "[start] ============================================================"
  if ! perguntar_sn "Deseja instalar $nome agora?"; then
    log "Instalação recusada. Instale manualmente e rode o ./start.sh de novo."
    return 1
  fi
  log "Instalando $nome (pode pedir a senha do SEU usuário, por causa do sudo)..."
  if ! bash -c "$comando"; then
    erro "a instalação de $nome falhou ou foi cancelada."
    return 1
  fi
  hash -r
  log "$nome instalado."
}

oferecer_node() {
  local g comando download disco
  g="$(gerenciador_de_pacotes)" || { log "Nenhum gerenciador de pacotes conhecido; instale o Node.js manualmente."; return 1; }
  case "$g" in
    apt-get) comando="curl -fsSL https://deb.nodesource.com/setup_22.x | ${SUDO:+$SUDO -E }bash - && $SUDO apt-get install -y nodejs"; download="30 MB"; disco="200 MB" ;;
    dnf) comando="curl -fsSL https://rpm.nodesource.com/setup_22.x | ${SUDO:+$SUDO }bash - && $SUDO dnf install -y nodejs"; download="30 MB"; disco="200 MB" ;;
    pacman) comando="$SUDO pacman -S --noconfirm nodejs npm"; download="15 MB"; disco="70 MB" ;;
    zypper) comando="$SUDO zypper install -y nodejs22 npm22"; download="30 MB"; disco="200 MB" ;;
    brew) comando="brew install node"; download="50 MB"; disco="200 MB" ;;
  esac
  oferecer_instalacao "Node.js LTS" \
    "O frontend (React + Vite) precisa do Node.js e do npm para instalar pacotes e rodar." \
    "$download" "$disco" "https://nodejs.org" "$comando" \
    "No apt/dnf é usado o repositório NodeSource (precisa do curl), pois o Node das distribuições costuma ser antigo demais para o Vite 8."
}

oferecer_python() {
  local g comando download disco
  g="$(gerenciador_de_pacotes)" || { log "Nenhum gerenciador de pacotes conhecido; instale o Python manualmente."; return 1; }
  case "$g" in
    apt-get) comando="$SUDO apt-get install -y python3 python3-venv python3-pip"; download="25 MB"; disco="100 MB" ;;
    dnf) comando="$SUDO dnf install -y python3 python3-pip"; download="20 MB"; disco="80 MB" ;;
    pacman) comando="$SUDO pacman -S --noconfirm python python-pip"; download="15 MB"; disco="80 MB" ;;
    zypper) comando="$SUDO zypper install -y python3 python3-pip"; download="20 MB"; disco="80 MB" ;;
    brew) comando="brew install python"; download="20 MB"; disco="100 MB" ;;
  esac
  oferecer_instalacao "Python 3" \
    "O backend (Flask) precisa do Python 3.10 ou mais novo com venv, ensurepip e tempfile." \
    "$download" "$disco" "https://www.python.org/downloads/" "$comando"
}

postgres_instalado() {
  command -v psql >/dev/null 2>&1 || command -v pg_ctl >/dev/null 2>&1 \
    || [[ -d /usr/lib/postgresql ]] \
    || { command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files 2>/dev/null | grep -q '^postgresql'; } \
    || { command -v brew >/dev/null 2>&1 && brew list --formula 2>/dev/null | grep -q '^postgresql'; }
}

# Espera (até ~60 s) o PostgreSQL aceitar conexões na porta do banco
aguardar_postgres() {
  local i
  for i in $(seq 1 30); do
    if "$PYTHON" -c "import socket,sys; socket.create_connection(('${DB_HOST:-localhost}', int('${DB_PORT:-5432}')), 1)" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}

# PostgreSQL local ausente (oferece instalar) ou parado (oferece iniciar)
tratar_sem_postgres() {
  local g comando download disco
  g="$(gerenciador_de_pacotes)" || g=""
  if postgres_instalado; then
    if [[ "$g" == "brew" ]]; then comando="brew services start postgresql@16"; else comando="$SUDO systemctl start postgresql"; fi
    echo ""
    echo "[start] ============================================================"
    echo "[start] DEPENDÊNCIA PARADA: o PostgreSQL está instalado, mas o serviço NÃO está"
    echo "[start] em execução, então o banco não responde."
    echo "[start] Para iniciar manualmente: $comando"
    echo "[start] ============================================================"
    perguntar_sn "Tentar iniciar o serviço agora?" || return 1
    bash -c "$comando" || { erro "não foi possível iniciar o PostgreSQL."; return 1; }
  else
    case "$g" in
      apt-get) comando="$SUDO apt-get install -y postgresql && $SUDO systemctl enable --now postgresql"; download="50 MB"; disco="250 MB" ;;
      dnf) comando="$SUDO dnf install -y postgresql-server postgresql-contrib && $SUDO postgresql-setup --initdb && $SUDO systemctl enable --now postgresql"; download="30 MB"; disco="150 MB" ;;
      pacman) comando="$SUDO pacman -S --noconfirm postgresql && $SUDO su - postgres -c 'initdb -D /var/lib/postgres/data' && $SUDO systemctl enable --now postgresql"; download="20 MB"; disco="100 MB" ;;
      zypper) comando="$SUDO zypper install -y postgresql-server postgresql-contrib && $SUDO systemctl enable --now postgresql"; download="30 MB"; disco="150 MB" ;;
      brew) comando="brew install postgresql@16 && brew services start postgresql@16"; download="60 MB"; disco="300 MB" ;;
      *) log "Nenhum gerenciador de pacotes conhecido; instale o PostgreSQL manualmente (https://www.postgresql.org/download/)."; return 1 ;;
    esac
    oferecer_instalacao "PostgreSQL" \
      "O banco de dados do projeto (cursos, usuários e progresso) é um PostgreSQL local; sem ele não há login nem cursos." \
      "$download" "$disco" "https://www.postgresql.org/download/" "$comando" \
      "O serviço será iniciado e o banco do projeto criado em seguida, automaticamente." || return 1
  fi
  log "Aguardando o PostgreSQL iniciar..."
  aguardar_postgres || { erro "o PostgreSQL não respondeu a tempo."; return 1; }
  log "Preparando o banco de dados PostgreSQL (nova tentativa)..."
  DB_RC=0
  "$PYTHON" "$BACK/src/db_init.py" || DB_RC=$?
}

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
  oferecer_node || true
fi
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  erro "Node.js/npm não encontrados no PATH. Instale o Node.js LTS (https://nodejs.org) e abra um novo terminal."
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
procurar_python() {
  local candidato
  PYTHON_BIN=""
  for candidato in python3 python3.14 python3.13 python3.12 python3.11 python3.10 python; do
    if command -v "$candidato" >/dev/null 2>&1 && "$candidato" -c "$PY_TESTE" >/dev/null 2>&1; then
      PYTHON_BIN="$(command -v "$candidato")"
      return 0
    fi
  done
  return 1
}
procurar_python || { oferecer_python && procurar_python; } || true
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
DB_RC=0
"$PYTHON" "$BACK/src/db_init.py" || DB_RC=$?
# Código 3 = PostgreSQL local ausente ou parado (ver SEM_SERVIDOR no db_init.py)
if [[ "$DB_RC" == "3" ]]; then
  tratar_sem_postgres || true
fi
if [[ "$DB_RC" != "0" ]]; then
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
