import psycopg

DATABASE = ""
def getConexao():
    conexao = psycopg.connect(
        dbname= DATABASE,
        user="SEU_USUARIO",
        password="SUA_SENHA",
        host="localhost",
        port="5432"
    )
    return conexao