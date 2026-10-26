class Informacoes:
    def __init__(
        self,
        id,
        nome,
        descricao,
        imagem,
        conteudo="",
        video_url=None,
        artigo_url=None,
        artigo_fonte=None,
        artigo_titulo=None,
        artigo_resumo=None,
    ):
        self.id = id
        self.nome = nome
        self.descricao = descricao
        self.imagem = imagem
        self.conteudo = conteudo
        self.video_url = video_url
        self.artigo_url = artigo_url
        self.artigo_fonte = artigo_fonte
        self.artigo_titulo = artigo_titulo
        self.artigo_resumo = artigo_resumo

    @classmethod
    def de_linha(cls, linha):
        return cls(
            linha["id"],
            linha["nome"],
            linha["descricao"],
            linha["imagem"],
            linha.get("conteudo", ""),
            linha.get("video_url"),
            linha.get("artigo_url"),
            linha.get("artigo_fonte"),
            linha.get("artigo_titulo"),
            linha.get("artigo_resumo"),
        )

    def to_dict(self):
        return {
            "id": self.id,
            "nome": self.nome,
            "descricao": self.descricao,
            "imagem": self.imagem,
            "conteudo": self.conteudo,
            "videoUrl": self.video_url,
            "artigoUrl": self.artigo_url,
            "artigoFonte": self.artigo_fonte,
            "artigoTitulo": self.artigo_titulo,
            "artigoResumo": self.artigo_resumo,
        }
