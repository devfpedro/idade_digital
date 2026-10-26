import { createContext, useContext } from "react";
import { api, falarPublico } from "./api";

const CHAVE = "acessibilidade";

export const VOZ_PADRAO = "faber";

export const RITMOS = {
  rapido: "Rápido",
  normal: "Normal (recomendado)",
  devagar: "Devagar",
};

const PAUSA_FRASE_MS = 400;
const PAUSA_TITULO_MS = 1100;
const PAUSA_BLOCO_MS = 1600;

// Nomes antigos dos ritmos (antes de 25/10/2026) -> nomes atuais
const RITMOS_ANTIGOS = { normal: "rapido", devagar: "normal", "muito-devagar": "devagar" };

export const PADRAO = {
  escalaFonte: 100,
  altoContraste: false,
  daltonismo: false,
  semAnimacao: false,
  vozId: "",
  ritmo: "normal",
  versao: 2, // versão do formato salvo (migra os nomes antigos dos ritmos)
};

export const ESCALAS_FONTE = [100, 125, 150];

export function lerPreferencias() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) || "{}");
    const prefs = { ...PADRAO };
    if (ESCALAS_FONTE.includes(salvo.escalaFonte)) prefs.escalaFonte = salvo.escalaFonte;
    for (const k of ["altoContraste", "daltonismo", "semAnimacao"]) {
      if (typeof salvo[k] === "boolean") prefs[k] = salvo[k];
    }
    if (typeof salvo.vozId === "string") prefs.vozId = salvo.vozId.slice(0, 40);
    const ritmo = salvo.versao === 2 ? salvo.ritmo : RITMOS_ANTIGOS[salvo.ritmo];
    if (ritmo in RITMOS) prefs.ritmo = ritmo;
    return prefs;
  } catch {
    return { ...PADRAO };
  }
}

export function salvarPreferencias(prefs) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(prefs));
  } catch {
    // storage indisponível: vale só para esta visita
  }
}

export function aplicarNoDocumento(prefs) {
  const raiz = document.documentElement;
  raiz.style.setProperty("--escala-fonte", String(prefs.escalaFonte / 100));
  raiz.toggleAttribute("data-alto-contraste", prefs.altoContraste);
  raiz.toggleAttribute("data-daltonismo", prefs.daltonismo);
  raiz.toggleAttribute("data-sem-animacao", prefs.semAnimacao);
}

export const AcessibilidadeContext = createContext({
  prefs: PADRAO,
  alterar: () => {},
});

export function useAcessibilidade() {
  return useContext(AcessibilidadeContext);
}

let vozes = null;
let vozPublica = null;

// Só guarda em cache o que deu certo (antes do login a resposta é 401).
export function carregarVozes() {
  if (!vozes) {
    vozes = api
      .listarVozesNaturais()
      .then((r) => (r.disponivel ? r.vozes : []))
      .catch(() => {
        vozes = null;
        return [];
      });
  }
  return vozes;
}

export function carregarVozPublica() {
  if (!vozPublica) {
    vozPublica = api
      .vozDisponivelPublico()
      .then((r) => (r.disponivel ? [{ id: VOZ_PADRAO, nome: "Faber", padrao: true }] : []))
      .catch(() => {
        vozPublica = null;
        return [];
      });
  }
  return vozPublica;
}

let leitura = null;

export function pararLeitura() {
  if (!leitura) return;
  leitura.cancelada = true;
  leitura.controle.abort();
  leitura.audio?.pause();
  leitura.cancelarEspera?.();
  leitura = null;
}

function dividirEmTrechos(texto, maximo = 400) {
  const frases = texto.replace(/\s+/g, " ").match(/[^.!?;:]+[.!?;:]*\s*/g) || [texto];
  const trechos = [];
  let atual = "";
  for (const frase of frases) {
    if (atual && atual.length + frase.length > maximo) {
      trechos.push(atual.trim());
      atual = "";
    }
    atual += frase;
  }
  if (atual.trim()) trechos.push(atual.trim());
  return trechos;
}

function montarSegmentos(texto) {
  const segmentos = [];
  const blocos = texto
    .split(/\n+/)
    .map((b) => b.trim())
    .filter((b) => /[\p{L}\p{N}]/u.test(b));
  for (const bloco of blocos) {
    const ehTitulo = bloco.length <= 80 && !/[.!?:;]$/.test(bloco);
    const trechos = dividirEmTrechos(bloco);
    trechos.forEach((trecho, i) => {
      const ultimo = i === trechos.length - 1;
      segmentos.push({
        texto: trecho,
        pausa: ultimo ? (ehTitulo ? PAUSA_TITULO_MS : PAUSA_BLOCO_MS) : PAUSA_FRASE_MS,
      });
    });
  }
  if (segmentos.length) segmentos[segmentos.length - 1].pausa = 0;
  return segmentos;
}

function tocar(blob, leituraAtual) {
  const endereco = URL.createObjectURL(blob);
  const audio = new Audio(endereco);
  leituraAtual.audio = audio;
  return new Promise((resolver) => {
    const fim = () => {
      URL.revokeObjectURL(endereco);
      resolver();
    };
    audio.onended = fim;
    audio.onerror = fim;
    audio.play().catch(fim);
  });
}

function esperar(ms, leituraAtual) {
  return new Promise((resolver) => {
    const timer = setTimeout(resolver, ms);
    leituraAtual.cancelarEspera = () => {
      clearTimeout(timer);
      resolver();
    };
  });
}

export async function lerEmVoz(texto, { vozId = "", ritmo = PADRAO.ritmo, publico = false, aoTerminar } = {}) {
  pararLeitura();
  const disponiveis = await (publico ? carregarVozPublica() : carregarVozes());
  const segmentos = montarSegmentos(texto || "");
  if (segmentos.length === 0 || disponiveis.length === 0) return false;
  const voz = publico ? VOZ_PADRAO : disponiveis.some((v) => v.id === vozId) ? vozId : VOZ_PADRAO;

  const atual = { cancelada: false, controle: new AbortController(), audio: null, cancelarEspera: null };
  leitura = atual;
  const pedidos = [];
  const pedir = (i) => {
    if (!pedidos[i]) {
      pedidos[i] = publico
        ? falarPublico(segmentos[i].texto, atual.controle.signal)
        : api.falar(segmentos[i].texto, voz, ritmo, atual.controle.signal);
      pedidos[i].catch(() => {});
    }
    return pedidos[i];
  };

  try {
    await pedir(0);
  } catch {
    if (leitura === atual) leitura = null;
    return false;
  }

  (async () => {
    for (let i = 0; i < segmentos.length && !atual.cancelada; i += 1) {
      if (i + 1 < segmentos.length) pedir(i + 1);
      let blob = null;
      try {
        blob = await pedir(i);
      } catch {
        if (atual.cancelada) break;
      }
      if (blob) await tocar(blob, atual);
      if (atual.cancelada) break;
      if (segmentos[i].pausa) await esperar(segmentos[i].pausa, atual);
    }
    if (!atual.cancelada) {
      leitura = null;
      aoTerminar?.();
    }
  })();
  return true;
}
