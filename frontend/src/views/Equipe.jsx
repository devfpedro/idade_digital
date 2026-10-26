import { useCallback, useState } from "react";
import { Alert, Button, Col, Container, Form, Modal, Row } from "react-bootstrap";
import Header from "../components/Header";
import Rodape from "../components/Rodape";
import EstadoLista from "../components/EstadoLista";
import "../components/Listagem.css";
import "./Equipe.css";
import { api } from "../services/api";
import { obterSessao } from "../services/auth";
import { PAPEIS_EQUIPE } from "../services/papeis";
import { useApi } from "../hooks/useApi";
import { useToast } from "../services/toast";

const TIPOS = {
  integrante: {
    grupo: "integrantes",
    rotulo: "Integrante do projeto",
    ajuda: "Pessoa da equipe principal.",
    tituloSecao: "Integrantes do projeto",
    descricaoSecao: "Equipe principal, responsável por idealizar, desenvolver e testar a plataforma.",
    vazio: "Nenhum integrante cadastrado.",
    github: "obrigatorio",
  },
  parceiro: {
    grupo: "parceiros",
    rotulo: "Parceiro social ou colaborador institucional",
    ajuda: "Instituições, empresas, professores ou grupos que apoiam o projeto.",
    tituloSecao: "Parceiros sociais e colaboradores institucionais",
    descricaoSecao:
      "Instituições, professores e grupos que apoiam o projeto e tornam possível levar a plataforma até as pessoas idosas.",
    vazio: "Em breve, novos parceiros por aqui.",
    github: "nenhum",
  },
  colaborador: {
    grupo: "colaboradores",
    rotulo: "Aluno colaborador externo",
    ajuda: "Estudante ou egresso de outro período, curso ou instituição.",
    tituloSecao: "Alunos colaboradores externos",
    descricaoSecao:
      "Estudantes e egressos do curso de Sistemas para Internet, do IFPB e de outras instituições, que contribuem com o projeto.",
    vazio: "Em breve, os alunos colaboradores externos serão apresentados aqui.",
    github: "opcional",
  },
};

const PAPEIS_PARCEIRO = [
  "Parceiro social",
  "Instituição de ensino",
  "Instituição de colaboração",
  "Grupo de apoio",
];
const OUTRO = "__outro__";

