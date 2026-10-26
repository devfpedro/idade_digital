<div align="center">

# 👴 Idade Digital

### Inclusão Digital para a Pessoa Idosa: Promovendo Autonomia e Cidadania por Meio da Tecnologia

**Uma plataforma web voltada ao ensino tecnológico e ao letramento digital de pessoas com mais de 60 anos.**

[![React](https://img.shields.io/badge/React.js-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

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
  - [Passo 3 — Criar as credenciais de teste](#passo-3--criar-o-arquivo-de-credenciais-de-teste-opcional)
  - [Passo 4 — Instalar as dependências do front-end](#passo-4--instalar-as-dependências-do-front-end)
  - [Passo 5 — Instalar as dependências do back-end](#passo-5--instalar-as-dependências-do-back-end-venv--pip)
  - [Passo 6 — Iniciar a aplicação](#passo-6--iniciar-backend-e-frontend-com-um-único-comando)
  - [Passo 7 — Verificar a execução](#passo-7--verificar-que-tudo-subiu-outro-terminal-opcional)
  - [Encerrar](#encerrar)
  - [Execução manual](#alternativa-execução-manual-dois-terminais)
- [🔐 Variáveis de ambiente](#-variáveis-de-ambiente-do-backend-opcionais)
- [🧪 Testes](#-testes)
- [🔒 Notas de segurança](#-notas-de-segurança)
- [👥 Colaboradores](#-colaboradores)

---

## 🛠️ Tecnologias utilizadas

| Camada | Tecnologia |
|---|---|
| **Front-end** | React.js 19 + Vite 8 |
| **Back-end** | Python 3 + Flask 3 + Flask-CORS + psycopg 3 |
| **Banco de dados** | PostgreSQL 14+ |
| **Leitura em voz** | Piper TTS (voz neural em português, local) |

---

## ✨ Funcionalidades atuais

- 🔐 **Login pela API com PostgreSQL** — e-mail e senha validados no servidor (senha em hash); os usuários da equipe vêm do `backend/db/users_mock.json` (local, gitignored) na criação do banco.
- 🎓 **Cursos, módulos e informações vindos do banco**, com busca sem acento e **progresso por pessoa**.
- 🧩 **Cursos em módulos** — cada módulo só é liberado ao concluir o anterior; a plataforma detecta sozinha a conclusão (texto lido até o fim, link aberto, vídeo assistido).
- 👥 **Níveis de usuário** — *Administrador Chefe* (único; gerencia todos), *Administrador* (gerencia organizadores e usuários), *Organizador* (gerencia usuários) e *Usuário* (somente consulta). A gestão fica em “Meu menu → Gerenciar usuários”. O nível de cada conta da equipe vem do campo `papel` do `users_mock.json`.
- 🗣️ **Leitura em voz natural** — voz neural **Faber** em português (Piper TTS), com pausas entre os elementos da página e velocidade ajustável (Rápido, Normal e Devagar; padrão: Normal), gerada no próprio servidor, igual em Windows, macOS e Linux e sem enviar texto para a internet; se indisponível, usa a voz do navegador.
- ✏️ **Edição de conteúdo pela própria plataforma** — Administrador Chefe e Administradores criam, editam e excluem informações (com capa e links de vídeo/artigo), módulos e conteúdos dos cursos. Imagens enviadas ficam em `backend/uploads/` (ignorado pelo Git).
- 🤝 **Equipe e Parceiros** — integrantes (com foto e perfil do GitHub), parceiros e colaboradores externos, cadastrados no banco por Administrador Chefe e Administradores.
- ♿ **Acessibilidade** — leitura em voz alta, aumento da letra, alto contraste, paleta para daltonismo, redução de movimentos, link “pular para o conteúdo” e foco visível.
- ⏱️ **Sessão com expiração por inatividade (30 minutos)** — cliques, digitação, toques e rolagem renovam o tempo. Ao expirar (ou ao reabrir o site depois do prazo), um aviso fica na tela por alguns segundos antes do login. O tempo restante aparece em “Meu menu”.
- 🧹 **Tratamento de dados corrompidos** — sessões inválidas armazenadas no `localStorage` são descartadas sem interromper a aplicação.
- 🏠 **Início acessível (público 60+)** — boas-vindas, atalhos grandes para **Cursos** e **Informações** e explicação de como a plataforma funciona.
- 👤 **Meu menu** — canto superior direito, com Informações Pessoais, Suporte, Notificações, Gerenciar usuários (só para quem tem permissão), Sair e o tempo de sessão restante.
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
- [PostgreSQL](https://www.postgresql.org/) — versão **14 ou superior** (veja “Banco de dados” abaixo)

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
chmod +x start.sh
./start.sh
```

#### 🪟 Windows (CMD)

```bat
git clone https://github.com/devfpedro/idade_digital.git
cd idade_digital
.\start.bat
```

### O que o script faz automaticamente?

1. Confere o Node.js (o Vite 8 exige `^20.19` ou `>=22.12`).
2. Copia `backend/db/users_mock.json.example` para `backend/db/users_mock.json` (contas de teste) se o arquivo não existir.
3. Instala o front-end (`npm install`) e repara dependências que faltem.
4. Procura um Python 3.10+ com a biblioteca padrão íntegra (`tempfile`, `venv`, `ensurepip`; no Windows, também pelo launcher `py`), cria o ambiente virtual do back-end (`venv`, recriado se estiver quebrado) e instala as dependências com `pip`.
5. Baixa a voz de leitura (Piper), cria o `backend/.env` e prepara o banco (veja “Banco de dados”).
6. Confere se as portas 5000 e 5173 estão livres e aguarda o back-end responder antes de abrir o front-end.
7. Inicia o **back-end** em `http://127.0.0.1:5000` e o **front-end** em `http://localhost:5173` simultaneamente.

Depois, abra **[http://localhost:5173](http://localhost:5173)** e faça login com uma credencial do `backend/db/users_mock.json`.

#### Faltou Node.js, Python ou PostgreSQL?

Esses três são programas **externos** ao projeto (ficam instalados no computador, fora da pasta do projeto). Se algum faltar, o script explica qual é e para que serve, informa o espaço em disco e pergunta, com **uma tecla**, se deve instalar: **`s`** para sim, **`n`** para não.

| Dependência | Download | Em disco | Observação |
|---|---|---|---|
| Node.js LTS | ~32 MB | ~100 MB | no Windows pede permissão de administrador (UAC) |
| Python 3.14 | ~32 MB | ~165 MB | instalação só para o seu usuário |
| PostgreSQL 16 | ~386 MB | ~250 MB (servidor e ferramentas) | o pgAdmin e o Stack Builder, opcionais no assistente, ocupam mais; no Windows o assistente abre e você define e **anota** a senha do usuário `postgres` (o script a pede uma vez para criar o banco e não a grava) |

- **Windows:** usa o `winget`. **Linux/macOS:** usa o gerenciador de pacotes (`apt`, `dnf`, `pacman`, `zypper` ou Homebrew), com `sudo`; os valores no Linux/macOS são aproximados. No `apt`/`dnf` o Node.js vem do repositório NodeSource, porque o Node das distribuições costuma ser antigo demais para o Vite 8.
- Se o PostgreSQL já estiver instalado mas **parado**, o script avisa e oferece iniciar o serviço.
- Para responder sem tecla (automação), defina `INSTALAR_DEPENDENCIAS=s` ou `n`. Sem terminal interativo a resposta é `n`.
- Quem recusa (`n`) continua como antes: o script mostra o link de instalação manual e, sem o PostgreSQL, o frontend abre mas login e cursos não funcionam.

> Para encerrar os dois servidores ao mesmo tempo, pressione **`Ctrl+C`** no terminal que executou o `./start.sh`. No Windows, veja “Encerrar” mais abaixo.

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
node --version     # precisa de Node.js 20.19+ ou 22.12+ (recomendado LTS)
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

### Passo 3 — Criar o arquivo de credenciais de teste (opcional)

Os scripts `start.sh`/`start.bat` já fazem isto sozinhos. Para criar à mão, a partir do template versionado (o arquivo real é **local e ignorado pelo Git**):

#### 🐧 Linux / macOS

```bash
cp backend/db/users_mock.json.example backend/db/users_mock.json
```

#### 🪟 Windows (CMD)

```bat
copy backend\db\users_mock.json.example backend\db\users_mock.json
```

#### 🪟 Windows (PowerShell)

```powershell
Copy-Item backend\db\users_mock.json.example backend\db\users_mock.json
```

> O template traz uma conta de cada nível (Administrador Chefe, Administrador, Organizador e Usuário) além das contas da equipe; e-mails e senhas ficam no próprio arquivo. Esse arquivo só é lido pelo back-end ao criar o banco.

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

Depois, abra **[http://localhost:5173](http://localhost:5173)** e faça login com uma credencial do `backend/db/users_mock.json`.

---

### Encerrar

#### 🐧 Linux / macOS

Pressione **`Ctrl+C`** no terminal do `./start.sh` para encerrar **os dois servidores simultaneamente**.

#### 🪟 Windows (CMD)

No terminal do `start.bat`, pressione **`Ctrl+C`**: o CMD pergunta “Deseja finalizar o arquivo em lotes?”. Responda **`S`** para sair e **`N`** para continuar (o script reinicia o front-end).

> O back-end do `start.bat` roda em segundo plano (`start /b`) e **ignora o `Ctrl+C`**. Ao responder `S`, ele pode continuar ativo na porta 5000. Não há problema: na próxima execução o `start.bat` encontra esse back-end (reconhecido pelo caminho do `app.py` do próprio projeto) e o encerra sozinho. Para encerrá-lo na hora, abra o PowerShell e rode `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*backend\src\app.py*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`.
>
> Se o front-end falhar três vezes seguidas ao iniciar (por exemplo, porta 5173 ocupada ou dependência faltando), o `start.bat` desiste com uma mensagem de erro e encerra o back-end.

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

## 🗄️ Banco de dados (PostgreSQL)

Basta ter o **PostgreSQL 14+ instalado e em execução**. O restante é automático: ao rodar `start.sh`/`start.bat`, o script cria o `backend/.env`, gera uma senha forte para o banco, cria o usuário e o banco `idade_digital`, aplica o esquema e os dados iniciais e cadastra os usuários.

Na **primeira execução** (e só nela) é preciso autorizar a criação do banco com um administrador do PostgreSQL:

| Sistema | O que acontece |
|---|---|
| **Windows** | O script pergunta o usuário (`postgres`) e a senha definidos na instalação do PostgreSQL. |
| **Linux** | O script usa `sudo` (digite a senha do seu usuário do sistema); se não der, pergunta usuário e senha do PostgreSQL. |
| **macOS (Homebrew)** | Normalmente nada é perguntado; senão, pergunta usuário e senha do PostgreSQL. |

A senha do administrador **nunca é gravada**: é usada só na hora de criar o banco. Nas execuções seguintes nada é perguntado.

**Servidor / automação (sem terminal):** defina `PG_ADMIN_USER` (padrão `postgres`) e `PG_ADMIN_PASSWORD` no ambiente para a criação automática, ou use um banco já provisionado informando `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` e `DB_PASSWORD` no `backend/.env`.

Tabelas: `usuarios`, `cursos`, `modulos`, `conteudos`, `progresso_conteudo`, `progresso_modulo`, `informacoes`, `colaboradores` e `controle_seed`. Buscas ignoram acentos e maiúsculas (`unaccent` + `pg_trgm`). Sem banco acessível, o front abre, mas login e cursos não funcionam.

## 🔐 Variáveis de ambiente do back-end

Definidas em `backend/.env` (modelo em `backend/.env.example`):

| Variável | Padrão | Descrição |
|---|---|---|
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` | `localhost` / `5432` / `idade_digital` / `idade_digital` | Conexão com o PostgreSQL. |
| `DB_PASSWORD` | gerada pelo script | Senha do usuário do banco (em branco = o script gera e grava no `.env`). |
| `PG_ADMIN_USER` / `PG_ADMIN_PASSWORD` | `postgres` / — | Opcionais: administrador usado só para criar o banco sem perguntar (automação). Nunca são gravados. |
| `SECRET_KEY` | gerada pelo script | Assina os tokens de login. Sem ela, os logins caem ao reiniciar. |
| `TOKEN_HORAS` | `8` | Validade do token (a inatividade de 30 min é controlada no front). |
| `VOZ_PIPER` | `faber,cadu,jeff` | Vozes neurais da leitura em voz alta. A **Faber** é a padrão; `cadu` e `jeff` estão em teste. Cada uma é baixada uma vez (~60 MB) para `backend/voz_modelos/`. |
| `FLASK_DEBUG` | `false` | `true` liga o modo debug do Flask (expõe o depurador; só em desenvolvimento local). |
| `FLASK_RELOADER` | `true` | Liga/desliga o auto-reload. Os scripts de início desligam essa opção para evitar processos órfãos. |

---

## 🧪 Testes

Os comandos de teste usam apenas o Python do próprio `venv` e funcionam em **Linux, macOS e Windows**; só muda o caminho do interpretador: `venv/bin/python` (Linux/macOS) ou `venv\Scripts\python` (Windows). Nenhum deles é exclusivo do Linux.

### O que é preciso antes de rodar

1. **PostgreSQL em execução** e o projeto iniciado **ao menos uma vez** com `start.sh`/`start.bat`: é isso que cria o `venv`, o `backend/.env`, o banco e as contas de teste (`backend/db/users_mock.json`).
2. Use **somente um banco de desenvolvimento**: os testes criam e apagam registros `ZZ-Teste` / `zz.teste.*`.
3. Os testes de **leitura em voz** são ignorados automaticamente se a voz (Piper) não estiver instalada.
4. O **teste de estresse** precisa do projeto rodando (`./start.sh` ou `start.bat` em outro terminal).

### Back-end — testes automatizados (64 testes, ~1 min)

Cobrem login e segurança, níveis de usuário, cursos e módulos, informações, uploads, equipe e voz. Rode de dentro da pasta `backend`:

🐧 **Linux / macOS**

```bash
cd backend
venv/bin/python -m unittest discover -s tests -t . -v
```

🪟 **Windows (CMD)**

```bat
cd backend
venv\Scripts\python -m unittest discover -s tests -t . -v
```

🪟 **Windows (PowerShell)**

```powershell
cd backend
.\venv\Scripts\python -m unittest discover -s tests -t . -v
```

Para rodar só um arquivo: acrescente o nome do módulo, por exemplo `tests.test_niveis_de_usuario`, no lugar de `discover -s tests -t .`.

### Back-end — teste de estresse e concorrência

Simula leituras simultâneas, pico de logins, 300 requisições ao mesmo tempo, escritas concorrentes (módulos, exclusões, conclusão de conteúdo, e-mail duplicado), síntese de voz, entradas hostis e carga mista. Na **raiz do projeto**, com o servidor rodando:

```bash
# Linux / macOS
backend/venv/bin/python backend/tests/estresse.py --rapido
```

```bat
:: Windows (CMD)
backend\venv\Scripts\python backend\tests\estresse.py --rapido
```

Sem `--rapido` a carga é o dobro. Use `--base http://127.0.0.1:5000` para apontar para outro endereço. O servidor do `start.sh` é o de desenvolvimento do Flask: os números servem para achar erros, não como medida de produção.

### Front-end

```bash
cd frontend
npm run lint    # análise estática (ESLint)
npm run build   # build de produção
```

### Verificação rápida de sintaxe do back-end

🐧 `backend/venv/bin/python -m py_compile backend/src/app.py`  ·  🪟 `backend\venv\Scripts\python -m py_compile backend\src\app.py`

---

## 🔒 Notas de segurança

- 🔐 **`backend/db/users_mock.json` é gitignored** — as credenciais de teste não são enviadas para o repositório. O `.example` versionado é o template e serve apenas de fonte para criar os usuários no banco.
- 🔑 **Login pela API** — senhas guardadas com hash (scrypt), token assinado com expiração, limite de tentativas por e-mail/IP e mensagem de erro genérica (não revela se o e-mail existe).
- 🌐 **CORS com allowlist explícita** — origens desconhecidas não recebem headers CORS.
- ✅ **Validação no navegador e no servidor** — o servidor valida todo corpo recebido e recusa o que não for esperado; uploads são checados pelo conteúdo do arquivo.

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