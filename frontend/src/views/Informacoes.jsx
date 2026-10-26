import { useCallback, useState } from "react";
import { Alert, Button, Card, Col, Container, Form, Modal, Row } from "react-bootstrap";
import Header from "../components/Header";
import Rodape from "../components/Rodape";
import BuscaHero from "../components/BuscaHero";
import EstadoLista from "../components/EstadoLista";
import CampoImagem from "../components/CampoImagem";
import ConfirmarExclusao from "../components/ConfirmarExclusao";
import "../components/Listagem.css";
import { api, urlImagem } from "../services/api";
import { obterSessao } from "../services/auth";
import { PAPEIS_CONTEUDO } from "../services/papeis";
import { useToast } from "../services/toast";
import { miniaturaDoYoutube } from "../services/youtube";
import { useApi } from "../hooks/useApi";
import { useBusca } from "../hooks/useBusca";

const FORM_VAZIO = {
  nome: "", descricao: "", conteudo: "", imagem: "", videoUrl: "",
  artigoUrl: "", artigoFonte: "", artigoTitulo: "", artigoResumo: "",
};

const Informacoes = () => {
  const { termo, setTermo, consulta, buscarAgora } = useBusca();
  const buscar = useCallback((signal) => api.listarInformacoes(consulta, signal), [consulta]);
  const { dados: informacoes, erro, carregando, recarregar } = useApi(buscar);
  const [aberta, setAberta] = useState(null);

  const mostrarToast = useToast();
  const podeEditar = PAPEIS_CONTEUDO.includes(obterSessao()?.papel);
  const [edicao, setEdicao] = useState(null);
  const [exclusao, setExclusao] = useState(null);
  const [erroForm, setErroForm] = useState("");
  const [salvando, setSalvando] = useState(false);

  function abrirNova() {
    setErroForm("");
    setEdicao({ id: null, form: { ...FORM_VAZIO } });
  }

  function abrirEdicao(info) {
    setErroForm("");
    setEdicao({
      id: info.id,
      form: {
        nome: info.nome, descricao: info.descricao, conteudo: info.conteudo || "",
        imagem: info.imagem || "", videoUrl: info.videoUrl || "", artigoUrl: info.artigoUrl || "",
        artigoFonte: info.artigoFonte || "", artigoTitulo: info.artigoTitulo || "",
        artigoResumo: info.artigoResumo || "",
      },
    });
  }

  function alterar(campo, valor) {
    setEdicao((e) => ({ ...e, form: { ...e.form, [campo]: valor } }));
  }

  async function salvar(evento) {
    evento.preventDefault();
    setErroForm("");
    setSalvando(true);
    try {
      if (edicao.id) await api.atualizarInformacao(edicao.id, edicao.form);
      else await api.criarInformacao(edicao.form);
      mostrarToast(edicao.id ? "Informação atualizada." : "Informação criada.", "sucesso", 4000, "✅");
      setEdicao(null);
      recarregar();
    } catch (e) {
      setErroForm(e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    try {
      await api.excluirInformacao(exclusao.id);
      mostrarToast("Informação excluída.", "sucesso", 4000, "✅");
      recarregar();
    } catch (e) {
      mostrarToast(e.message, "erro", 6000, "⚠️");
    } finally {
      setExclusao(null);
    }
  }

  return (
    <div className="main-container">
      <Header />

      <main id="conteudo-principal" tabIndex={-1}>
        <BuscaHero
          titulo="Leia dicas de segurança e proteção"
          subtitulo="Informações úteis para usar redes e dispositivos de forma fácil e segura, evitando golpes online."
          rotulo="Procurar informações"
          placeholder="Procure por informações..."
          valor={termo}
          onChange={setTermo}
          onBuscar={buscarAgora}
        />

        <Container as="section" className="courses-section" aria-label="Lista de informações">
          {podeEditar && (
            <div className="faixa-gestor">
              <span>Você pode adicionar, editar e excluir as informações desta página.</span>
              <Button className="btn-accent" onClick={abrirNova}>+ Nova informação</Button>
            </div>
          )}

          <EstadoLista
            carregando={carregando}
            erro={erro}
            vazio={Boolean(informacoes) && informacoes.length === 0}
            mensagemVazio="Nenhuma informação encontrada para essa busca."
            onTentarDeNovo={recarregar}
          />

          {informacoes && informacoes.length > 0 && (
            <>
              <p className="visually-hidden" role="status">
                {informacoes.length} {informacoes.length === 1 ? "informação encontrada" : "informações encontradas"}
              </p>
              <Row xs={1} sm={2} lg={3} className="g-4">
                {informacoes.map((info) => (
                  <Col key={info.id}>
                    <Card as="article" className="course-card h-100">
                      <div className="course-card-img-wrapper">
                        {info.imagem && (
                          <Card.Img variant="top" src={urlImagem(info.imagem)} alt="" className="course-card-img" loading="lazy" />
                        )}
                        <span className={info.imagem ? "capa-icone" : "course-card-emoji"} aria-hidden="true">🛡️</span>
                      </div>
                      <Card.Body className="d-flex flex-column p-4">
                        <Card.Title as="h2" className="course-title">{info.nome}</Card.Title>
                        <Card.Text className="course-description">{info.descricao}</Card.Text>
                        <Button
                          className="btn-accent w-100 mt-auto"
                          onClick={() => setAberta(info)}
                          aria-label={`Saiba mais sobre: ${info.nome}`}
                        >
                          Saiba mais
                        </Button>
                        {podeEditar && (
                          <div className="acoes-gestao">
                            <Button variant="outline-dark" onClick={() => abrirEdicao(info)} aria-label={`Editar: ${info.nome}`}>Editar</Button>
                            <Button variant="outline-danger" onClick={() => setExclusao(info)} aria-label={`Excluir: ${info.nome}`}>Excluir</Button>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </>
          )}
        </Container>
      </main>

      <Rodape />

      <Modal show={Boolean(aberta)} onHide={() => setAberta(null)} size="xl" centered scrollable>
        <Modal.Header closeButton closeLabel="Fechar">
          <Modal.Title as="h2">{aberta?.nome}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="fw-bold">{aberta?.descricao}</p>
          <div className="conteudo-informacao">{aberta?.conteudo}</div>

          {aberta && (
            <section className="mais-informacoes" aria-labelledby="titulo-mais-info">
              <h3 id="titulo-mais-info" className="mais-informacoes-titulo">
                Mais informações sobre: {aberta.nome}
              </h3>
              <Row className="g-3">
                <Col md={5}>
                  {aberta.videoUrl ? (
                    <a
                      className="video-link"
                      href={aberta.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Assistir ao vídeo sobre ${aberta.nome} no YouTube (abre em outra aba)`}
                    >
                      {miniaturaDoYoutube(aberta.videoUrl) && (
                        <img src={miniaturaDoYoutube(aberta.videoUrl)} alt="" loading="lazy" />
                      )}
                      <span className="video-play" aria-hidden="true">▶</span>
                      <span className="video-legenda">Assistir no YouTube</span>
                    </a>
                  ) : (
                    <div className="video-link video-em-breve">
                      <span aria-hidden="true">🎬</span>
                      <span>Vídeo sobre este assunto em breve</span>
                    </div>
                  )}
                </Col>
                <Col md={7}>
                  {aberta.artigoUrl ? (
                    <a
                      className="artigo-link"
                      href={aberta.artigoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {aberta.artigoFonte && <span className="artigo-fonte">{aberta.artigoFonte}</span>}
                      <span className="artigo-titulo">{aberta.artigoTitulo || "Ler o artigo completo"}</span>
                      {aberta.artigoResumo && <span className="artigo-resumo">{aberta.artigoResumo}</span>}
                      <span className="artigo-acao">Ler o artigo completo (abre em outra aba) →</span>
                    </a>
                  ) : (
                    <div className="artigo-link artigo-em-breve">Artigo de apoio em breve</div>
                  )}
                </Col>
              </Row>
            </section>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button className="btn-accent" onClick={() => setAberta(null)}>Fechar</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(edicao)} onHide={() => setEdicao(null)} centered size="lg" scrollable>
        <Form onSubmit={salvar}>
          <Modal.Header closeButton closeLabel="Fechar">
            <Modal.Title as="h2">{edicao?.id ? "Editar informação" : "Nova informação"}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {erroForm && <Alert variant="danger" role="alert">⚠️ {erroForm}</Alert>}
            {edicao && (
              <>
                <Form.Group className="mb-3" controlId="info-nome">
                  <Form.Label>Título</Form.Label>
                  <Form.Control required maxLength={150} value={edicao.form.nome} onChange={(e) => alterar("nome", e.target.value)} />
                </Form.Group>
                <Form.Group className="mb-3" controlId="info-descricao">
                  <Form.Label>Resumo (aparece no card)</Form.Label>
                  <Form.Control as="textarea" rows={2} required maxLength={2000} value={edicao.form.descricao} onChange={(e) => alterar("descricao", e.target.value)} />
                </Form.Group>
                <Form.Group className="mb-3" controlId="info-conteudo">
                  <Form.Label>Texto completo</Form.Label>
                  <Form.Control as="textarea" rows={6} maxLength={20000} value={edicao.form.conteudo} onChange={(e) => alterar("conteudo", e.target.value)} />
                </Form.Group>
                <CampoImagem id="info-imagem" rotulo="Capa do card (fica atrás do ícone)" valor={edicao.form.imagem} onChange={(v) => alterar("imagem", v)} />
                <Form.Group className="mb-3" controlId="info-video">
                  <Form.Label>Link do vídeo no YouTube</Form.Label>
                  <Form.Control type="url" maxLength={500} placeholder="https://www.youtube.com/watch?v=..." value={edicao.form.videoUrl} onChange={(e) => alterar("videoUrl", e.target.value)} />
                </Form.Group>
                <fieldset className="mb-2">
                  <legend className="fs-6 fw-bold">Artigo ou notícia de apoio</legend>
                  <Form.Group className="mb-3" controlId="info-artigo-url">
                    <Form.Label>Link do artigo</Form.Label>
                    <Form.Control type="url" maxLength={500} value={edicao.form.artigoUrl} onChange={(e) => alterar("artigoUrl", e.target.value)} />
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="info-artigo-fonte">
                    <Form.Label>Fonte (ex.: Febraban)</Form.Label>
                    <Form.Control maxLength={80} value={edicao.form.artigoFonte} onChange={(e) => alterar("artigoFonte", e.target.value)} />
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="info-artigo-titulo">
                    <Form.Label>Título do artigo</Form.Label>
                    <Form.Control maxLength={200} value={edicao.form.artigoTitulo} onChange={(e) => alterar("artigoTitulo", e.target.value)} />
                  </Form.Group>
                  <Form.Group controlId="info-artigo-resumo">
                    <Form.Label>Resumo do artigo</Form.Label>
                    <Form.Control as="textarea" rows={3} maxLength={1000} value={edicao.form.artigoResumo} onChange={(e) => alterar("artigoResumo", e.target.value)} />
                  </Form.Group>
                </fieldset>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-dark" onClick={() => setEdicao(null)}>Cancelar</Button>
            <Button type="submit" className="btn-accent" disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <ConfirmarExclusao
        mostrar={Boolean(exclusao)}
        titulo="Excluir informação"
        mensagem={<>Tem certeza de que deseja excluir <strong>{exclusao?.nome}</strong>? Ela deixará de aparecer na página.</>}
        onConfirmar={excluir}
        onCancelar={() => setExclusao(null)}
      />
    </div>
  );
};

export default Informacoes;
