import { writable } from "svelte/store";
import { api } from "$lib/api/client";

const INTERVALO_MS = 30000;

/** Total de mensagens não lidas, mostrado no ícone de Mensagens da barra de navegação */
export const naoLidas = writable(0);

let ativo = false;
let temporizador: ReturnType<typeof setInterval> | null = null;

/** Busca o total. Em erro de rede mantém o último valor. */
export async function atualizarNaoLidas(): Promise<void> {
  if (!ativo) return;
  try {
    const r = await api<{ total: number }>("/conversas/nao-lidas", {
      autenticado: true,
      redirecionarNo401: false,
    });
    if (ativo && typeof r.total === "number") naoLidas.set(r.total);
  } catch {
    // sem rede ou servidor fora: mantém o último valor
  }
}

function aoVoltarOFoco() {
  if (document.visibilityState === "visible") void atualizarNaoLidas();
}

/** Liga o acompanhamento (sessão iniciada). Devolve a função que desliga e zera o total. */
export function iniciarNaoLidas(): () => void {
  pararNaoLidas();
  ativo = true;
  void atualizarNaoLidas();
  temporizador = setInterval(aoVoltarOFoco, INTERVALO_MS);
  document.addEventListener("visibilitychange", aoVoltarOFoco);
  window.addEventListener("focus", aoVoltarOFoco);
  return pararNaoLidas;
}

export function pararNaoLidas(): void {
  ativo = false;
  if (temporizador) clearInterval(temporizador);
  temporizador = null;
  document.removeEventListener("visibilitychange", aoVoltarOFoco);
  window.removeEventListener("focus", aoVoltarOFoco);
  naoLidas.set(0);
}
