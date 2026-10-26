const CHAVE_SESSAO = "sessao";
export const TEMPO_SESSAO_MS = 30 * 60 * 1000;
const DEBOUNCE_INTERACAO_MS = 5_000;
const INTERVALO_CHECAGEM_MS = 15_000;

export const EVENTO_SESSAO_EXPIRADA = "idade-digital:sessao-expirada";

const CHAVE_AVISO = "avisoLogout";

function descreverTempo(ms) {
  const minutos = Math.round(ms / 60000);
  return minutos === 1 ? "1 minuto" : `${minutos} minutos`;
}

function motivoExpiracao() {
  return (
    `Você ficou ${descreverTempo(TEMPO_SESSAO_MS)} sem usar a plataforma e, por segurança, ` +
    "sua sessão foi encerrada. Isso também acontece quando a janela é fechada sem clicar em " +
    "Sair. Para continuar, entre novamente com seu e-mail e sua senha."
  );
}

// O aviso fica guardado até ser exibido: assim ele aparece mesmo que a expiração
// seja percebida ao reabrir o site (janela fechada sem sair).
export function lerAvisoLogout() {
  try {
    const aviso = JSON.parse(localStorage.getItem(CHAVE_AVISO) || "null");
    return aviso && typeof aviso.motivo === "string" ? aviso : null;
  } catch {
    return null;
  }
}

export function limparAvisoLogout() {
  try {
    localStorage.removeItem(CHAVE_AVISO);
  } catch {
    // storage indisponível: nada a limpar
  }
}

export function formatarTempoRestante(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutos = Math.floor(total / 60);
  const segundos = String(total % 60).padStart(2, "0");
  return minutos > 0 ? `${minutos} min ${segundos} s` : `${total} s`;
}

export function obterSessao() {
  try {
    const bruto = localStorage.getItem(CHAVE_SESSAO);
    if (!bruto) return null;

    const sessao = JSON.parse(bruto);
    if (!sessao || typeof sessao.loginEm !== "number") {
      localStorage.removeItem(CHAVE_SESSAO);
      return null;
    }

    // Compatibilidade: sessões antigas não tinham o campo de inatividade
    if (typeof sessao.ultimaInteracaoEm !== "number") {
      return { ...sessao, ultimaInteracaoEm: sessao.loginEm };
    }
    return sessao;
  } catch {
    // JSON corrompido: descarta a entrada inválida
    try {
      localStorage.removeItem(CHAVE_SESSAO);
    } catch {
      // storage totalmente indisponível: apenas ignora
    }
    return null;
  }
}

export function criarSessao(usuario, token, papel = "usuario", email = "") {
  const agora = Date.now();
  localStorage.setItem(
    CHAVE_SESSAO,
    JSON.stringify({
      usuario,
      papel,
      email,
      token,
      loginEm: agora,
      ultimaInteracaoEm: agora,
    }),
  );
}

export function obterToken() {
  return obterSessao()?.token || "";
}

export function encerrarSessao({ notificar = false, motivo = "" } = {}) {
  const haviaSessao = Boolean(obterSessao());
  localStorage.removeItem(CHAVE_SESSAO);
  if (notificar && haviaSessao) {
    const mensagem = motivo || motivoExpiracao();
    try {
      localStorage.setItem(
        CHAVE_AVISO,
        JSON.stringify({ motivo: mensagem, em: Date.now() }),
      );
    } catch {
      // sem storage o aviso só aparece com a página aberta (evento abaixo)
    }
    window.dispatchEvent(
      new CustomEvent(EVENTO_SESSAO_EXPIRADA, { detail: { motivo: mensagem } }),
    );
  }
}

function sessaoExpirada(sessao) {
  return Date.now() - sessao.ultimaInteracaoEm > TEMPO_SESSAO_MS;
}

export function sessaoValida() {
  const sessao = obterSessao();
  if (!sessao) return false;

  if (sessaoExpirada(sessao)) {
    encerrarSessao({ notificar: true });
    return false;
  }
  return true;
}

export function milissegundosRestantes() {
  const sessao = obterSessao();
  if (!sessao) return 0;
  const restante = TEMPO_SESSAO_MS - (Date.now() - sessao.ultimaInteracaoEm);
  return restante > 0 ? restante : 0;
}

export function iniciarVigiaSessao() {
  const eventos = ["click", "keydown", "touchstart", "wheel", "scroll"];

  function renovar(sessao) {
    try {
      localStorage.setItem(
        CHAVE_SESSAO,
        JSON.stringify({ ...sessao, ultimaInteracaoEm: Date.now() }),
      );
    } catch {
      // storage cheio/indisponível: a sessão segue válida na página atual
    }
  }

  function aoInteragir() {
    const sessao = obterSessao();
    if (!sessao) return;

    if (sessaoExpirada(sessao)) {
      encerrarSessao({ notificar: true });
      return;
    }
    if (Date.now() - sessao.ultimaInteracaoEm >= DEBOUNCE_INTERACAO_MS) {
      renovar(sessao);
    }
  }

  eventos.forEach((ev) =>
    window.addEventListener(ev, aoInteragir, { passive: true }),
  );

  const intervalo = setInterval(() => {
    const sessao = obterSessao();
    if (sessao && sessaoExpirada(sessao)) {
      encerrarSessao({ notificar: true });
    }
  }, INTERVALO_CHECAGEM_MS);

  return function pararVigia() {
    eventos.forEach((ev) => window.removeEventListener(ev, aoInteragir));
    clearInterval(intervalo);
  };
}
