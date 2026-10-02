<div align="center">

# 👴 Idade Digital

### Inclusão Digital para a Pessoa Idosa: Promovendo Autonomia e Cidadania por Meio da Tecnologia

**Uma plataforma web voltada ao ensino tecnológico e ao letramento digital de pessoas com mais de 60 anos.**

[![React](https://img.shields.io/badge/React.js-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Planejado-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

</div>

---

## 📖 Sobre o projeto

O **Idade Digital** é uma plataforma web desenvolvida para promover o ensino tecnológico e o letramento digital de pessoas com mais de 60 anos.

O objetivo é capacitar os usuários no manuseio de computadores e smartphones, permitindo que utilizem a tecnologia no dia a dia de forma **autônoma e segura**, além de conscientizá-los sobre a prevenção contra fraudes virtuais.

---

## 📚 Sumário

- [🛠️ Tecnologias utilizadas](#️-tecnologias-utilizadas)
- [✨ Funcionalidades atuais](#-funcionalidades-atuais)
- [📋 Pré-requisitos](#-pré-requisitos)
- [🚀 Como executar o projeto](#-como-executar-o-projeto)
  - [⚡ Resumo rápido](#-resumo-rápido--executar-com-startsh)
  - [Passo 1 — Clonar o repositório](#passo-1--clonar-o-repositório)
  - [Passo 2 — Verificar as ferramentas instaladas](#passo-2--verificar-as-ferramentas-instaladas)
  - [Passo 3 — Criar as credenciais de teste](#passo-3--criar-o-arquivo-de-credenciais-de-teste-obrigatório)
  - [Passo 4 — Instalar as dependências do front-end](#passo-4--instalar-as-dependências-do-front-end)
  - [Passo 5 — Instalar as dependências do back-end](#passo-5--instalar-as-dependências-do-back-end-venv--pip)
  - [Passo 6 — Iniciar a aplicação](#passo-6--iniciar-backend-e-frontend-com-um-único-comando)
  - [Passo 7 — Verificar a execução](#passo-7--verificar-que-tudo-subiu-outro-terminal-opcional)
  - [Encerrar](#encerrar)
  - [Execução manual](#alternativa-execução-manual-dois-terminais)
- [🔐 Variáveis de ambiente](#-variáveis-de-ambiente-do-backend-opcionais)
- [🧪 Scripts de verificação](#-scripts-de-verificação)
- [🔒 Notas de segurança](#-notas-de-segurança)
- [👥 Colaboradores](#-colaboradores)

---

## 🛠️ Tecnologias utilizadas

| Camada | Tecnologia |
|---|---|
| **Front-end** | React.js 19 + Vite 8 |
| **Back-end** | Python 3 + Flask 3 + Flask-CORS |
| **Banco de dados** | PostgreSQL *(planejado para as próximas fases)* |

---

## ✨ Funcionalidades atuais

- 🔐 **Autenticação mock de desenvolvimento** — login validado contra `frontend/src/users_mock.json` (arquivo local, gitignored; 5 credenciais da equipe).
- ⏱️ **Sessão com expiração por inatividade (10 minutos)** — cliques, digitação, toques e rolagem renovam o tempo automaticamente. Ao expirar, o usuário recebe uma notificação flutuante (**toast**) e é redirecionado ao login. O contador não é exibido na tela.
- 🧹 **Tratamento de dados corrompidos** — sessões inválidas armazenadas no `localStorage` são descartadas sem interromper a aplicação.
- 🏠 **Home acessível (público 60+)** — boas-vindas personalizadas e cartões grandes de alto contraste para as futuras seções **Cursos** e **Informações**.
- 👤 **Menu de perfil** — ícone redondo no canto superior direito com opções de Informações Pessoais, Suporte, Notificações e Sair.
- 🔑 **Tela de login acessível** — botões visuais para **“Esqueceu a senha?”** e **“Entrar com o Google”** (em desenvolvimento), além de suporte/contato e mensagens de erro claras.
- 🔔 **Notificações flutuantes (toast)** — exibidas no topo central da tela, com animação e fechamento automático.
- ▶️ **Execução unificada** — um único comando (`start.sh` / `start.bat`) sobe o back-end e o front-end juntos.
- 🌐 **CORS configurado** — a API Flask aceita requisições apenas das origens do front-end Vite em desenvolvimento.

---

## 📋 Pré-requisitos

Antes de executar o projeto, tenha as seguintes ferramentas instaladas:

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) — versão **LTS** recomendada
- [Python 3](https://www.python.org/) — versão **3.10 ou superior**
- [PostgreSQL](https://www.postgresql.org/) — necessário apenas quando o banco for integrado

> **Observação:** o `start.sh` instala automaticamente as dependências que estiverem faltando. Os passos manuais abaixo são úteis para configuração inicial ou para quem prefere controlar cada etapa explicitamente.

---

## 🚀 Como executar o projeto

Todos os comandos abaixo devem ser executados na **raiz do projeto**, na pasta `idade_digital`.

### ⚡ Resumo rápido — executar com `./start.sh`

Com Git, Node.js e Python instalados, estes são os comandos necessários na primeira execução.

#### 🐧 Linux / macOS

```bash
git clone https://github.com/devfpedro/idade_digital.git
cd idade_digital
cp frontend/src/users_mock.json.example frontend/src/users_mock.json
chmod +x start.sh
./start.sh
```

#### 🪟 Windows (CMD)

```bat
git clone https://github.com/devfpedro/idade_digital.git
cd idade_digital
copy frontend\src\users_mock.json.example frontend\src\users_mock.json
start.bat
```

### O que o script faz automaticamente?

1. Instala o pacote do front-end (`npm install`) caso a pasta `node_modules` não exista.
2. Cria o ambiente virtual do back-end (`venv`) caso ele não exista e instala o Flask com `pip`.
3. Inicia o **back-end** em `http://127.0.0.1:5000` e o **front-end** em `http://localhost:5173` simultaneamente.

Depois, abra **[http://localhost:5173](http://localhost:5173)** e faça login com uma credencial do `users_mock.json`.

> Para encerrar os dois servidores ao mesmo tempo, pressione **`Ctrl+C`** no terminal que executou o `./start.sh`.

> 💡 **Prefere instalar tudo manualmente?** Siga os Passos 1–7 abaixo.

---

### Passo 1 — Clonar o repositório

#### Linux / macOS / Windows (PowerShell)

```bash
git clone https://github.com/devfpedro/idade_digital.git
cd idade_digital
```

---

### Passo 2 — Verificar as ferramentas instaladas

#### 🐧 Linux / macOS

```bash
node --version     # precisa de Node.js 18+ (recomendado LTS)
npm --version
python3 --version  # precisa de Python 3.10+
```

#### 🪟 Windows (CMD / PowerShell)

```bat
node --version
npm --version
python --version
```

---

### Passo 3 — Criar o arquivo de credenciais de teste (obrigatório)

O login valida as credenciais contra `frontend/src/users_mock.json`, que é **local e ignorado pelo Git**. Crie esse arquivo a partir do template versionado:

#### 🐧 Linux / macOS

```bash
cp frontend/src/users_mock.json.example frontend/src/users_mock.json
```

#### 🪟 Windows (CMD)

```bat
copy frontend\src\users_mock.json.example frontend\src\users_mock.json
```

#### 🪟 Windows (PowerShell)

```powershell
Copy-Item frontend\src\users_mock.json.example frontend\src\users_mock.json
```

> As credenciais padrão estão no próprio template (ex.: `pedro.henrique@idade.digital` / `senha-pedro-123`). O arquivo é gitignored e nunca será commitado.

---

### Passo 4 — Instalar as dependências do front-end

#### Linux / macOS / Windows

```bash
cd frontend
npm install
cd ..
```

---

### Passo 5 — Instalar as dependências do back-end (venv + pip)

#### 🐧 Linux / macOS

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r src/requeriments.txt
deactivate
cd ..
```

#### 🪟 Windows (CMD / PowerShell)

```bat
cd backend
python -m venv venv
venv\Scripts\python -m pip install -r src\requeriments.txt
cd ..
```

> No Windows, não é preciso ativar o `venv`: o comando acima já utiliza o `pip` do próprio ambiente virtual, assim como o `start.bat`.

---

### Passo 6 — Iniciar back-end e front-end com um único comando

#### 🐧 Linux / macOS

```bash
chmod +x start.sh   # necessário apenas na primeira vez
./start.sh
```

#### 🪟 Windows (CMD)

```bat
start.bat
```

> No PowerShell, execute `./start.bat` ou dê duplo clique no arquivo `start.bat` pelo Explorador de Arquivos.

O script detecta e instala automaticamente qualquer dependência que ainda falte. Dessa forma, os Passos 4 e 5 podem ser pulados quando a execução for feita pelo script.

#### 🌐 Serviços disponíveis

| Serviço | Endereço |
|---|---|
| **Frontend** | <http://localhost:5173> |
| **Backend** | <http://127.0.0.1:5000/status> |
| **Health** | <http://127.0.0.1:5000/health> |

---

### Passo 7 — Verificar que tudo subiu (opcional)

Abra outro terminal e faça as verificações abaixo.

#### 🐧 Linux / macOS

```bash
curl http://127.0.0.1:5000/status   # espere: {"message":"API funcionando","status":"ok"}
curl -I http://localhost:5173        # espere: HTTP/1.1 200 OK
```

#### 🪟 Windows (CMD)

```bat
curl http://127.0.0.1:5000/status
curl -I http://localhost:5173
```

Depois, abra **[http://localhost:5173](http://localhost:5173)** e faça login com uma credencial do `users_mock.json`.

---

### Encerrar

Pressione **`Ctrl+C`** no terminal do `./start.sh` para encerrar **os dois servidores simultaneamente**.

---

### Alternativa: execução manual (dois terminais)

Caso prefira iniciar cada parte separadamente, utilize dois terminais.

#### Terminal 1 — Back-end (Flask)

**Linux / macOS:**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r src/requeriments.txt
python src/app.py
```

**Windows (CMD / PowerShell):**

```bat
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r src\requeriments.txt
python src/app.py
```

#### Terminal 2 — Front-end (Vite)

```bash
cd frontend
npm install
npm run dev
```

---

## 🔐 Variáveis de ambiente do back-end (opcionais)

| Variável | Padrão | Descrição |
|---|---|---|
| `FLASK_DEBUG` | `true` | Liga/desliga o modo debug do Flask. |
| `FLASK_RELOADER` | `true` | Liga/desliga o auto-reload. O `start.sh` desliga essa opção para evitar processos órfãos. |

---

## 🧪 Scripts de verificação

### Front-end

```bash
cd frontend
npm run lint    # análise estática (ESLint)
npm run build   # build de produção
```

### Back-end

**Linux:**

```bash
backend/venv/bin/python -m py_compile backend/src/app.py
```

**Windows:**

```bat
backend\venv\Scripts\python -m py_compile backend\src\app.py
```

---

## 🔒 Notas de segurança

- 🔐 **`users_mock.json` é gitignored** — as credenciais de teste não são enviadas para o repositório. O arquivo `.example` versionado funciona como template.
- 🌐 **CORS com allowlist explícita** — origens desconhecidas não recebem headers CORS.
- ✅ **Validação em duas camadas** — atributos `required` do HTML e validação em JavaScript para campos vazios, e-mail e senha.
- 🧪 **Autenticação mock para desenvolvimento** — ao integrar o back-end real, o fluxo deverá utilizar hash de senha (**bcrypt/argon2**) e sessão/tokens gerenciados no servidor.

---

## 👥 Colaboradores

Equipe de desenvolvimento responsável pela construção da plataforma:

| Colaborador |
|---|
| **Pedro Henrique** |
| **Gustavo Belizio** |
| **Maria Kamily** |
| **Mateus Roseno** |
| **Laerson Mendes** |

---

<div align="center">

**Projeto Idade Digital**  
*Tecnologia, autonomia e cidadania para a pessoa idosa.*

</div>