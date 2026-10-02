// Gerenciamento de sessão do "Idade Digital".
//
// A sessão expira APENAS por inatividade: cada interação reconhecida
// (clique, tecla, toque, rolagem) renova o timestamp `ultimaInteracaoEm`
// (com debounce para evitar escritas repetidas no localStorage). Ao expirar,
// um evento global é disparado — o App.jsx mostra o toast e redireciona.
//
// Estrutura persistida: { usuario, loginEm, ultimaInteracaoEm }

const CHAVE_SESSAO = "sessao";
export const TEMPO_SESSAO_MS = 10 * 60 * 1000; // 10 minutos sem interação
const DEBOUNCE_INTERACAO_MS = 5_000; // frequência mínima de gravação no storage
const INTERVALO_CHECAGEM_MS = 15_000; // checagem periódica de expiração

export const EVENTO_SESSAO_EXPIRADA = "idade-digital:sessao-expirada";

function motivoExpiracao() {
  if (TEMPO_SESSAO_MS < 60_000) {
    const segundos = Math.round(TEMPO_SESSAO_MS / 1000);
    return `Sua sessão expirou após ${segundos} segundos de inatividade. Faça login novamente.`;
  }
  const minutos = Math.round(TEMPO_SESSAO_MS / 60000);
  const periodo = minutos === 1 ? "1 minuto" : `${minutos} minutos`;
  return `Sua sessão expirou após ${periodo} de inatividade. Faça login novamente.`;
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

export function criarSessao(usuario) {
  const agora = Date.now();
  localStorage.setItem(
    CHAVE_SESSAO,
    JSON.stringify({ usuario, loginEm: agora, ultimaInteracaoEm: agora }),
  );
}

export function encerrarSessao({ notificar = false, motivo = "" } = {}) {
  const haviaSessao = Boolean(obterSessao());
  localStorage.removeItem(CHAVE_SESSAO);
  if (notificar && haviaSessao) {
    window.dispatchEvent(
      new CustomEvent(EVENTO_SESSAO_EXPIRADA, {
        detail: { motivo: motivo || motivoExpiracao() },
      }),
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

// Vigia único da sessão: ouve as interações do usuário para RENOVAR o
// timestamp de inatividade e, ao mesmo tempo, detectar a expiração —
// tanto no instante da interação quanto na checagem periódica (usuário
// completamente parado). Retorna a função que remove tudo.
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
    if (!sessao) return; // sem sessão (login/tela pública): nada a fazer

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
