import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Container, Form, Modal } from "react-bootstrap";
import { Link, useParams } from "react-router-dom";
import Header from "../components/Header";
import Rodape from "../components/Rodape";
import EstadoLista from "../components/EstadoLista";
import ConfirmarExclusao from "../components/ConfirmarExclusao";
import "../components/Listagem.css";
import { api } from "../services/api";
import { useApi } from "../hooks/useApi";
import { obterSessao } from "../services/auth";
import { PAPEIS_CONTEUDO } from "../services/papeis";
import { useToast } from "../services/toast";
import { idDoYoutube } from "../services/youtube";

const TEMPO_MINIMO_LEITURA_MS = 3000;

// Texto: concluído quando o final foi exibido e passou um tempo mínimo de leitura.
function ConteudoTexto({ conteudo, onConcluir }) {
  const fim = useRef(null);
  const concluido = conteudo.concluido;

  useEffect(() => {
    if (concluido || !fim.current) return undefined;
    const inicio = Date.now();
    let timer;
    const observador = new IntersectionObserver(([entrada]) => {
      clearTimeout(timer);
      if (entrada.isIntersecting) {
        const falta = Math.max(0, TEMPO_MINIMO_LEITURA_MS - (Date.now() - inicio));
        timer = setTimeout(() => onConcluir(conteudo.id), falta);
      }
    });
    observador.observe(fim.current);
    return () => {
      clearTimeout(timer);
      observador.disconnect();
    };
  }, [concluido, conteudo.id, onConcluir]);

  return (
    <>
      <div className="conteudo-texto">{conteudo.texto}</div>
      <span ref={fim} aria-hidden="true" />
    </>
  );
}

// Link: concluído quando a pessoa abre o material.
function ConteudoLink({ conteudo, onConcluir }) {
  return (
    <>
      {conteudo.texto && <p className="conteudo-texto">{conteudo.texto}</p>}
      <Button
        as="a"
        href={conteudo.url}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-accent"
        onClick={() => onConcluir(conteudo.id)}
      >
        Abrir material (abre em outra aba)
      </Button>
    </>
  );
}

let apiYoutube = null;
function carregarApiYoutube() {
  if (!apiYoutube) {
    apiYoutube = new Promise((resolver) => {
      if (window.YT?.Player) return resolver(window.YT);
      const anterior = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        anterior?.();
        resolver(window.YT);
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
      return undefined;
    });
  }
  return apiYoutube;
}

// Vídeo: concluído ao assistir 90% ou ao chegar ao fim.
function ConteudoVideo({ conteudo, onConcluir }) {
  const alvo = useRef(null);
  const videoId = idDoYoutube(conteudo.url || "");
  const concluido = conteudo.concluido;

  useEffect(() => {
    if (!videoId || concluido || !alvo.current) return undefined;
    let player;
    let vigia;
    let cancelado = false;
    carregarApiYoutube().then((YT) => {
      if (cancelado) return;
      player = new YT.Player(alvo.current, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.ENDED) onConcluir(conteudo.id);
          },
        },
      });
      vigia = setInterval(() => {
        const duracao = player?.getDuration?.();
        if (duracao > 0 && player.getCurrentTime() / duracao >= 0.9) onConcluir(conteudo.id);
      }, 2000);
    });
    return () => {
      cancelado = true;
      clearInterval(vigia);
      player?.destroy?.();
    };
  }, [videoId, concluido, conteudo.id, onConcluir]);

  if (!videoId) return <p>Vídeo indisponível no momento.</p>;
  if (concluido) {
    return (
      <Button as="a" href={conteudo.url} target="_blank" rel="noopener noreferrer" className="btn-accent">
        Rever o vídeo no YouTube
      </Button>
    );
  }
  return (
    <div className="conteudo-video">
      <div ref={alvo} />
    </div>
  );
}

const TIPOS = { texto: ConteudoTexto, link: ConteudoLink, video: ConteudoVideo };

