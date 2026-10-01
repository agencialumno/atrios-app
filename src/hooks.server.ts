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
  "/ical",
  "/demo/ical",
  "/cron",
  "/uploads",
];

export const handle: Handle = async ({ event, resolve }) => {
  const resposta = await resolve(event);

  const ehApi = PREFIXOS_API.some(
    (prefixo) =>
      event.url.pathname === prefixo ||
      event.url.pathname.startsWith(`${prefixo}/`),
  );

  if (ehApi) {
    resposta.headers.set("Cache-Control", "no-store");
  }

  return resposta;
};
