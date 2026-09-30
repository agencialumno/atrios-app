import { text, error } from "@sveltejs/kit";
import { randomUUID } from "node:crypto";
import { sql } from "$lib/server/db";
import { parsearICS } from "$lib/server/ical";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request }) => {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    throw error(401, "não autorizado");
  }

  const conectados =
    await sql`select imovel_id, origem, url from calendarios_externos`;

  for (const c of conectados) {
    let ultimoErro: string | null = null;
    let eventosImportados = 0;

    try {
      const resposta = await fetch(c.url);
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
      const texto = await resposta.text();
      const eventos = parsearICS(texto);

      await sql`delete from calendario_bloqueios where imovel_id = ${c.imovel_id} and origem = ${c.origem}`;
      for (const ev of eventos) {
        await sql`
                    insert into calendario_bloqueios (id, imovel_id, data_inicio, data_fim, origem)
                    values (${randomUUID()}, ${c.imovel_id}, ${ev.dataInicio}, ${ev.dataFim}, ${c.origem})
                `;
      }
      eventosImportados = eventos.length;
    } catch (e) {
      ultimoErro =
        e instanceof Error ? e.message : "falha ao buscar o calendário";
    }

    await sql`
            update calendarios_externos
            set ultima_sincronizacao = now(), ultimo_erro = ${ultimoErro}, eventos_importados = ${eventosImportados}
            where imovel_id = ${c.imovel_id} and origem = ${c.origem}
        `;
  }

  return text("ok");
};
