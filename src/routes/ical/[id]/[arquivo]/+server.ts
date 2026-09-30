import { error, text } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import { gerarICS } from "$lib/server/ical";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params, url }) => {
  const token = params.arquivo.replace(/\.ics$/, "");
  const destino = url.searchParams.get("para"); // 'airbnb' | 'booking' | null

  const [imovel] = await sql`
        select id, nome, ical_token from imoveis where id = ${params.id}
    `;

  if (!imovel || !imovel.ical_token || imovel.ical_token !== token) {
    throw error(404, "calendário não encontrado");
  }

  const bloqueios = await sql`
        select data_inicio, data_fim, origem from calendario_bloqueios where imovel_id = ${params.id}
    `;

  const ics = gerarICS(bloqueios, imovel.nome, destino);

  return text(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8" },
  });
};
