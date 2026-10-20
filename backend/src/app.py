import os

from flask import Flask, jsonify
from flask_cors import CORS
from helpers.database import getConexao
from models.curso import Curso

app = Flask(__name__)


# Origens autorizadas a chamar a API (frontend Vite em desenvolvimento)
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]

# CORS: aceita requisições do frontend Vite (dev em 5173/4173), com cookies
CORS(
    app,
    resources={r"/*": {"origins": CORS_ORIGINS}},
    supports_credentials=True,
)


@app.route("/status")
def status():
    return {"status": "ok", "message": "API funcionando"}, 200


@app.route("/health")
def health():
    return {"version": "1.0.0"}, 200


def variavel_ambiente_ligada(nome, padrao="true"):
    """Lê uma flag de ambiente do tipo liga/desliga (padrão: ligada)."""
    return os.getenv(nome, padrao).strip().lower() != "false"

def conversao(dados):
    return Curso( dados[0],dados[1],dados[2],dados[3],dados[4])
    

@app.get("/cursos")
def getCursos ():

    try:

        # 1. Estabelecer a conexão
        conexao = getConexao()
        cursor = conexao.cursor()
        cursor.execute("SELECT * FROM cursos;")
        data = cursor.fetchall()

        cursos = [conversao(dado) for dado in data] 

        return cursos, 200

    except Exception as erro:
        print("Erro ao buscar cursos:", erro)
        return []
    finally:
        if conexao:
            conexao.close()

@app.post("/cursos")
def postCursos():
    try:
        # 1. Estabelecer a conexão
        conexao = getConexao()
        cursor = conexao.cursor()
        cursor.execute("INSERT INTO cursos (nome, descricao, categoria, imagem) VALUES (%s, %s, %s, %s);", ("Nome", "Descrição", "Categoria", "Imagem"))
        conexao.commit()

        return {"message": "Curso inserido com sucesso"}, 201

    except Exception as erro:
        print("Erro ao inserir curso:", erro)
        return {"message": "Erro ao inserir curso"}, 500
    finally:
        if conexao:
            conexao.close()

@app.put("/cursos")
def putCursos():
    try:
        # 1. Estabelecer a conexão
        conexao = getConexao()
        cursor = conexao.cursor()
        cursor.execute("UPDATE cursos SET nome = %s, descricao = %s, categoria = %s, imagem = %s WHERE id = %s;", ("Novo Nome", "Nova Descrição", "Nova Categoria", "Nova Imagem", 1))
        conexao.commit()

        return {"message": "Curso atualizado com sucesso"}, 200

    except Exception as erro:
        print("Erro ao atualizar curso:", erro)
        return {"message": "Erro ao atualizar curso"}, 500
    finally:
        if conexao:
            conexao.close()

@app.delete("/cursos")
def deleteCursos():
    try:
        # 1. Estabelecer a conexão
        conexao = getConexao()
        cursor = conexao.cursor()
        cursor.execute("DELETE FROM cursos WHERE id = %s;", (1,))
        conexao.commit()

        return {"message": "Curso deletado com sucesso"}, 200

    except Exception as erro:
        print("Erro ao deletar curso:", erro)
        return {"message": "Erro ao deletar curso"}, 500    
    finally:    
        if conexao:
            conexao.close()
            
@app.get("/informacoes")
def getInfomacoes ():
    try:
        # 1. Estabelecer a conexão
        conexao = getConexao()
        cursor = conexao.cursor()
        cursor.execute("SELECT * FROM informacoes;")
        data = cursor.fetchall()

        return data, 200

    except Exception as erro:
        print("Erro ao buscar informações:", erro)
        return []
    finally:
        if conexao:
            conexao.close()

@app.post("/informacoes")
def postInformacoes ():
    try:
        # 1. Estabelecer a conexão
        conexao = getConexao()
        cursor = conexao.cursor()
        cursor.execute("INSERT INTO informacoes (nome, descricao, imagem) VALUES (%s, %s, %s);", ("Nome", "Descrição", "Imagem"))
        conexao.commit()

        return {"message": "Informações inseridas com sucesso"}, 201

    except Exception as erro:
        print("Erro ao inserir informações:", erro)
        return {"message": "Erro ao inserir informações"}, 500
    finally:
        if conexao:
            conexao.close()

@app.put("/informacoes")
def putInformacoes ():
    try:
        # 1. Estabelecer a conexão
        conexao = getConexao()
        cursor = conexao.cursor()
        cursor.execute("UPDATE informacoes SET nome = %s, descricao = %s, imagem = %s WHERE id = %s;", ("Novo Nome", "Nova Descrição", "Nova Imagem", 1))
        conexao.commit()

        return {"message": "Informações atualizadas com sucesso"}, 200

    except Exception as erro:
        print("Erro ao atualizar informações:", erro)
        return {"message": "Erro ao atualizar informações"}, 500
    finally:
        if conexao:
            conexao.close()

@app.delete("/informacoes")
def deleteInformacoes ():
    try:
        # 1. Estabelecer a conexão
        conexao = getConexao()
        cursor = conexao.cursor()
        cursor.execute("DELETE FROM informacoes WHERE id = %s;", (1,))
        conexao.commit()

        return {"message": "Informações deletadas com sucesso"}, 200

    except Exception as erro:
        print("Erro ao deletar informações:", erro)
        return {"message": "Erro ao deletar informações"}, 500
    finally:
        if conexao:
            conexao.close()
    


def main(arg=None):
    """Inicia o servidor Flask (usado por start.sh / start.bat).



    FLASK_DEBUG=false desliga o modo debug e FLASK_RELOADER=false desliga o
    reloader (o start.sh usa isso para não deixar processos órfãos na porta).
    """
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=variavel_ambiente_ligada("FLASK_DEBUG"),
        use_reloader=variavel_ambiente_ligada("FLASK_RELOADER"),
    )


if __name__ == "__main__":
    main()
