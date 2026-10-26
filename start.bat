@echo off
setlocal EnableDelayedExpansion

set "RAIZ=%~dp0"
set "PORTA_BACK=5000"
set "PORTA_FRONT=5173"
set "PY_TESTE=import sys, tempfile, venv, ensurepip; sys.exit(0 if sys.version_info >= (3, 10) else 1)"

REM ---------- 0. Pre-requisitos e arquivos locais ----------
REM Dependencias EXTERNAS ausentes (Node.js, Python, PostgreSQL) sao explicadas e
REM podem ser instaladas pelo winget com a tecla "s" (veja :oferecer_instalacao).
REM A variavel INSTALAR_DEPENDENCIAS=s ou n responde sem perguntar (automacao).
:checar_node
where node >nul 2>nul
if errorlevel 1 goto sem_node
where npm >nul 2>nul
if errorlevel 1 goto sem_node

REM O Vite 8 exige Node ^20.19.0 ou >=22.12.0
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit((a===20&&b>=19)||(a===22&&b>=12)||a>22?0:1)" >nul 2>nul
if errorlevel 1 (
  for /f %%v in ('node -p "process.versions.node"') do set "NODE_VERSAO=%%v"
  echo [start] ERRO: Node.js !NODE_VERSAO! e incompativel com o Vite 8 ^(requer ^^20.19 ou ^>=22.12^).
  echo [start] Atualize para o Node.js LTS: https://nodejs.org
  exit /b 1
)
goto node_ok

:sem_node
if defined TENTOU_NODE (
  echo [start] ERRO: Node.js/npm continuam nao encontrados. Feche e abra o terminal e rode o start.bat de novo.
  exit /b 1
)
set "TENTOU_NODE=1"
set "DEP_NOME=Node.js LTS"
set "DEP_FUNCAO=O frontend (React + Vite) precisa do Node.js e do npm para instalar pacotes e rodar."
set "DEP_WINGET=OpenJS.NodeJS.LTS"
set "DEP_ARGS=--silent"
set "DEP_DOWNLOAD=32 MB"
set "DEP_DISCO=100 MB"
set "DEP_NOTA=O Windows vai pedir permissao de administrador (UAC) durante a instalacao."
set "DEP_URL=https://nodejs.org"
call :oferecer_instalacao
if errorlevel 1 (
  echo [start] ERRO: sem o Node.js nao e possivel iniciar o frontend.
  exit /b 1
)
goto checar_node

:node_ok
if not exist "%RAIZ%backend\db\users_mock.json" (
  if exist "%RAIZ%backend\db\users_mock.json.example" (
    echo [start] Criando backend/db/users_mock.json a partir do .example...
    copy /y "%RAIZ%backend\db\users_mock.json.example" "%RAIZ%backend\db\users_mock.json" >nul
  )
)

REM ---------- 1. Frontend (npm install se necessario/reparado) ----------

call :verificar_deps_front
if "%FRONT_DEPS_OK%"=="1" goto frontend_deps_ok

echo [start] Instalando dependencias do frontend ^(npm install^)...
pushd "%RAIZ%frontend"
call npm install --no-audit --no-fund
set NPM_RC=!errorlevel!
popd
if not "%NPM_RC%"=="0" (
  echo [start] ERRO: npm install falhou com codigo !NPM_RC!. Verifique a mensagem acima.
  exit /b 1
)

REM Estado final: TODAS as dependencias criticas tem de existir, senao
REM o Vite quebra ("Failed to resolve import ..."). Lista em :verificar_deps_front.
REM Faltando algo, o reparo e AUTOMATICO: primeiro npm install em branco
REM (reconcilia a arvore com o package.json); se o package.json em si ficou
REM inconsistente (ex.: "npm remove react-router-dom"), instala os pacotes
REM que faltam PELO NOME e ainda devolve o package.json ao estado correto.
call :verificar_deps_front
if "%FRONT_DEPS_OK%"=="1" goto frontend_deps_ok

echo [start] ERRO: dependencias do frontend incompletas.
echo [start] Executando reparo automatico ^(npm install!MISSING_DEPS!^)...
pushd "%RAIZ%frontend"
call npm install !MISSING_DEPS! --no-audit --no-fund
set NPM_RC=!errorlevel!
popd
if not "%NPM_RC%"=="0" (
  echo [start] ERRO: npm install falhou com codigo !NPM_RC!. Verifique a mensagem acima.
  exit /b 1
)

