import { useCallback, useState } from "react";
import { Alert, Badge, Button, Card, Col, Container, Form, Modal, Row } from "react-bootstrap";
import { Link } from "react-router-dom";
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
import { useApi } from "../hooks/useApi";
import { useBusca } from "../hooks/useBusca";

const ICONES = {
  Celular: "📱",
  WhatsApp: "💬",
  Internet: "🌐",
  Computador: "💻",
  Segurança: "🛡️",
};

function iconeDoCurso(categoria) {
  return ICONES[categoria] || "🎓";
}

const Cursos = () => {
  const { termo, setTermo, consulta, buscarAgora } = useBusca();
  const buscar = useCallback((signal) => api.listarCursos(consulta, signal), [consulta]);
  const { dados: cursos, erro, carregando, recarregar } = useApi(buscar);

  const mostrarToast = useToast();
  const podeEditar = PAPEIS_CONTEUDO.includes(obterSessao()?.papel);
  const [novo, setNovo] = useState(null);
  const [exclusao, setExclusao] = useState(null);
  const [erroForm, setErroForm] = useState("");
  const [salvando, setSalvando] = useState(false);

  function abrirNovo() {
    setErroForm("");
    setNovo({ nome: "", descricao: "", categoria: "", imagem: "" });
  }

  async function criar(evento) {
    evento.preventDefault();
    setErroForm("");
    setSalvando(true);
    try {
      await api.criarCurso(novo);
      mostrarToast("Curso criado. Agora adicione os módulos.", "sucesso", 5000, "✅");
      setNovo(null);
      recarregar();
    } catch (e) {
      setErroForm(e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    try {
      await api.excluirCurso(exclusao.id);
      mostrarToast("Curso excluído.", "sucesso", 4000, "✅");
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
          titulo="Encontre o curso ideal para você"
          subtitulo="Explore cursos de introdução às novas tecnologias e aprenda no seu ritmo."
          rotulo="Buscar cursos"
          placeholder="Buscar cursos..."
          valor={termo}
          onChange={setTermo}
          onBuscar={buscarAgora}
        />

        <Container as="section" className="courses-section" aria-label="Lista de cursos">
          {podeEditar && (
            <div className="faixa-gestor">
              <span>Você pode criar e excluir cursos.</span>
              <Button className="btn-accent" onClick={abrirNovo}>+ Novo curso</Button>
            </div>
          )}

          <EstadoLista
            carregando={carregando}
            erro={erro}
            vazio={Boolean(cursos) && cursos.length === 0}
            mensagemVazio="Nenhum curso encontrado para essa busca."
            onTentarDeNovo={recarregar}
          />

          {cursos && cursos.length > 0 && (
            <>
              <p className="visually-hidden" role="status">
                {cursos.length} {cursos.length === 1 ? "curso encontrado" : "cursos encontrados"}
              </p>
              <Row xs={1} sm={2} lg={3} className="g-4">
                {cursos.map((curso) => (
                  <Col key={curso.id}>
                    <Card as="article" className="course-card h-100">
                      <div className="course-card-img-wrapper">
                        {curso.imagem && (
                          <Card.Img variant="top" src={urlImagem(curso.imagem)} alt="" className="course-card-img" loading="lazy" />
                        )}
                        <span className={curso.imagem ? "capa-icone" : "course-card-emoji"} aria-hidden="true">
                          {iconeDoCurso(curso.categoria)}
                        </span>
                      </div>

                      <Card.Body className="d-flex flex-column p-4">
                        <Badge bg="" className="course-badge align-self-start mb-3">
                          {curso.categoria}
                        </Badge>
                        <Card.Title as="h2" className="course-title">{curso.nome}</Card.Title>
                        <Card.Text className="course-description">{curso.descricao}</Card.Text>

                        <div className="course-meta mt-auto">
                          <span>Módulos: {curso.qtdModulos}</span>
                          <span>Concluídos: {curso.modulosConcluidos}</span>
                        </div>

                        <Button
                          as={Link}
                          to={`/cursos/${curso.id}`}
                          className="btn-accent w-100 mt-3"
                          aria-label={`Abrir o curso ${curso.nome}`}
                        >
                          Abrir curso
                        </Button>
                        {podeEditar && (
                          <div className="acoes-gestao">
                            <Button variant="outline-danger" onClick={() => setExclusao(curso)} aria-label={`Excluir o curso ${curso.nome}`}>
                              Excluir curso
                            </Button>
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

      <Modal show={Boolean(novo)} onHide={() => setNovo(null)} centered>
        <Form onSubmit={criar}>
          <Modal.Header closeButton closeLabel="Fechar"><Modal.Title as="h2">Novo curso</Modal.Title></Modal.Header>
          <Modal.Body>
            {erroForm && <Alert variant="danger" role="alert">⚠️ {erroForm}</Alert>}
            {novo && (
              <>
                <Form.Group className="mb-3" controlId="novo-curso-nome">
                  <Form.Label>Nome do curso</Form.Label>
                  <Form.Control required maxLength={150} value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
                </Form.Group>
                <Form.Group className="mb-3" controlId="novo-curso-descricao">
                  <Form.Label>Descrição</Form.Label>
                  <Form.Control as="textarea" rows={3} required maxLength={2000} value={novo.descricao} onChange={(e) => setNovo({ ...novo, descricao: e.target.value })} />
                </Form.Group>
                <Form.Group className="mb-3" controlId="novo-curso-categoria">
                  <Form.Label>Tema (ex.: Celular, WhatsApp, Internet)</Form.Label>
                  <Form.Control required maxLength={60} value={novo.categoria} onChange={(e) => setNovo({ ...novo, categoria: e.target.value })} />
                </Form.Group>
                <CampoImagem id="novo-curso-imagem" rotulo="Capa do card (opcional)" valor={novo.imagem} onChange={(v) => setNovo({ ...novo, imagem: v })} />
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-dark" onClick={() => setNovo(null)}>Cancelar</Button>
            <Button type="submit" className="btn-accent" disabled={salvando}>{salvando ? "Salvando..." : "Criar curso"}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <ConfirmarExclusao
        mostrar={Boolean(exclusao)}
        titulo="Excluir curso"
        mensagem={<>Tem certeza de que deseja excluir o curso <strong>{exclusao?.nome}</strong>? Todos os módulos, conteúdos e o progresso das pessoas neste curso serão apagados. Esta ação não pode ser desfeita.</>}
        onConfirmar={excluir}
        onCancelar={() => setExclusao(null)}
      />
    </div>
  );
};

export default Cursos;
