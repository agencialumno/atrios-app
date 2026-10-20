import type { Handle } from "@sveltejs/kit";

// Prefixos de rota que são API (não páginas) — toda resposta delas nunca deve ser
// guardada em cache pelo navegador, porque os dados mudam a cada ação do usuário.
// Foi aqui que já pegamos dois bugs reais (painel do anfitrião, status do imóvel):
// o navegador reaproveitava uma resposta antiga sem nem chamar o servidor de novo.
const PREFIXOS_API = [
  "/auth",
  "/imoveis",
  "/reservas",
  "/pagamentos",
  "/anfitriao",
  "/equipe",
  "/conversas",
  "/ical",
  "/demo/ical",
  "/cron",
  "/health",
  "/checkin",
  "/uploads",
];

// O app nativo (Tauri) roda em tauri://localhost / http://tauri.localhost, uma origem diferente da API.
// A autenticação é por cabeçalho Authorization (sem cookies), então liberar qualquer origem é seguro.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export const handle: Handle = async ({ event, resolve }) => {
  const ehApi = PREFIXOS_API.some(
    (prefixo) =>
      event.url.pathname === prefixo ||
      event.url.pathname.startsWith(`${prefixo}/`),
  );

  // Preflight: o navegador/WebView pergunta antes de mandar Content-Type JSON ou Authorization
  if (ehApi && event.request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  const resposta = await resolve(event);

  if (ehApi) {
    resposta.headers.set("Cache-Control", "no-store");
    for (const [nome, valor] of Object.entries(CORS)) {
      resposta.headers.set(nome, valor);
    }
  }

  return resposta;
};
