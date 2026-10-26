import { useCallback, useState } from "react";
import { Alert, Badge, Button, Container, Form, Modal } from "react-bootstrap";
import { Link, useParams } from "react-router-dom";
import Header from "../components/Header";
import Rodape from "../components/Rodape";
import EstadoLista from "../components/EstadoLista";
import CampoImagem from "../components/CampoImagem";
import ConfirmarExclusao from "../components/ConfirmarExclusao";
import "../components/Listagem.css";
import { api } from "../services/api";
import { obterSessao } from "../services/auth";
import { PAPEIS_CONTEUDO } from "../services/papeis";
import { useToast } from "../services/toast";
import { useApi } from "../hooks/useApi";

const SITUACOES = {
  concluido: { icone: "✅", rotulo: "Concluído", acao: "Revisar módulo" },
  disponivel: { icone: "▶️", rotulo: "Disponível", acao: "Abrir módulo" },
  bloqueado: { icone: "🔒", rotulo: "Bloqueado", acao: "" },
};

const CursoDetalhe = () => {
  const { id } = useParams();
  const buscar = useCallback((signal) => api.obterCurso(id, signal), [id]);
  const { dados, erro, carregando, recarregar } = useApi(buscar);
  const curso = dados && String(dados.id) === id ? dados : null;

  const mostrarToast = useToast();
  const podeEditar = PAPEIS_CONTEUDO.includes(obterSessao()?.papel);
  const [formCurso, setFormCurso] = useState(null);
  const [formModulo, setFormModulo] = useState(null);
  const [exclusao, setExclusao] = useState(null);
  const [erroForm, setErroForm] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function executar(acao, mensagem, aoConcluir) {
    setErroForm("");
    setSalvando(true);
    try {
      await acao();
      mostrarToast(mensagem, "sucesso", 4000, "✅");
      aoConcluir();
      recarregar();
    } catch (e) {
      setErroForm(e.message);
    } finally {
      setSalvando(false);
    }
  }

  function abrirCurso() {
    setErroForm("");
    setFormCurso({ nome: curso.nome, descricao: curso.descricao, categoria: curso.categoria, imagem: curso.imagem || "" });
  }

  function abrirModulo(modulo) {
    setErroForm("");
    setFormModulo(modulo ? { ordem: modulo.ordem, titulo: modulo.titulo, descricao: modulo.descricao } : { ordem: null, titulo: "", descricao: "" });
  }

  function salvarCurso(evento) {
    evento.preventDefault();
    executar(() => api.atualizarCurso(curso.id, formCurso), "Curso atualizado.", () => setFormCurso(null));
  }

  function salvarModulo(evento) {
    evento.preventDefault();
    const { ordem, titulo, descricao } = formModulo;
    executar(
      () => (ordem ? api.atualizarModulo(curso.id, ordem, { titulo, descricao }) : api.criarModulo(curso.id, { titulo, descricao })),
      ordem ? "Módulo atualizado." : "Módulo criado.",
      () => setFormModulo(null),
    );
  }

  async function excluirModulo() {
    try {
      await api.excluirModulo(curso.id, exclusao.ordem);
      mostrarToast("Módulo excluído.", "sucesso", 4000, "✅");
      recarregar();
    } catch (e) {
      mostrarToast(e.message, "erro", 6000, "⚠️");
    } finally {
      setExclusao(null);
    }
  }

  const percentual =
    curso && curso.qtdModulos > 0
      ? Math.round((curso.modulosConcluidos / curso.qtdModulos) * 100)
      : 0;

  return (
    <div className="main-container">
      <Header />

      <main id="conteudo-principal" tabIndex={-1}>
        <section className="hero text-center" aria-labelledby="titulo-pagina">
          <Container>
            <h1 id="titulo-pagina" className="hero-title" tabIndex={-1}>
              {curso ? curso.nome : "Curso"}
            </h1>
            {curso && <p className="hero-subtitle mx-auto mb-0">{curso.descricao}</p>}
          </Container>
        </section>

        <Container as="section" className="courses-section" aria-label="Módulos do curso">
          <p>
            <Link to="/cursos">← Voltar para os cursos</Link>
          </p>

          <EstadoLista carregando={carregando && !curso} erro={erro} onTentarDeNovo={recarregar} />

          {curso && podeEditar && (
            <div className="faixa-gestor">
              <span>Você pode editar este curso.</span>
              <Button variant="outline-dark" onClick={abrirCurso}>Editar informações do curso</Button>
              <Button className="btn-accent" onClick={() => abrirModulo(null)}>+ Novo módulo</Button>
            </div>
          )}

          {curso && (
            <>
              <div className="mb-4">
                <Badge bg="" className="course-badge mb-2">{curso.categoria}</Badge>
                <p className="mb-2" id="rotulo-progresso">
                  Seu progresso: {curso.modulosConcluidos} de {curso.qtdModulos} módulos ({percentual}%)
                </p>
                <div
                  className="progresso-barra"
                  role="progressbar"
                  aria-labelledby="rotulo-progresso"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percentual}
                >
                  <div style={{ width: `${percentual}%` }} />
                </div>
              </div>

              <p className="dica-modulos">
                Cada módulo é liberado quando você conclui o anterior. A plataforma percebe
                sozinha quando você termina.
              </p>

              {curso.modulos.length === 0 && (
                <p className="grupo-vazio">
                  {podeEditar
                    ? "Este curso ainda não tem módulos. Use “+ Novo módulo” para começar."
                    : "Este curso ainda não tem módulos. Volte em breve."}
                </p>
              )}

              <ol className="lista-aulas">
                {curso.modulos.map((m, i) => {
                  const sit = SITUACOES[m.situacao];
                  const bloqueado = m.situacao === "bloqueado";
                  return (
                    <li
                      key={m.id}
                      className={`item-aula situacao-${m.situacao}`}
                      aria-disabled={bloqueado}
                    >
                      <div className="modulo-cabecalho">
                        <h2 className="course-title mb-0">
                          <span aria-hidden="true">{sit.icone} </span>
                          Módulo {m.ordem}: {m.titulo}
                        </h2>
                        <span className="modulo-situacao">{sit.rotulo}</span>
                      </div>
                      <p className="course-description">{m.descricao}</p>
                      <div className="d-flex flex-wrap gap-3 align-items-center">
                        {bloqueado ? (
                          <span className="modulo-aviso">
                            Disponível quando você concluir o Módulo {curso.modulos[i - 1].ordem}.
                          </span>
                        ) : (
                          <Button
                            as={Link}
                            to={`/cursos/${curso.id}/modulos/${m.ordem}`}
                            className="btn-accent"
                            aria-label={`${sit.acao}: ${m.titulo}`}
                          >
                            {sit.acao}
                          </Button>
                        )}
                        <span className="modulo-meta">
                          {m.qtdConteudos} {m.qtdConteudos === 1 ? "conteúdo" : "conteúdos"}
                        </span>
                        {podeEditar && (
                          <span className="acoes-gestao m-0">
                            <Button variant="outline-dark" onClick={() => abrirModulo(m)} aria-label={`Editar o módulo ${m.titulo}`}>Editar</Button>
                            <Button variant="outline-danger" onClick={() => setExclusao(m)} aria-label={`Excluir o módulo ${m.titulo}`}>Excluir</Button>
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </Container>
      </main>

      <Rodape />

      <Modal show={Boolean(formCurso)} onHide={() => setFormCurso(null)} centered>
        <Form onSubmit={salvarCurso}>
          <Modal.Header closeButton closeLabel="Fechar"><Modal.Title as="h2">Editar curso</Modal.Title></Modal.Header>
          <Modal.Body>
            {erroForm && <Alert variant="danger" role="alert">⚠️ {erroForm}</Alert>}
            {formCurso && (
              <>
                <Form.Group className="mb-3" controlId="curso-nome">
                  <Form.Label>Nome do curso</Form.Label>
                  <Form.Control required maxLength={150} value={formCurso.nome} onChange={(e) => setFormCurso({ ...formCurso, nome: e.target.value })} />
                </Form.Group>
                <Form.Group className="mb-3" controlId="curso-descricao">
                  <Form.Label>Descrição</Form.Label>
                  <Form.Control as="textarea" rows={3} required maxLength={2000} value={formCurso.descricao} onChange={(e) => setFormCurso({ ...formCurso, descricao: e.target.value })} />
                </Form.Group>
                <Form.Group className="mb-3" controlId="curso-categoria">
                  <Form.Label>Tema (ex.: Celular, WhatsApp, Internet)</Form.Label>
                  <Form.Control required maxLength={60} value={formCurso.categoria} onChange={(e) => setFormCurso({ ...formCurso, categoria: e.target.value })} />
                </Form.Group>
                <CampoImagem id="curso-imagem" rotulo="Capa do card (fica atrás do ícone)" valor={formCurso.imagem} onChange={(v) => setFormCurso({ ...formCurso, imagem: v })} />
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-dark" onClick={() => setFormCurso(null)}>Cancelar</Button>
            <Button type="submit" className="btn-accent" disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={Boolean(formModulo)} onHide={() => setFormModulo(null)} centered>
        <Form onSubmit={salvarModulo}>
          <Modal.Header closeButton closeLabel="Fechar">
            <Modal.Title as="h2">{formModulo?.ordem ? "Editar módulo" : "Novo módulo"}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {erroForm && <Alert variant="danger" role="alert">⚠️ {erroForm}</Alert>}
            {formModulo && (
              <>
                <Form.Group className="mb-3" controlId="modulo-titulo">
                  <Form.Label>Título do módulo</Form.Label>
                  <Form.Control required maxLength={150} value={formModulo.titulo} onChange={(e) => setFormModulo({ ...formModulo, titulo: e.target.value })} />
                </Form.Group>
                <Form.Group controlId="modulo-descricao">
                  <Form.Label>Descrição</Form.Label>
                  <Form.Control as="textarea" rows={3} maxLength={2000} value={formModulo.descricao} onChange={(e) => setFormModulo({ ...formModulo, descricao: e.target.value })} />
                </Form.Group>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-dark" onClick={() => setFormModulo(null)}>Cancelar</Button>
            <Button type="submit" className="btn-accent" disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <ConfirmarExclusao
        mostrar={Boolean(exclusao)}
        titulo="Excluir módulo"
        mensagem={<>Tem certeza de que deseja excluir o módulo <strong>{exclusao?.titulo}</strong> e todos os seus conteúdos? Os módulos seguintes serão renumerados.</>}
        onConfirmar={excluirModulo}
        onCancelar={() => setExclusao(null)}
      />
    </div>
  );
};

export default CursoDetalhe;