call :verificar_deps_front
if "%FRONT_DEPS_OK%"=="1" goto frontend_deps_ok

echo [start] ERRO: o npm install nao recuperou todas as dependencias criticas do frontend.
echo [start] Tente manualmente: cd frontend ^&^& npm install --save react react-dom
echo [start]   ^&^& npm install --save react-router-dom react-bootstrap bootstrap
echo [start] e confira o package.json para repor o que ficou faltando.
exit /b 1

:frontend_deps_ok
REM ---------- 2. Backend (Python saudavel + venv + pip) ----------
REM A instalacao do Python pode estar mutilada (stdlib sem tempfile/venv/ensurepip):
REM procura o primeiro interpretador 3.10+ com a stdlib integra. Tenta o python do
REM PATH; se nao servir, percorre os runtimes do launcher "py" (-0p).
:procurar_python
set "PYTHON_BIN="
python -c "!PY_TESTE!" >nul 2>nul && set "PYTHON_BIN=python"
if not defined PYTHON_BIN (
  for /f "usebackq tokens=1,* delims= " %%a in (`py -0p 2^>nul ^| findstr /r /c:"-V:"`) do (
    set "TAG=%%a"
    if "!TAG:~0,3!"=="-V:" (
      if not defined PYTHON_BIN (
        set "CAND_BIN=%%b"
        call :limpar_candidato
        if exist "!CAND_BIN!" "!CAND_BIN!" -c "!PY_TESTE!" >nul 2>nul && set "PYTHON_BIN=!CAND_BIN!"
      )
    )
  )
)
if not defined PYTHON_BIN if not defined TENTOU_PY (
  set "TENTOU_PY=1"
  set "DEP_NOME=Python 3.14"
  set "DEP_FUNCAO=O backend (Flask) precisa do Python 3.10 ou mais novo com a biblioteca padrao integra (tempfile, venv, ensurepip)."
  set "DEP_WINGET=Python.Python.3.14"
  set "DEP_ARGS=--silent --scope user"
  set "DEP_DOWNLOAD=32 MB"
  set "DEP_DISCO=165 MB"
  set "DEP_NOTA="
  set "DEP_URL=https://www.python.org/downloads/"
  call :oferecer_instalacao
  if not errorlevel 1 goto procurar_python
)
if not defined PYTHON_BIN (
  echo [start] ERRO: nenhum Python 3.10+ utilizavel encontrado ^(versao antiga ou
  echo [start]       modulos tempfile/venv/ensurepip ausentes^).
  echo [start] Instale o Python em https://www.python.org e rode o start.bat de novo.
  exit /b 1
)
echo [start] Usando Python: !PYTHON_BIN!

set "PYTHON=%RAIZ%backend\venv\Scripts\python.exe"
REM venv sem pip (criacao interrompida) ou copiado de outro lugar: recria
if exist "%PYTHON%" (
  "%PYTHON%" -m pip --version >nul 2>nul
  if errorlevel 1 (
    echo [start] Ambiente virtual existente esta invalido; recriando...
    rmdir /s /q "%RAIZ%backend\venv"
  )
)
if not exist "%PYTHON%" (
  echo [start] Criando ambiente virtual do backend com !PYTHON_BIN!...
  pushd "%RAIZ%backend"
  "!PYTHON_BIN!" -m venv venv
  if errorlevel 1 (
    echo [start] ERRO: falha ao criar o venv. Verifique o Python usado acima.
    popd
    exit /b 1
  )
  popd
)

echo [start] Instalando/verificando dependencias do backend ^(pip^)...
"%PYTHON%" -m pip install -q -r "%RAIZ%backend\src\requeriments.txt"
if errorlevel 1 (
  echo [start] ERRO: pip install falhou. Verifique a mensagem acima e a conexao com a internet.
  exit /b 1
)

REM Voz neural da leitura (Piper): baixa o modelo na 1a vez; sem ele, a leitura
REM usa a voz do navegador.
"%PYTHON%" "%RAIZ%backend\src\baixar_voz.py"
if errorlevel 1 echo [start] AVISO: voz natural indisponivel; a leitura usara a voz do navegador.

