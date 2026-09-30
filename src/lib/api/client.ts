import { API_URL } from "$lib/config";

interface OpcoesRequisicao {
  method?: string;
  body?: unknown;
  autenticado?: boolean;
}

const TIMEOUT_MS = 15000;

export async function api<T>(
  rota: string,
  opcoes: OpcoesRequisicao = {},
): Promise<T> {
  const { method = "GET", body, autenticado = false } = opcoes;

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

  if (!resposta.ok) {
    const texto = await resposta.text();
    throw new Error(texto || `Erro ${resposta.status}`);
  }

  return resposta.json();
}
