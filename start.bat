@echo off
REM Idade Digital - execucao unificada (backend Flask + frontend Vite)
REM Uso: start.bat  (ou: duplo clique no Explorer)
setlocal EnableDelayedExpansion

set RAIZ=%~dp0
set PID_BACKEND=
set PID_FRONTEND=

REM ---------- 1. Frontend (npm install se necessario) ----------
if not exist "%RAIZ%frontend\node_modules" (
  echo [start] Instalando dependencias do frontend ^(npm install^)...
  pushd "%RAIZ%frontend"
  call npm install
  popd
)

REM ---------- 2. Backend (venv + pip install se necessario) ----------
set PYTHON=%RAIZ%backend\venv\Scripts\python.exe
if not exist "%PYTHON%" (
  where python >nul 2>nul
  if errorlevel 1 (
    echo [start] ERRO: Python nao encontrado no PATH.
    exit /b 1
  )
  echo [start] Criando ambiente virtual do backend...
  pushd "%RAIZ%backend"
  python -m venv venv
  popd
)

echo [start] Instalando/verificando dependencias do backend ^(pip^)...
"%PYTHON%" -m pip install -q -r "%RAIZ%backend\src\requeriments.txt"

REM ---------- 3. Sobe o Flask em background ----------
echo [start] Iniciando backend Flask em http://127.0.0.1:5000 ...
start /b "" "%PYTHON%" "%RAIZ%backend\src\app.py"
set PID_BACKEND=!errorlevel!

REM ---------- 4. Sobe o Vite em primeiro plano ----------
echo [start] Iniciando frontend Vite em http://localhost:5173 ...
call npm --prefix "%RAIZ%frontend" run dev

REM Ao fechar o Vite (Ctrl+C), encerra o Flask tambem
taskkill /pid !PID_BACKEND! >nul 2>nul
endlocal