REM Banco PostgreSQL: cria backend\.env (se faltar), esquema, dados iniciais e
REM usuarios. Se o banco estiver inacessivel, apenas avisa e segue adiante.
echo [start] Preparando o banco de dados PostgreSQL...
"%PYTHON%" "%RAIZ%backend\src\db_init.py"
set "DB_RC=!errorlevel!"
REM Codigo 3 = PostgreSQL local ausente ou parado (ver SEM_SERVIDOR no db_init.py)
if "!DB_RC!"=="3" call :tratar_sem_postgres
if not "!DB_RC!"=="0" (
  echo [start] AVISO: banco indisponivel. O frontend abre, mas login e cursos
  echo [start]        nao funcionarao ate o PostgreSQL ser configurado.
)

REM ---------- 3. Portas livres ----------
REM Um backend deste projeto esquecido de uma execucao anterior ^(Ctrl+C no CMD
REM nao o encerra^) e finalizado sozinho; qualquer outro programa e respeitado.
call :porta_ocupada %PORTA_FRONT%
if not errorlevel 1 (
  echo [start] ERRO: a porta %PORTA_FRONT% ja esta em uso ^(outra instancia do projeto ou outro programa^).
  echo [start] Encerre-a e tente de novo.
  exit /b 1
)
call :porta_ocupada %PORTA_BACK%
if not errorlevel 1 (
  echo [start] Porta %PORTA_BACK% em uso; encerrando backend anterior deste projeto, se houver...
  call :encerrar_backend
  ping -n 3 127.0.0.1 >nul
  call :porta_ocupada %PORTA_BACK%
  if not errorlevel 1 (
    echo [start] ERRO: a porta %PORTA_BACK% esta ocupada por outro programa. Encerre-o e tente de novo.
    exit /b 1
  )
)

REM ---------- 4. Sobe o Flask em background ----------
set FLASK_DEBUG=false
set FLASK_RELOADER=false
echo [start] Iniciando backend Flask em http://127.0.0.1:%PORTA_BACK% ...
start /b "" "%PYTHON%" "%RAIZ%backend\src\app.py"

REM Aguarda o backend responder ^(ate ~30 s^) para falhar cedo se ele nao subir
set "BACK_OK=0"
for /l %%i in (1,1,30) do (
  if "!BACK_OK!"=="0" (
    "%PYTHON%" -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:%PORTA_BACK%/status', timeout=1)" >nul 2>nul && set "BACK_OK=1"
    if "!BACK_OK!"=="0" ping -n 2 127.0.0.1 >nul
  )
)
if not "%BACK_OK%"=="1" (
  echo [start] ERRO: o backend nao respondeu em http://127.0.0.1:%PORTA_BACK%/status. Veja a mensagem acima.
  call :encerrar_backend
  exit /b 1
)
echo [start] Backend rodando em background.

REM ---------- 5. Sobe o Vite em primeiro plano ----------
set "FALHAS_RAPIDAS=0"
:vite_loop
call :segundos T0
echo [start] Iniciando frontend Vite em http://localhost:%PORTA_FRONT% ...
call npm --prefix "%RAIZ%frontend" run dev
set "VITE_RC=!errorlevel!"
if "!VITE_RC!"=="0" goto vite_encerrado

REM Tratamento de parada:
REM Se o usuario apertou Ctrl+C e respondeu 'N' para o CMD, o errorlevel e
REM diferente de zero. O script atende o comando 'N' e retoma a execucao.
REM Se o Vite cair logo ao subir ^(3 vezes seguidas em menos de 10 s^), desiste
REM em vez de reiniciar para sempre.
call :segundos T1
set /a DURACAO=T1-T0
if !DURACAO! lss 0 set /a DURACAO+=86400
if !DURACAO! lss 10 (set /a FALHAS_RAPIDAS+=1) else set "FALHAS_RAPIDAS=0"
if !FALHAS_RAPIDAS! geq 3 (
  echo [start] ERRO: o Vite encerrou com erro 3 vezes seguidas ao iniciar. Veja a mensagem acima.
  call :encerrar_backend
  exit /b 1
)
echo.
echo [start] Frontend interrompido. Retomando a execucao do projeto em 2 segundos...
echo [start] ^(Para sair, pressione Ctrl+C e depois 'S'^)
ping -n 3 127.0.0.1 >nul
goto vite_loop

:vite_encerrado
REM O Vite foi encerrado de forma limpa ^(ex: digitando 'q' + Enter^).
echo [start] Encerrando o servidor backend...
call :encerrar_backend
exit /b 0

