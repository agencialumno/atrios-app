import { API_URL } from "$lib/config";

interface OpcoesRequisicao {
  method?: string;
  body?: unknown;
  autenticado?: boolean;
}

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

  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}${rota}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(
      "Sem conexão com o servidor. Verifique sua internet e tente de novo.",
    );
  }

  if (!resposta.ok) {
    const texto = await resposta.text();
    throw new Error(texto || `Erro ${resposta.status}`);
  }

  return resposta.json();
}