const ModuloDetalhe = () => {
  const { id, ordem } = useParams();
  const mostrarToast = useToast();
  const buscar = useCallback((signal) => api.obterModulo(id, ordem, signal), [id, ordem]);
  const { dados, erro, carregando, recarregar } = useApi(buscar);
  // Enquanto o novo módulo carrega, o anterior não deve aparecer na tela
  const modulo =
    dados && String(dados.cursoId) === id && String(dados.ordem) === ordem ? dados : null;
  const [progresso, setProgresso] = useState({ moduloId: null, concluidos: [], resultado: null });
  const enviados = useRef(new Set());

  const podeEditar = PAPEIS_CONTEUDO.includes(obterSessao()?.papel);
  const [formConteudo, setFormConteudo] = useState(null);
  const [exclusao, setExclusao] = useState(null);
  const [erroForm, setErroForm] = useState("");
  const [salvando, setSalvando] = useState(false);

  function abrirConteudo(c) {
    setErroForm("");
    setFormConteudo(
      c
        ? { id: c.id, tipo: c.tipo, titulo: c.titulo, texto: c.texto, url: c.url || "" }
        : { id: null, tipo: "texto", titulo: "", texto: "", url: "" },
    );
  }

  async function salvarConteudo(evento) {
    evento.preventDefault();
    setErroForm("");
    setSalvando(true);
    const { id: conteudoId, ...corpo } = formConteudo;
    try {
      if (conteudoId) await api.atualizarConteudo(id, ordem, conteudoId, corpo);
      else await api.criarConteudo(id, ordem, corpo);
      mostrarToast(conteudoId ? "Conteúdo atualizado." : "Conteúdo adicionado.", "sucesso", 4000, "✅");
      setFormConteudo(null);
      recarregar();
    } catch (e) {
      setErroForm(e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluirConteudo() {
    try {
      await api.excluirConteudo(id, ordem, exclusao.id);
      mostrarToast("Conteúdo excluído.", "sucesso", 4000, "✅");
      recarregar();
    } catch (e) {
      mostrarToast(e.message, "erro", 6000, "⚠️");
    } finally {
      setExclusao(null);
    }
  }

  // Progresso local só vale para o módulo que está na tela
  const local = progresso.moduloId === modulo?.id ? progresso : { concluidos: [], resultado: null };

  const concluirConteudo = useCallback(
    async (conteudoId) => {
      if (!modulo || enviados.current.has(conteudoId)) return;
      enviados.current.add(conteudoId);
      try {
        const resultado = await api.concluirConteudo(id, modulo.ordem, conteudoId);
        setProgresso((p) => ({
          moduloId: modulo.id,
          concluidos: [...(p.moduloId === modulo.id ? p.concluidos : []), conteudoId],
          resultado: resultado.recemConcluido ? resultado : p.moduloId === modulo.id ? p.resultado : null,
        }));
        if (resultado.recemConcluido) {
          mostrarToast("Módulo concluído! O próximo módulo foi liberado.", "sucesso", 7000, "✅");
        }
      } catch (e) {
        enviados.current.delete(conteudoId);
        mostrarToast(e.message, "erro", 6000, "⚠️");
      }
    },
    [id, modulo, mostrarToast],
  );

  const concluido = modulo?.concluido || Boolean(local.resultado?.recemConcluido);
  const proximaOrdem = modulo?.proximaOrdem ?? local.resultado?.proximaOrdem ?? null;

  return (
    <div className="main-container">
      <Header />

      <main id="conteudo-principal" tabIndex={-1}>
        <section className="hero text-center" aria-labelledby="titulo-pagina">
          <Container>
            <h1 id="titulo-pagina" className="hero-title" tabIndex={-1}>
              {modulo ? `Módulo ${modulo.ordem}: ${modulo.titulo}` : "Módulo"}
            </h1>
            {modulo && <p className="hero-subtitle mx-auto mb-0">{modulo.cursoNome}</p>}
          </Container>
        </section>

        <Container as="section" className="courses-section" aria-label="Conteúdos do módulo">
          <p>
            <Link to={`/cursos/${id}`}>← Voltar para os módulos do curso</Link>
          </p>

          <EstadoLista carregando={carregando && !modulo} erro={erro} onTentarDeNovo={recarregar} />

          {modulo && podeEditar && (
            <div className="faixa-gestor">
              <span>Você pode editar o conteúdo deste módulo.</span>
              <Button className="btn-accent" onClick={() => abrirConteudo(null)}>+ Adicionar conteúdo</Button>
            </div>
          )}

          {modulo && (
            <>
              <p className="dica-modulos">{modulo.descricao}</p>

              {modulo.conteudos.map((c) => {
                const Tipo = TIPOS[c.tipo];
                const feito = c.concluido || local.concluidos.includes(c.id);
                return (
                  <article key={c.id} className={`conteudo-bloco${feito ? " concluido" : ""}`}>
                    <h2>
                      {feito && <span aria-hidden="true">✅ </span>}
                      {c.titulo}
                      {feito && <span className="visually-hidden"> (concluído)</span>}
                    </h2>
                    <Tipo conteudo={{ ...c, concluido: feito }} onConcluir={concluirConteudo} />
                    {podeEditar && (
                      <div className="acoes-gestao">
                        <Button variant="outline-dark" onClick={() => abrirConteudo(c)} aria-label={`Editar o conteúdo ${c.titulo}`}>Editar</Button>
                        <Button variant="outline-danger" onClick={() => setExclusao(c)} aria-label={`Excluir o conteúdo ${c.titulo}`}>Excluir</Button>
                      </div>
                    )}
                  </article>
                );
              })}

              {concluido && (
                <div className="faixa-modulo-concluido" role="status">
                  <p className="mb-3"><strong>✅ Módulo concluído!</strong>{" "}
                    {proximaOrdem ? "O próximo módulo já está liberado." : "Você chegou ao fim do curso. Parabéns!"}
                  </p>
                  {proximaOrdem ? (
                    <Button as={Link} to={`/cursos/${id}/modulos/${proximaOrdem}`} className="btn-accent">
                      Ir para o próximo módulo
                    </Button>
                  ) : (
                    <Button as={Link} to={`/cursos/${id}`} className="btn-accent">
                      Voltar ao curso
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </Container>
      </main>

      <Rodape />

      <Modal show={Boolean(formConteudo)} onHide={() => setFormConteudo(null)} centered size="lg" scrollable>
        <Form onSubmit={salvarConteudo}>
          <Modal.Header closeButton closeLabel="Fechar">
            <Modal.Title as="h2">{formConteudo?.id ? "Editar conteúdo" : "Adicionar conteúdo"}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {erroForm && <Alert variant="danger" role="alert">⚠️ {erroForm}</Alert>}
            {formConteudo && (
              <>
                <Form.Group className="mb-3" controlId="conteudo-tipo">
                  <Form.Label>Tipo</Form.Label>
                  <Form.Select value={formConteudo.tipo} onChange={(e) => setFormConteudo({ ...formConteudo, tipo: e.target.value })}>
                    <option value="texto">Texto</option>
                    <option value="video">Vídeo aula (YouTube)</option>
                    <option value="link">Link (artigo ou outro material)</option>
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3" controlId="conteudo-titulo">
                  <Form.Label>Título</Form.Label>
                  <Form.Control required maxLength={150} value={formConteudo.titulo} onChange={(e) => setFormConteudo({ ...formConteudo, titulo: e.target.value })} />
                </Form.Group>
                {formConteudo.tipo !== "texto" && (
                  <Form.Group className="mb-3" controlId="conteudo-url">
                    <Form.Label>{formConteudo.tipo === "video" ? "Link do vídeo no YouTube" : "Link do material"}</Form.Label>
                    <Form.Control required type="url" maxLength={500} placeholder="https://" value={formConteudo.url} onChange={(e) => setFormConteudo({ ...formConteudo, url: e.target.value })} />
                  </Form.Group>
                )}
                <Form.Group controlId="conteudo-texto">
                  <Form.Label>{formConteudo.tipo === "texto" ? "Texto" : "Texto de apoio (opcional)"}</Form.Label>
                  <Form.Control as="textarea" rows={6} required={formConteudo.tipo === "texto"} maxLength={20000} value={formConteudo.texto} onChange={(e) => setFormConteudo({ ...formConteudo, texto: e.target.value })} />
                </Form.Group>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-dark" onClick={() => setFormConteudo(null)}>Cancelar</Button>
            <Button type="submit" className="btn-accent" disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <ConfirmarExclusao
        mostrar={Boolean(exclusao)}
        titulo="Excluir conteúdo"
        mensagem={<>Tem certeza de que deseja excluir <strong>{exclusao?.titulo}</strong>?</>}
        onConfirmar={excluirConteudo}
        onCancelar={() => setExclusao(null)}
      />
    </div>
  );
};

export default ModuloDetalhe;
