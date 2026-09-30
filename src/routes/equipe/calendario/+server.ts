import { json } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import { exigirEquipe } from "$lib/server/equipe";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request }) => {
  const claims = await extrairClaims(request.headers);
  await exigirEquipe(claims);

  const imoveis = await sql`
        select id, nome, cidade, status
        from imoveis
        order by nome
    `;

  const bloqueios = await sql`
        select imovel_id, data_inicio, data_fim, origem, reserva_id
        from calendario_bloqueios
        order by data_inicio
    `;

  return json({ imoveis, bloqueios });
};