REM ===== Helper: checa marcadores das dependencias criticas do frontend =====
REM Define FRONT_DEPS_OK=1 se todos existirem; 0 se faltar qualquer um.
REM Tambem coleta os pacotes que faltam em MISSING_DEPS (para reparo
REM "npm install <falta 1> <falta 2> ...", que conserta package.json e arvore).
:verificar_deps_front
set FRONT_DEPS_OK=1
set "MISSING_DEPS="
if not exist "%RAIZ%frontend\node_modules" (
  set FRONT_DEPS_OK=0
  goto :eof
)
for %%d in (react react-dom react-router-dom react-bootstrap bootstrap) do (
  if not exist "%RAIZ%frontend\node_modules\%%d\package.json" (
    set FRONT_DEPS_OK=0
    set "MISSING_DEPS=!MISSING_DEPS! %%d"
  )
)
if not exist "%RAIZ%frontend\node_modules\vite\bin\vite.js" (
  set FRONT_DEPS_OK=0
  goto :eof
)
goto :eof

REM ===== Helper: remove o prefixo de marcador/espacos das linhas de "py -0p" =====
REM Converte "* C:\...python.exe" em "C:\...python.exe" (usado pelo primeiro
REM interpretador saudavel do loop anterior).
:limpar_candidato
if "%CAND_BIN:~0,1%"=="*" (set "CAND_BIN=%CAND_BIN:~1%" & goto :limpar_candidato)
if "%CAND_BIN:~0,1%"==" " (set "CAND_BIN=%CAND_BIN:~1%" & goto :limpar_candidato)
if "%CAND_BIN:~0,1%"=="'" (set "CAND_BIN=%CAND_BIN:~1%" & goto :limpar_candidato)
goto :eof

REM ===== Helper: errorlevel 0 se algo escuta na porta %1 (IPv4 ou IPv6) =====
REM O Vite escuta so em ::1, por isso as duas familias sao testadas.
:porta_ocupada
"%PYTHON%" -c "import socket,sys; socket.setdefaulttimeout(0.3); p=int(sys.argv[1]); c=lambda f,a: socket.socket(f).connect_ex(a)==0; sys.exit(0 if c(socket.AF_INET,('127.0.0.1',p)) or c(socket.AF_INET6,('::1',p)) else 1)" %1
exit /b %errorlevel%

REM ===== Helper: encerra o(s) processo(s) Flask DESTE projeto =====
REM Substitui o "wmic", que nao existe no Windows 11 recente. O venv do Windows
REM sobe dois python.exe ^(redirecionador + interpretador^); ambos citam o app.py.
:encerrar_backend
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'python.exe' -and $_.CommandLine -like '*%RAIZ%backend\src\app.py*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>nul
goto :eof

REM ===== Helper: segundos desde 00:00 em %1 (para medir quanto o Vite durou) =====
:segundos
set "_t=%time: =0%"
set /a "%~1=(1!_t:~0,2!-100)*3600+(1!_t:~3,2!-100)*60+(1!_t:~6,2!-100)"
goto :eof

REM ===== Helper: pergunta s/n com UMA tecla. errorlevel 0 = sim, 1 = nao =====
REM Sem terminal interativo (entrada redirecionada) a resposta e "nao".
:perguntar_sn
if defined INSTALAR_DEPENDENCIAS (
  if /i "!INSTALAR_DEPENDENCIAS!"=="s" exit /b 0
  exit /b 1
)
choice /c SN /n /m "[start] %~1 [s/n]: " 2>nul
if errorlevel 2 exit /b 1
if errorlevel 1 exit /b 0
exit /b 1

