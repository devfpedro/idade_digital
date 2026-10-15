@echo off
REM Idade Digital - execucao unificada (backend Flask + frontend Vite)
REM Uso: start.bat  (ou: duplo clique no Explorer)
setlocal EnableDelayedExpansion

set RAIZ=%~dp0
set PID_BACKEND=
set PID_FRONTEND=

if not exist "%RAIZ%frontend\src\users_mock.json" (
  if exist "%RAIZ%frontend\src\users_mock.json.example" (
    echo [start] Criando src/users_mock.json a partir do .example...
    copy /y "%RAIZ%frontend\src\users_mock.json.example" "%RAIZ%frontend\src\users_mock.json" >nul
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
echo [start] ^|^& conferir o package.json para repor o que ficou faltando.
exit /b 1

:frontend_deps_ok
REM ---------- 2. Backend (venv + pip install se necessario) ----------
REM Escolhe um interpretador Python com stdlib INTEGRA: a instalacao do
REM usuario pode vir mutilada (modulos padrao como "tempfile" ausentes)
REM e nesse caso "python -m venv" falha no ensurepip. Tenta o python do
REM PATH; quebrado, percorre os runtimes do launcher "py" (-0p) e usa o
REM primeiro healthier. Quoted set (set "X=...") para proteger espacos.
set "PYTHON_BIN="
python -c "import tempfile" >nul 2>nul && set "PYTHON_BIN=python"
if not defined PYTHON_BIN (
  for /f "usebackq tokens=1,* delims= " %%a in (`py -0p 2^>nul ^| findstr /r /c:"-V:"`) do (
    set "TAG=%%a"
    if "!TAG:~0,3!"=="-V:" (
      if not defined PYTHON_BIN (
        set "CAND_BIN=%%b"
        call :limpar_candidato
        if exist "!CAND_BIN!" "!CAND_BIN!" -c "import tempfile" >nul 2>nul && set "PYTHON_BIN=!CAND_BIN!"
      )
    )
  )
)
if not defined PYTHON_BIN (
  echo [start] ERRO: nenhum Python utilizavel encontrado ^(stdlib quebrada?^).
  echo [start] Reinstale o Python ou corrija o PATH e rode o start.bat de novo.
  exit /b 1
)
echo [start] Usando Python: !PYTHON_BIN!

set "PYTHON=%RAIZ%backend\venv\Scripts\python.exe"
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

REM ---------- 3. Sobe o Flask em background ----------
set FLASK_DEBUG=false
set FLASK_RELOADER=false
echo [start] Iniciando backend Flask em http://127.0.0.1:5000 ...
start /b "" "%PYTHON%" "%RAIZ%backend\src\app.py"

echo [start] Backend rodando em background.

REM ---------- 4. Sobe o Vite em primeiro plano ----------
:vite_loop
echo [start] Iniciando frontend Vite em http://localhost:5173 ...
call npm --prefix "%RAIZ%frontend" run dev

REM Tratamento de parada:
REM Se o usuario apertou Ctrl+C e respondeu 'N' para o CMD, o errorlevel e 
REM diferente de zero. O script atende o comando 'N' e retoma a execucao:
if !errorlevel! neq 0 (
    echo.
    echo [start] Frontend interrompido. Retomando a execucao do projeto em 2 segundos...
    echo [start] ^(Para sair, pressione Ctrl+C e depois 'S'^)
    timeout /t 2 /nobreak >nul
    goto vite_loop
)

REM Se chegou ate aqui, o Vite foi encerrado de forma limpa (ex: digitando 'q' + Enter).
echo [start] Encerrando o servidor backend...
wmic process where "name='python.exe' and CommandLine like '%%app.py%%'" call terminate >nul 2>nul

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