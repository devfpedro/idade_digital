import { encerrarSessao, obterToken } from "./auth";

export const URL_API = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

export function urlImagem(imagem) {
  return imagem && imagem.startsWith("/uploads/") ? `${URL_API}${imagem}` : imagem;
}

export class ErroApi extends Error {
  constructor(mensagem, status = 0) {
    super(mensagem);
    this.name = "ErroApi";
    this.status = status;
  }
}

export async function requisitar(
  caminho,
  { metodo = "GET", corpo, autenticado = true, signal } = {},
) {
  const cabecalhos = {};
  if (corpo !== undefined) cabecalhos["Content-Type"] = "application/json";
  if (autenticado) cabecalhos.Authorization = `Bearer ${obterToken()}`;

  let resposta;
  try {
    resposta = await fetch(`${URL_API}${caminho}`, {
      method: metodo,
      headers: cabecalhos,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
      signal,
    });
  } catch (erro) {
    if (erro.name === "AbortError") throw erro;
    throw new ErroApi(
      "Não foi possível conectar ao servidor. Verifique se o sistema está ligado e tente de novo.",
    );
  }

  let dados = null;
  try {
    dados = await resposta.json();
  } catch {
    // resposta sem corpo JSON
  }

  if (!resposta.ok) {
    if (resposta.status === 401 && autenticado) {
      encerrarSessao({
        notificar: true,
        motivo: "Sua sessão não é mais válida. Faça login novamente.",
      });
    }
    throw new ErroApi(
      dados?.erro || "Não foi possível concluir a operação.",
      resposta.status,
    );
  }
  return dados;
}

export async function requisitarAudio(corpo, signal) {
  let resposta;
  try {
    resposta = await fetch(`${URL_API}/voz`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${obterToken()}` },
      body: JSON.stringify(corpo),
      signal,
    });
  } catch (erro) {
    if (erro.name === "AbortError") throw erro;
    throw new ErroApi("Não foi possível conectar ao servidor de voz.");
  }
  if (!resposta.ok) throw new ErroApi("A voz natural não está disponível.", resposta.status);
  return resposta.blob();
}

export async function enviarArquivo(caminho, arquivo) {
  const formulario = new FormData();
  formulario.append("arquivo", arquivo);
  let resposta;
  try {
    resposta = await fetch(`${URL_API}${caminho}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${obterToken()}` },
      body: formulario,
    });
  } catch {
    throw new ErroApi("Não foi possível conectar ao servidor.");
  }
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) throw new ErroApi(dados?.erro || "Não foi possível enviar o arquivo.", resposta.status);
  return dados;
}

export async function falarPublico(texto, signal) {
  let resposta;
  try {
    resposta = await fetch(`${URL_API}/voz/publica`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto }),
      signal,
    });
  } catch (erro) {
    if (erro.name === "AbortError") throw erro;
    throw new ErroApi("Não foi possível conectar ao servidor de voz.");
  }
  if (!resposta.ok) throw new ErroApi("A voz natural não está disponível.", resposta.status);
  return resposta.blob();
}

export const api = {
  login: (email, senha) =>
    requisitar("/auth/login", {
      metodo: "POST",
      corpo: { email, senha },
      autenticado: false,
    }),
  listarCursos: (termo, signal) =>
    requisitar(`/cursos?q=${encodeURIComponent(termo)}`, { signal }),
  obterCurso: (id, signal) => requisitar(`/cursos/${id}`, { signal }),
  obterModulo: (cursoId, ordem, signal) =>
    requisitar(`/cursos/${cursoId}/modulos/${ordem}`, { signal }),
  concluirConteudo: (cursoId, ordem, conteudoId) =>
    requisitar(`/cursos/${cursoId}/modulos/${ordem}/conteudos/${conteudoId}/concluir`, {
      metodo: "PUT",
    }),
  listarInformacoes: (termo, signal) =>
    requisitar(`/informacoes?q=${encodeURIComponent(termo)}`, { signal }),
  vozDisponivelPublico: () => requisitar("/voz/publica/disponivel", { autenticado: false }),
  enviarImagem: (arquivo) => enviarArquivo("/uploads", arquivo),
  criarCurso: (dados) => requisitar("/cursos", { metodo: "POST", corpo: dados }),
  excluirCurso: (id) => requisitar(`/cursos/${id}`, { metodo: "DELETE" }),
  atualizarCurso: (id, dados) => requisitar(`/cursos/${id}`, { metodo: "PUT", corpo: dados }),
  criarModulo: (cursoId, dados) =>
    requisitar(`/cursos/${cursoId}/modulos`, { metodo: "POST", corpo: dados }),
  atualizarModulo: (cursoId, ordem, dados) =>
    requisitar(`/cursos/${cursoId}/modulos/${ordem}`, { metodo: "PUT", corpo: dados }),
  excluirModulo: (cursoId, ordem) =>
    requisitar(`/cursos/${cursoId}/modulos/${ordem}`, { metodo: "DELETE" }),
  criarConteudo: (cursoId, ordem, dados) =>
    requisitar(`/cursos/${cursoId}/modulos/${ordem}/conteudos`, { metodo: "POST", corpo: dados }),
  atualizarConteudo: (cursoId, ordem, id, dados) =>
    requisitar(`/cursos/${cursoId}/modulos/${ordem}/conteudos/${id}`, { metodo: "PUT", corpo: dados }),
  excluirConteudo: (cursoId, ordem, id) =>
    requisitar(`/cursos/${cursoId}/modulos/${ordem}/conteudos/${id}`, { metodo: "DELETE" }),
  criarInformacao: (dados) => requisitar("/informacoes", { metodo: "POST", corpo: dados }),
  atualizarInformacao: (id, dados) =>
    requisitar(`/informacoes/${id}`, { metodo: "PUT", corpo: dados }),
  excluirInformacao: (id) => requisitar(`/informacoes/${id}`, { metodo: "DELETE" }),
  listarEquipe: (signal) => requisitar("/equipe", { signal }),
  listarVozesNaturais: () => requisitar("/voz/vozes"),
  falar: (texto, voz, ritmo, signal) => requisitarAudio({ texto, voz, ritmo }, signal),
  criarCadastroEquipe: (dados) => requisitar("/equipe", { metodo: "POST", corpo: dados }),
  atualizarCadastroEquipe: (id, dados) =>
    requisitar(`/equipe/${id}`, { metodo: "PUT", corpo: dados }),
  removerCadastroEquipe: (id) => requisitar(`/equipe/${id}`, { metodo: "DELETE" }),
  listarUsuarios: (termo, signal) =>
    requisitar(`/usuarios?q=${encodeURIComponent(termo)}`, { signal }),
  criarUsuario: (dados) => requisitar("/usuarios", { metodo: "POST", corpo: dados }),
  atualizarUsuario: (id, dados) =>
    requisitar(`/usuarios/${id}`, { metodo: "PUT", corpo: dados }),
  excluirUsuario: (id) => requisitar(`/usuarios/${id}`, { metodo: "DELETE" }),
};
