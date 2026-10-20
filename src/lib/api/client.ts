import { goto } from "$app/navigation";
import { API_URL } from "$lib/config";
import { auth } from "$lib/stores/auth";

interface OpcoesRequisicao {
  method?: string;
  body?: unknown;
  autenticado?: boolean;
  /** false: em 401 só limpa a sessão, sem mandar para o login (ex.: checagem silenciosa ao abrir o site) */
  redirecionarNo401?: boolean;
}

const TIMEOUT_MS = 15000;

export async function api<T>(
  rota: string,
  opcoes: OpcoesRequisicao = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    autenticado = false,
    redirecionarNo401 = true,
  } = opcoes;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (autenticado) {
    const token = localStorage.getItem("atrios_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_MS);

  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}${rota}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controlador.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(
        "A conexão está muito lenta. Verifique sua internet e tente de novo.",
      );
    }
    throw new Error(
      "Sem conexão com o servidor. Verifique sua internet e tente de novo.",
    );
  } finally {
    clearTimeout(temporizador);
  }

  // Token recusado pelo servidor (expirado, ou emitido por outro servidor/segredo): a sessão salva
  // não serve mais. Limpa e manda para o login em vez de deixar a tela quebrada com erro.
  if (resposta.status === 401 && autenticado) {
    auth.logout();
    if (redirecionarNo401 && !window.location.pathname.startsWith("/login")) {
      goto("/login");
    }
    throw new Error("Sua sessão expirou. Entre novamente.");
  }

  if (!resposta.ok) {
    let mensagem = `Não foi possível concluir (erro ${resposta.status}).`;
    try {
      const corpo = await resposta.json();
      if (corpo && typeof corpo.message === "string" && corpo.message.trim()) {
        mensagem = corpo.message;
      }
    } catch {
      // resposta não era JSON: mantém a mensagem genérica
    }
    throw new Error(mensagem);
  }

  return resposta.json();
}
