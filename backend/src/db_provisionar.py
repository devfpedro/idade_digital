import getpass
import os
import re
import shutil
import subprocess
import sys

import psycopg
from psycopg import sql

import config

IDENTIFICADOR = re.compile(r"^[A-Za-z_][A-Za-z0-9_]{0,62}$")
HOSTS_LOCAIS = ("localhost", "127.0.0.1", "::1")
MAX_TENTATIVAS_SENHA = 3


def _comandos():
    """SELECTs que devolvem (ou não) o comando a executar: torna tudo idempotente."""
    u, s, b = (
        sql.Literal(v) for v in (config.DB_USER, config.DB_PASSWORD, config.DB_NAME)
    )
    return [
        sql.SQL(
            "SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', {u}::text, {s}::text) "
            "WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = {u})"
        ).format(u=u, s=s),
        sql.SQL(
            "SELECT format('ALTER ROLE %I PASSWORD %L', {u}::text, {s}::text) "
            "WHERE EXISTS (SELECT 1 FROM pg_roles WHERE rolname = {u})"
        ).format(u=u, s=s),
        sql.SQL(
            "SELECT format('CREATE DATABASE %I OWNER %I', {b}::text, {u}::text) "
            "WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = {b})"
        ).format(u=u, b=b),
    ]


def _via_psycopg(**credenciais):
    with psycopg.connect(
        dbname="postgres",
        port=config.DB_PORT,
        autocommit=True,
        connect_timeout=5,
        **credenciais,
    ) as conexao:
        for comando in _comandos():
            linha = conexao.execute(comando).fetchone()
            if linha:
                conexao.execute(linha[0])


def _via_sudo_psql():
    script = "".join(c.as_string(None) + "\n\\gexec\n" for c in _comandos())
    subprocess.run(
        [
            "sudo",
            "-u",
            "postgres",
            "psql",
            "-X",
            "-q",
            "-v",
            "ON_ERROR_STOP=1",
            "-p",
            str(config.DB_PORT),
            "-d",
            "postgres",
            "-f",
            "-",
        ],
        input=script,
        text=True,
        check=True,
    )


def _administrador_do_ambiente():
    usuario = os.getenv("PG_ADMIN_USER", "postgres")
    try:
        _via_psycopg(
            host=config.DB_HOST,
            user=usuario,
            password=os.getenv("PG_ADMIN_PASSWORD", ""),
        )
        return True
    except psycopg.Error as erro:
        print(
            f"[db] Falha com PG_ADMIN_USER/PG_ADMIN_PASSWORD: {_resumo(erro)}",
            file=sys.stderr,
        )
        return False


def _resumo(erro):
    linhas = str(erro).strip().splitlines()
    return linhas[-1] if linhas else repr(erro)


def _administrador_por_pergunta():
    usuario = (
        input("[db] Usuário administrador do PostgreSQL [postgres]: ").strip()
        or "postgres"
    )
    for tentativa in range(1, MAX_TENTATIVAS_SENHA + 1):
        senha = getpass.getpass(
            f"[db] Senha de '{usuario}' (não será exibida nem gravada): "
        )
        try:
            _via_psycopg(host=config.DB_HOST, user=usuario, password=senha)
            return True
        except psycopg.OperationalError as erro:
            # Conexão recusada: quase sempre senha/usuário incorretos (a mensagem varia com o idioma)
            print(
                f"[db] Não foi possível autenticar ({tentativa}/{MAX_TENTATIVAS_SENHA}): {_resumo(erro)}",
                file=sys.stderr,
            )
        except psycopg.Error as erro:
            print(
                f"[db] O administrador não conseguiu criar o banco: {_resumo(erro)}",
                file=sys.stderr,
            )
            return False
    return False


def provisionar():
    for nome, valor in (("DB_USER", config.DB_USER), ("DB_NAME", config.DB_NAME)):
        if not IDENTIFICADOR.match(valor):
            print(
                f"[db] {nome}='{valor}' inválido: use letras, números e _ (sem espaços).",
                file=sys.stderr,
            )
            return False

    if os.getenv("PG_ADMIN_USER") or os.getenv("PG_ADMIN_PASSWORD"):
        return _administrador_do_ambiente()

    if not sys.stdin.isatty():
        return False  # sem terminal não há como perguntar

    local = config.DB_HOST in HOSTS_LOCAIS
    print(
        f"[db] O banco '{config.DB_NAME}' (usuário '{config.DB_USER}') ainda não existe.\n"
        "[db] Vou criá-lo agora. Para isso é preciso, uma única vez, a autorização de um\n"
        "[db] administrador do PostgreSQL (a senha dele não é guardada pelo projeto)."
    )

    if local and os.name != "nt":
        try:
            _via_psycopg(user=getpass.getuser())  # socket local, sem senha
            return True
        except psycopg.Error:
            pass
        if (
            sys.platform.startswith("linux")
            and shutil.which("sudo")
            and shutil.which("psql")
        ):
            print(
                "[db] Vou usar 'sudo' para falar com o PostgreSQL (digite a senha do SEU usuário do sistema)."
            )
            try:
                _via_sudo_psql()
                return True
            except (subprocess.CalledProcessError, OSError):
                print(
                    "[db] Não foi possível usar o sudo; tentando com usuário e senha do PostgreSQL."
                )

    return _administrador_por_pergunta()
