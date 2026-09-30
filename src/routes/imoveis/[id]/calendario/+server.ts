import { json } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params }) => {
  const bloqueios = await sql`
        select data_inicio, data_fim, origem
        from calendario_bloqueios
        where imovel_id = ${params.id}
        order by data_inicio
    `;
  return json(bloqueios);
};
