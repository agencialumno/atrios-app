import { text, error } from "@sveltejs/kit";
import { expirarPendentes } from "$lib/server/pagamentos";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request }) => {
  // A Vercel manda esse cabeçalho sozinha nas chamadas de Cron — protege contra chamada externa
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    throw error(401, "não autorizado");
  }

  await expirarPendentes();
  return text("ok");
};
