class Curso:
    def __init__(
        self,
        id,
        nome,
        descricao,
        categoria,
        imagem,
        qtd_modulos=0,
        modulos_concluidos=0,
    ):
        self.id = id
        self.nome = nome
        self.descricao = descricao
        self.categoria = categoria
        self.imagem = imagem
        self.qtd_modulos = qtd_modulos
        self.modulos_concluidos = modulos_concluidos

    @classmethod
    def de_linha(cls, linha):
        return cls(
            linha["id"],
            linha["nome"],
            linha["descricao"],
            linha["categoria"],
            linha["imagem"],
            linha.get("qtd_modulos", 0),
            linha.get("modulos_concluidos", 0),
        )

    def to_dict(self):
        return {
            "id": self.id,
            "nome": self.nome,
            "descricao": self.descricao,
            "categoria": self.categoria,
            "imagem": self.imagem,
            "qtdModulos": self.qtd_modulos,
            "modulosConcluidos": self.modulos_concluidos,
        }
