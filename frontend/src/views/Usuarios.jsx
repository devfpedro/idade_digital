import { useCallback, useState } from "react";
import { Alert, Badge, Button, Container, Form, Modal, Table } from "react-bootstrap";
import Header from "../components/Header";
import Rodape from "../components/Rodape";
import EstadoLista from "../components/EstadoLista";
import "../components/Listagem.css";
import "./Usuarios.css";
import { api } from "../services/api";
import { obterSessao } from "../services/auth";
import { GERENCIAVEIS, ROTULO_PAPEL } from "../services/papeis";
import { useApi } from "../hooks/useApi";
import { useBusca } from "../hooks/useBusca";
import { useToast } from "../services/toast";

const VAZIO = { nome: "", email: "", senha: "", papel: "usuario", ativo: true };

const Usuarios = () => {
  const mostrarToast = useToast();
  const sessao = obterSessao();
  const gerenciaveis = GERENCIAVEIS[sessao?.papel] || [];
  const { termo, setTermo, consulta, buscarAgora } = useBusca();
  const buscar = useCallback((signal) => api.listarUsuarios(consulta, signal), [consulta]);
  const { dados: usuarios, erro, carregando, recarregar } = useApi(buscar);

  const [edicao, setEdicao] = useState(null);
  const [exclusao, setExclusao] = useState(null);
  const [erroForm, setErroForm] = useState("");
  const [salvando, setSalvando] = useState(false);

  function abrirNovo() {
    setErroForm("");
    setEdicao({ id: null, form: { ...VAZIO, papel: gerenciaveis[gerenciaveis.length - 1] } });
  }

  function abrirEdicao(u) {
    setErroForm("");
    setEdicao({
      id: u.id,
      form: { nome: u.nome, email: u.email, senha: "", papel: u.papel, ativo: u.ativo },
    });
  }

  function alterarCampo(campo, valor) {
    setEdicao((atual) => ({ ...atual, form: { ...atual.form, [campo]: valor } }));
  }

  async function salvar(evento) {
    evento.preventDefault();
    setErroForm("");
    setSalvando(true);
    const { form, id } = edicao;
    const corpo = { nome: form.nome, email: form.email, papel: form.papel, ativo: form.ativo };
    if (form.senha) corpo.senha = form.senha;
    try {
      if (id) await api.atualizarUsuario(id, corpo);
      else await api.criarUsuario({ ...corpo, senha: form.senha });
      mostrarToast(id ? "Usuário atualizado." : "Usuário criado.", "sucesso", 4000, "✅");
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
      await api.excluirUsuario(exclusao.id);
      mostrarToast("Usuário excluído.", "sucesso", 4000, "✅");
      recarregar();
    } catch (e) {
      mostrarToast(e.message, "erro", 6000, "⚠️");
    } finally {
      setExclusao(null);
    }
  }

  const editandoSiMesmo = Boolean(edicao?.id) && usuarios?.find((u) => u.id === edicao.id)?.email === sessao?.email;

  return (
    <div className="main-container">
      <Header />

      <main id="conteudo-principal" tabIndex={-1}>
        <section className="hero text-center" aria-labelledby="titulo-pagina">
          <Container>
            <h1 id="titulo-pagina" className="hero-title" tabIndex={-1}>Usuários</h1>
            <p className="hero-subtitle mx-auto mb-0">
              Cadastre, edite ou exclua usuários dos níveis:{" "}
              {gerenciaveis.map((p) => ROTULO_PAPEL[p]).join(", ")}.
            </p>
          </Container>
        </section>

        <Container as="section" className="courses-section" aria-label="Lista de usuários">
          <div className="barra-usuarios">
            <Form
              className="busca-usuarios"
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                buscarAgora(termo.trim());
              }}
            >
              <Form.Control
                type="search"
                size="lg"
                aria-label="Buscar usuários por nome ou e-mail"
                placeholder="Buscar por nome ou e-mail..."
                value={termo}
                maxLength={100}
                onChange={(e) => setTermo(e.target.value)}
              />
            </Form>
            <Button className="btn-accent" size="lg" onClick={abrirNovo}>
              + Novo usuário
            </Button>
          </div>

          <EstadoLista
            carregando={carregando && !usuarios}
            erro={erro}
            vazio={Boolean(usuarios) && usuarios.length === 0}
            mensagemVazio="Nenhum usuário encontrado."
            onTentarDeNovo={recarregar}
          />

          {usuarios && usuarios.length > 0 && (
            <Table responsive hover className="tabela-usuarios align-middle">
              <caption className="visually-hidden">Usuários cadastrados</caption>
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">E-mail</th>
                  <th scope="col">Nível</th>
                  <th scope="col">Situação</th>
                  <th scope="col"><span className="visually-hidden">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id}>
                    <td>{u.nome}</td>
                    <td>{u.email}</td>
                    <td><Badge bg="" className={`nivel nivel-${u.papel}`}>{ROTULO_PAPEL[u.papel]}</Badge></td>
                    <td>{u.ativo ? "Ativo" : "Desativado"}</td>
                    <td className="text-nowrap text-end">
                      {(gerenciaveis.includes(u.papel) || u.email === sessao?.email) && (
                        <Button variant="outline-dark" className="me-2" onClick={() => abrirEdicao(u)} aria-label={`Editar ${u.nome}`}>
                          Editar
                        </Button>
                      )}
                      {gerenciaveis.includes(u.papel) && (
                        <Button variant="outline-danger" onClick={() => setExclusao(u)} aria-label={`Excluir ${u.nome}`}>
                          Excluir
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Container>
      </main>

      <Rodape />

      <Modal show={Boolean(edicao)} onHide={() => setEdicao(null)} centered>
        <Form onSubmit={salvar}>
          <Modal.Header closeButton closeLabel="Fechar">
            <Modal.Title as="h2">{edicao?.id ? "Editar usuário" : "Novo usuário"}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {erroForm && <Alert variant="danger" role="alert">⚠️ {erroForm}</Alert>}
            {edicao && (
              <>
                <Form.Group className="mb-3" controlId="usuario-nome">
                  <Form.Label>Nome</Form.Label>
                  <Form.Control required maxLength={120} value={edicao.form.nome}
                    onChange={(e) => alterarCampo("nome", e.target.value)} />
                </Form.Group>
                <Form.Group className="mb-3" controlId="usuario-email">
                  <Form.Label>E-mail</Form.Label>
                  <Form.Control required type="email" maxLength={160} value={edicao.form.email}
                    onChange={(e) => alterarCampo("email", e.target.value)} />
                </Form.Group>
                <Form.Group className="mb-3" controlId="usuario-senha">
                  <Form.Label>{edicao.id ? "Nova senha (deixe em branco para manter)" : "Senha"}</Form.Label>
                  <Form.Control type="password" minLength={8} maxLength={128} autoComplete="new-password"
                    required={!edicao.id} value={edicao.form.senha}
                    onChange={(e) => alterarCampo("senha", e.target.value)} />
                  <Form.Text>Mínimo de 8 caracteres.</Form.Text>
                </Form.Group>
                <Form.Group className="mb-3" controlId="usuario-papel">
                  <Form.Label>Nível de acesso</Form.Label>
                  <Form.Select value={edicao.form.papel} disabled={editandoSiMesmo || gerenciaveis.length === 1}
                    onChange={(e) => alterarCampo("papel", e.target.value)}>
                    {(editandoSiMesmo ? [edicao.form.papel] : gerenciaveis).map((valor) => (
                      <option key={valor} value={valor}>{ROTULO_PAPEL[valor]}</option>
                    ))}
                  </Form.Select>
                  {editandoSiMesmo && <Form.Text>Você não pode alterar o seu próprio nível.</Form.Text>}
                </Form.Group>
                {edicao.id && (
                  <Form.Check id="usuario-ativo" type="checkbox" label="Conta ativa (pode entrar na plataforma)"
                    disabled={editandoSiMesmo} checked={edicao.form.ativo}
                    onChange={(e) => alterarCampo("ativo", e.target.checked)} />
                )}
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-dark" onClick={() => setEdicao(null)}>Cancelar</Button>
            <Button type="submit" className="btn-accent" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={Boolean(exclusao)} onHide={() => setExclusao(null)} centered>
        <Modal.Header closeButton closeLabel="Fechar">
          <Modal.Title as="h2">Excluir usuário</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Tem certeza de que deseja excluir <strong>{exclusao?.nome}</strong>? O progresso dessa
          pessoa nos cursos também será apagado. Esta ação não pode ser desfeita.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-dark" onClick={() => setExclusao(null)}>Cancelar</Button>
          <Button variant="danger" onClick={excluir}>Sim, excluir</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Usuarios;
