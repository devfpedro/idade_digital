import psycopg
from psycopg.rows import dict_row

import config


def getConexao():
    return psycopg.connect(
        dbname=config.DB_NAME,
        user=config.DB_USER,
        password=config.DB_PASSWORD,
        host=config.DB_HOST,
        port=config.DB_PORT,
        connect_timeout=5,
        row_factory=dict_row,
    )
