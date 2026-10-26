import json
import secrets
import socket
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent


def criar_env_se_faltar():
    env, exemplo = BACKEND / ".env", BACKEND / ".env.example"
    if env.exists() or not exemplo.exists():
        return
    texto = exemplo.read_text(encoding="utf-8")
    texto = texto.replace("SECRET_KEY=\n", f"SECRET_KEY={secrets.token_hex(32)}\n")
    env.write_text(texto, encoding="utf-8")
    print("[db] backend/.env criado a partir do .env.example.")


criar_env_se_faltar()  # precisa rodar antes de `import config`

import psycopg  # noqa: E402
from werkzeug.security import check_password_hash, generate_password_hash  # noqa: E402

import config  # noqa: E402
from db_provisionar import HOSTS_LOCAIS, provisionar  # noqa: E402
from helpers.database import getConexao  # noqa: E402

# Código de saída lido pelo start.sh/start.bat: PostgreSQL local ausente ou parado
SEM_SERVIDOR = 3
RAIZ = config.RAIZ_BACKEND.parent
ARQUIVOS_USUARIOS = [
    RAIZ / "backend" / "db" / "users_mock.json",
    RAIZ / "backend" / "db" / "users_mock.json.example",
]


def gravar_env(chave, valor):
    env = BACKEND / ".env"
    linhas = env.read_text(encoding="utf-8").splitlines() if env.exists() else []
    novas = [f"{chave}={valor}" if l.startswith(f"{chave}=") else l for l in linhas]
    if not any(l.startswith(f"{chave}=") for l in linhas):
        novas.append(f"{chave}={valor}")
    env.write_text("\n".join(novas) + "\n", encoding="utf-8")


def garantir_senha_banco():
    if config.DB_PASSWORD:
        return
    config.DB_PASSWORD = secrets.token_urlsafe(24)
    gravar_env("DB_PASSWORD", config.DB_PASSWORD)
    print("[db] Senha do banco gerada e guardada em backend/.env.")


def instrucoes_manuais():
    return (
        "[db] Crie o usuário e o banco manualmente, como administrador do PostgreSQL:\n"
        f"       CREATE USER {config.DB_USER} WITH PASSWORD '<a senha de DB_PASSWORD no backend/.env>';\n"
        f"       CREATE DATABASE {config.DB_NAME} OWNER {config.DB_USER};\n"
        "[db] Ou rode em um terminal (o script pergunta a senha do administrador), ou defina\n"
        "[db] PG_ADMIN_USER e PG_ADMIN_PASSWORD no ambiente para a criação automática."
    )


def dicas_instalacao():
    return (
        "[db] O servidor PostgreSQL não está acessível. Instale e inicie-o:\n"
        "       Windows: https://www.postgresql.org/download/windows/ (serviço 'postgresql-x64-NN' em execução)\n"
        "       Linux (Debian/Ubuntu): sudo apt install postgresql && sudo systemctl start postgresql\n"
        "       macOS: brew install postgresql@16 && brew services start postgresql@16"
    )


def servidor_responde():
    """True se algo aceita conexões na porta do PostgreSQL (independe do idioma das mensagens)."""
    try:
        with socket.create_connection((config.DB_HOST, int(config.DB_PORT)), timeout=3):
            return True
    except OSError:
        return False


def garantir_banco_acessivel():
    garantir_senha_banco()
    if not servidor_responde():
        print(
            f"[db] ERRO: o PostgreSQL não está respondendo em {config.DB_HOST}:{config.DB_PORT}.",
            file=sys.stderr,
        )
        print(dicas_instalacao(), file=sys.stderr)
        return SEM_SERVIDOR if config.DB_HOST in HOSTS_LOCAIS else 1
    try:
        getConexao().close()
        return 0
    except psycopg.OperationalError:
        pass  # Servidor no ar mas conexão recusada = usuário/senha/banco ainda não existem

    if not provisionar():
        print(
            "[db] ERRO: o banco não existe e não foi possível criá-lo automaticamente.",
            file=sys.stderr,
        )
        print(instrucoes_manuais(), file=sys.stderr)
        return 1
    try:
        getConexao().close()
    except psycopg.Error as erro:
        print(
            f"[db] ERRO: banco criado, mas a conexão falhou: {str(erro).strip().splitlines()[-1]}",
            file=sys.stderr,
        )
        return 1
    print(f"[db] Usuário e banco '{config.DB_NAME}' criados com sucesso.")
    return 0


def executar_sql(conexao, nome_arquivo):
    caminho = config.RAIZ_BACKEND / "db" / nome_arquivo
    conexao.execute(caminho.read_text(encoding="utf-8"))


def carregar_usuarios():
    for arquivo in ARQUIVOS_USUARIOS:
        if arquivo.exists():
            dados = json.loads(arquivo.read_text(encoding="utf-8"))
            return [
                u
                for u in dados.get("users", [])
                if u.get("email") and u.get("senha") and u.get("nome")
            ]
    return []


PAPEIS_VALIDOS = ("administrador_chefe", "administrador", "organizador", "usuario")


def papel_do_arquivo(u):
    papel = u.get("papel", "usuario")
    return papel if papel in PAPEIS_VALIDOS else "usuario"


def sincronizar_usuarios(conexao):
    for u in carregar_usuarios():
        email = u["email"].strip().lower()
        atual = conexao.execute(
            "SELECT id, senha_hash FROM usuarios WHERE lower(email) = %s", (email,)
        ).fetchone()
        if atual is None:
            conexao.execute(
                "INSERT INTO usuarios (nome, email, senha_hash, papel) VALUES (%s, %s, %s, %s)",
                (
                    u["nome"],
                    email,
                    generate_password_hash(u["senha"]),
                    papel_do_arquivo(u),
                ),
            )
        elif not check_password_hash(atual["senha_hash"], u["senha"]):
            conexao.execute(
                "UPDATE usuarios SET senha_hash = %s WHERE id = %s",
                (generate_password_hash(u["senha"]), atual["id"]),
            )
        # Só pode haver um Administrador Chefe: o do arquivo assume se o posto estiver vago
        if papel_do_arquivo(u) == "administrador_chefe":
            conexao.execute(
                "UPDATE usuarios SET papel = 'administrador_chefe' WHERE lower(email) = %s "
                "AND NOT EXISTS (SELECT 1 FROM usuarios WHERE papel = 'administrador_chefe')",
                (email,),
            )


def main():
    resultado = garantir_banco_acessivel()
    if resultado != 0:
        return resultado
    try:
        with getConexao() as conexao:
            executar_sql(conexao, "schema.sql")
            executar_sql(conexao, "seed.sql")
            sincronizar_usuarios(conexao)
    except psycopg.Error as erro:
        print(f"[db] ERRO ao preparar o banco: {erro}", file=sys.stderr)
        return 1
    print(f"[db] Banco '{config.DB_NAME}' pronto (esquema, dados iniciais e usuários).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