REM ===== Helper: explica a dependencia EXTERNA ausente e oferece instalar =====
REM Entrada: DEP_NOME, DEP_FUNCAO, DEP_WINGET, DEP_ARGS, DEP_DOWNLOAD, DEP_DISCO,
REM DEP_NOTA (opcional) e DEP_URL. errorlevel 0 = instalou, 1 = nao instalou.
:oferecer_instalacao
echo.
echo [start] ============================================================
echo [start] DEPENDENCIA EXTERNA AUSENTE: !DEP_NOME!
echo [start] !DEP_FUNCAO!
echo [start]
echo [start] Ela e um programa EXTERNO ao projeto: seria instalada no seu
echo [start] computador, fora da pasta do projeto, pelo winget. Isso ocupa
echo [start] espaco em disco: download de cerca de !DEP_DOWNLOAD! e cerca de
echo [start] !DEP_DISCO! depois de instalada.
if defined DEP_NOTA echo [start] !DEP_NOTA!
echo [start] Instalacao manual: !DEP_URL!
echo [start] ============================================================
call :perguntar_sn "Deseja instalar !DEP_NOME! agora?"
if errorlevel 1 (
  echo [start] Instalacao recusada. Instale manualmente e rode o start.bat de novo.
  exit /b 1
)
where winget >nul 2>nul
if errorlevel 1 (
  echo [start] O winget nao esta disponivel neste Windows. Instale manualmente: !DEP_URL!
  exit /b 1
)
echo [start] Instalando !DEP_NOME! pelo winget ^(pode levar alguns minutos^)...
winget install --id !DEP_WINGET! -e --source winget --accept-package-agreements --accept-source-agreements !DEP_ARGS!
if errorlevel 1 (
  echo [start] ERRO: a instalacao de !DEP_NOME! falhou ou foi cancelada.
  exit /b 1
)
call :atualizar_path
echo [start] !DEP_NOME! instalado.
exit /b 0

REM ===== Helper: le de novo o PATH do sistema/usuario (programa recem-instalado) =====
:atualizar_path
for /f "usebackq delims=" %%p in (`powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('Path','Machine')+';'+[Environment]::GetEnvironmentVariable('Path','User')"`) do set "PATH=%%p"
goto :eof

REM ===== Helper: PostgreSQL local ausente (oferece instalar) ou parado (oferece iniciar) =====
:tratar_sem_postgres
set "PG_SERVICO="
for /f "usebackq delims=" %%s in (`powershell -NoProfile -Command "(Get-Service 'postgresql*' -ErrorAction SilentlyContinue | Select-Object -First 1).Name"`) do set "PG_SERVICO=%%s"
if defined PG_SERVICO goto pg_parado
set "DEP_NOME=PostgreSQL 16"
set "DEP_FUNCAO=O banco de dados do projeto (cursos, usuarios e progresso) e um PostgreSQL local; sem ele nao ha login nem cursos."
set "DEP_WINGET=PostgreSQL.PostgreSQL.16"
set "DEP_ARGS=--interactive"
set "DEP_DOWNLOAD=386 MB"
set "DEP_DISCO=250 MB (servidor e ferramentas; o pgAdmin e o Stack Builder, opcionais no assistente, ocupam mais)"
set "DEP_NOTA=Abrira o instalador do PostgreSQL (com permissao de administrador). Defina e ANOTE a senha do usuario 'postgres': o start.bat vai pedi-la uma unica vez para criar o banco do projeto (ela nao e gravada)."
set "DEP_URL=https://www.postgresql.org/download/windows/"
call :oferecer_instalacao
if errorlevel 1 goto :eof
echo [start] Aguardando o PostgreSQL iniciar...
call :esperar_postgres
goto pg_reexecutar

:pg_parado
echo.
echo [start] ============================================================
echo [start] DEPENDENCIA PARADA: o PostgreSQL esta instalado ^(servico !PG_SERVICO!^),
echo [start] mas o servico NAO esta em execucao, entao o banco nao responde.
echo [start] Para iniciar manualmente: PowerShell como Administrador ^> Start-Service !PG_SERVICO!
echo [start] ============================================================
call :perguntar_sn "Tentar iniciar o servico agora (o Windows pedira permissao de administrador)?"
if errorlevel 1 goto :eof
powershell -NoProfile -Command "Start-Process powershell -Verb RunAs -Wait -WindowStyle Hidden -ArgumentList '-NoProfile -Command Start-Service !PG_SERVICO!'"
call :esperar_postgres

:pg_reexecutar
echo [start] Preparando o banco de dados PostgreSQL ^(nova tentativa^)...
"%PYTHON%" "%RAIZ%backend\src\db_init.py"
set "DB_RC=!errorlevel!"
goto :eof

REM ===== Helper: espera (ate ~60 s) o PostgreSQL aceitar conexoes na porta =====
:esperar_postgres
set "PG_PORTA=5432"
if defined DB_PORT set "PG_PORTA=%DB_PORT%"
set "PG_PRONTO="
for /l %%i in (1,1,30) do (
  if not defined PG_PRONTO (
    call :porta_ocupada !PG_PORTA!
    if not errorlevel 1 (set "PG_PRONTO=1") else ping -n 3 127.0.0.1 >nul
  )
)
goto :eof