function iniciais(nome) {
  const partes = nome.trim().split(/\s+/);
  return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

function Avatar({ pessoa, tipo }) {
  const [falhou, setFalhou] = useState(false);
  if (tipo === "parceiro") {
    return <span className="avatar-pessoa avatar-parceiro" aria-hidden="true">🤝</span>;
  }
  if (pessoa.avatarUrl && !falhou) {
    return (
      <img
        className="avatar-pessoa avatar-foto"
        src={pessoa.avatarUrl}
        alt={`Foto de perfil de ${pessoa.nome} no GitHub`}
        loading="lazy"
        onError={() => setFalhou(true)}
      />
    );
  }
  return <span className="avatar-pessoa" aria-hidden="true">{iniciais(pessoa.nome)}</span>;
}

function Grupo({ id, tipo, pessoas, podeEditar, onEditar, onRemover }) {
  const t = TIPOS[tipo];
  return (
    <section className="grupo-equipe" aria-labelledby={id}>
      <h2 id={id} className="grupo-titulo">{t.tituloSecao}</h2>
      <p className="grupo-descricao">{t.descricaoSecao}</p>

      {pessoas.length === 0 ? (
        <p className="grupo-vazio">{t.vazio}</p>
      ) : (
        <Row xs={1} md={2} lg={3} className="g-4" as="ul" role="list">
          {pessoas.map((p) => (
            <Col as="li" key={p.id} className="lista-sem-marcador">
              <article className="cartao-pessoa h-100">
                <Avatar pessoa={p} tipo={tipo} />
                <h3 className="pessoa-nome">{p.nome}</h3>
                {p.githubUrl && (
                  <a className="pessoa-github" href={p.githubUrl} target="_blank" rel="noopener noreferrer"
                    aria-label={`Perfil de ${p.nome} no GitHub (abre em outra aba)`}>
                    @{p.github}
                  </a>
                )}
                <ul className="pessoa-funcoes">
                  {p.funcao.split("\n").map((linha) => (
                    <li key={linha}>{linha}</li>
                  ))}
                </ul>
                {p.descricao && <p className="pessoa-descricao">{p.descricao}</p>}
                {podeEditar && (
                  <div className="pessoa-acoes">
                    <Button size="sm" variant="outline-dark" onClick={() => onEditar(tipo, p)}
                      aria-label={`Editar ${p.nome}`}>Editar</Button>
                    <Button size="sm" variant="outline-danger" onClick={() => onRemover(p)}
                      aria-label={`Remover ${p.nome}`}>Remover</Button>
                  </div>
                )}
              </article>
            </Col>
          ))}
        </Row>
      )}
    </section>
  );
}

const FORM_VAZIO = { nome: "", funcao: "", papelParceiro: PAPEIS_PARCEIRO[0], papelOutro: "", descricao: "", github: "" };

const Equipe = () => {
  const mostrarToast = useToast();
  const podeEditar = PAPEIS_EQUIPE.includes(obterSessao()?.papel);
  const buscar = useCallback((signal) => api.listarEquipe(signal), []);
  const { dados: equipe, erro, carregando, recarregar } = useApi(buscar);

  const [modal, setModal] = useState(null);
  const [remocao, setRemocao] = useState(null);
  const [erroForm, setErroForm] = useState("");
  const [salvando, setSalvando] = useState(false);

  function abrirNovo() {
    setErroForm("");
    setModal({ etapa: "tipo", tipo: null, id: null, form: { ...FORM_VAZIO } });
  }

  function escolherTipo(tipo) {
    setModal((m) => ({ ...m, etapa: "form", tipo }));
  }

  function abrirEdicao(tipo, p) {
    setErroForm("");
    const form = { ...FORM_VAZIO, nome: p.nome, descricao: p.descricao, github: p.githubUrl || "" };
    if (tipo === "parceiro") {
      if (PAPEIS_PARCEIRO.includes(p.funcao)) form.papelParceiro = p.funcao;
      else {
        form.papelParceiro = OUTRO;
        form.papelOutro = p.funcao;
      }
    } else {
      form.funcao = p.funcao;
    }
    setModal({ etapa: "form", tipo, id: p.id, form });
  }

  function alterar(campo, valor) {
    setModal((m) => ({ ...m, form: { ...m.form, [campo]: valor } }));
  }

  async function salvar(evento) {
    evento.preventDefault();
    setErroForm("");
    const { tipo, id, form } = modal;
    const funcao =
      tipo === "parceiro"
        ? form.papelParceiro === OUTRO ? form.papelOutro : form.papelParceiro
        : form.funcao;
    const corpo = { categoria: tipo, nome: form.nome, funcao, descricao: form.descricao, github: form.github };

    setSalvando(true);
    try {
      if (id) await api.atualizarCadastroEquipe(id, corpo);
      else await api.criarCadastroEquipe(corpo);
      mostrarToast(id ? "Cadastro atualizado." : "Cadastro adicionado.", "sucesso", 4000, "✅");
      setModal(null);
      recarregar();
    } catch (e) {
      setErroForm(e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function remover() {
    try {
      await api.removerCadastroEquipe(remocao.id);
      mostrarToast("Cadastro removido.", "sucesso", 4000, "✅");
      recarregar();
    } catch (e) {
      mostrarToast(e.message, "erro", 6000, "⚠️");
    } finally {
      setRemocao(null);
    }
  }

  const tipo = modal?.tipo && TIPOS[modal.tipo];

  return (
    <div className="main-container">
      <Header />

      <main id="conteudo-principal" tabIndex={-1}>
        <section className="hero text-center" aria-labelledby="titulo-pagina">
          <Container>
            <h1 id="titulo-pagina" className="hero-title" tabIndex={-1}>Equipe e Parceiros</h1>
            <p className="hero-subtitle mx-auto">
              O Idade Digital só existe graças às pessoas e instituições que
              acreditaram nele. A todas, nosso muito obrigado.
            </p>
            {podeEditar && (
              <Button className="btn-accent" size="lg" onClick={abrirNovo}>+ Adicionar à página</Button>
            )}
          </Container>
        </section>

        <Container className="courses-section">
          <EstadoLista carregando={carregando && !equipe} erro={erro} onTentarDeNovo={recarregar} />

          {equipe && Object.keys(TIPOS).map((chave) => (
            <Grupo
              key={chave}
              id={`grupo-${TIPOS[chave].grupo}`}
              tipo={chave}
              pessoas={equipe[TIPOS[chave].grupo]}
              podeEditar={podeEditar}
              onEditar={abrirEdicao}
              onRemover={setRemocao}
            />
          ))}
        </Container>
      </main>

      <Rodape />

      <Modal show={Boolean(modal)} onHide={() => setModal(null)} centered size={modal?.etapa === "tipo" ? "lg" : undefined}>
        {modal?.etapa === "tipo" && (
          <>
            <Modal.Header closeButton closeLabel="Fechar">
              <Modal.Title as="h2">O que você quer adicionar?</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <div className="escolha-tipo">
                {Object.entries(TIPOS).map(([chave, t]) => (
                  <button key={chave} type="button" className="opcao-tipo" onClick={() => escolherTipo(chave)}>
                    <strong>{t.rotulo}</strong>
                    <span>{t.ajuda}</span>
                  </button>
                ))}
              </div>
            </Modal.Body>
          </>
        )}

        {modal?.etapa === "form" && tipo && (
          <Form onSubmit={salvar}>
            <Modal.Header closeButton closeLabel="Fechar">
              <Modal.Title as="h2">{modal.id ? "Editar" : "Adicionar"}: {tipo.rotulo}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {erroForm && <Alert variant="danger" role="alert">⚠️ {erroForm}</Alert>}

              <Form.Group className="mb-3" controlId="equipe-nome">
                <Form.Label>{modal.tipo === "parceiro" ? "Nome da instituição, grupo ou pessoa" : "Nome"}</Form.Label>
                <Form.Control required maxLength={160} value={modal.form.nome}
                  onChange={(e) => alterar("nome", e.target.value)} />
              </Form.Group>

              {modal.tipo === "parceiro" ? (
                <>
                  <Form.Group className="mb-3" controlId="equipe-papel">
                    <Form.Label>Papel no projeto</Form.Label>
                    <Form.Select value={modal.form.papelParceiro}
                      onChange={(e) => alterar("papelParceiro", e.target.value)}>
                      {PAPEIS_PARCEIRO.map((p) => <option key={p} value={p}>{p}</option>)}
                      <option value={OUTRO}>Outro (digitar)</option>
                    </Form.Select>
                  </Form.Group>
                  {modal.form.papelParceiro === OUTRO && (
                    <Form.Group className="mb-3" controlId="equipe-papel-outro">
                      <Form.Label>Qual é o papel?</Form.Label>
                      <Form.Control required maxLength={160} value={modal.form.papelOutro}
                        onChange={(e) => alterar("papelOutro", e.target.value)} />
                    </Form.Group>
                  )}
                  <Form.Group className="mb-3" controlId="equipe-descricao">
                    <Form.Label>Descrição</Form.Label>
                    <Form.Control as="textarea" rows={3} required maxLength={1000} value={modal.form.descricao}
                      onChange={(e) => alterar("descricao", e.target.value)} />
                  </Form.Group>
                </>
              ) : (
                <>
                  <Form.Group className="mb-3" controlId="equipe-funcao">
                    <Form.Label>Função no projeto</Form.Label>
                    <Form.Control as="textarea" rows={2} required maxLength={160} value={modal.form.funcao}
                      onChange={(e) => alterar("funcao", e.target.value)} />
                    <Form.Text>Uma função por linha, se houver mais de uma.</Form.Text>
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="equipe-github">
                    <Form.Label>Link do perfil no GitHub{tipo.github === "opcional" ? " (se tiver)" : ""}</Form.Label>
                    <Form.Control required={tipo.github === "obrigatorio"} maxLength={200}
                      placeholder="https://github.com/usuario" value={modal.form.github}
                      onChange={(e) => alterar("github", e.target.value)} />
                    <Form.Text>A foto e o @ do perfil aparecem na página a partir deste link.</Form.Text>
                  </Form.Group>
                </>
              )}
            </Modal.Body>
            <Modal.Footer>
              {!modal.id && (
                <Button variant="outline-dark" className="me-auto" onClick={() => setModal((m) => ({ ...m, etapa: "tipo" }))}>
                  ← Voltar
                </Button>
              )}
              <Button variant="outline-dark" onClick={() => setModal(null)}>Cancelar</Button>
              <Button type="submit" className="btn-accent" disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar"}
              </Button>
            </Modal.Footer>
          </Form>
        )}
      </Modal>

      <Modal show={Boolean(remocao)} onHide={() => setRemocao(null)} centered>
        <Modal.Header closeButton closeLabel="Fechar">
          <Modal.Title as="h2">Remover da página</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Deseja remover <strong>{remocao?.nome}</strong> desta página?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-dark" onClick={() => setRemocao(null)}>Cancelar</Button>
          <Button variant="danger" onClick={remover}>Sim, remover</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Equipe;
