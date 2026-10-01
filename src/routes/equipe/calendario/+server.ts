import { json } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import { exigirEquipe } from "$lib/server/equipe";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request }) => {
  const claims = await extrairClaims(request.headers);
  await exigirEquipe(claims);

  const imoveis = await sql`
        select id, nome, cidade, endereco, status
        from imoveis
        order by nome
    `;

  const bloqueios = await sql`
        select
            b.imovel_id,
            b.data_inicio::text as data_inicio,
            b.data_fim::text as data_fim,
            b.origem,
            b.reserva_id,
            u.nome as hospede_nome,
            r.num_hospedes
        from calendario_bloqueios b
        left join reservas r on r.id = b.reserva_id
        left join usuarios u on u.id = r.hospede_id
        order by b.data_inicio
    `;

  return json({ imoveis, bloqueios });
};
