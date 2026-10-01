import { json } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request }) => {
  const claims = await extrairClaims(request.headers);

  const conversas = await sql`
        select
            r.id as reserva_id,
            i.id as imovel_id,
            i.nome as imovel_nome,
            r.data_checkin::text as data_checkin,
            r.data_checkout::text as data_checkout,
            r.status as reserva_status,
            case
                when r.hospede_id = ${claims.sub} then prop.id
                else hosp.id
            end as outro_id,
            case
                when r.hospede_id = ${claims.sub} then prop.nome
                else hosp.nome
            end as outro_nome,
            ultima.texto as ultima_mensagem,
            ultima.criado_em as ultima_mensagem_em,
            ultima.remetente_id as ultima_mensagem_de,
            coalesce(nao_lidas.total, 0)::int as nao_lidas
        from reservas r
        join imoveis i on i.id = r.imovel_id
        join usuarios hosp on hosp.id = r.hospede_id
        join usuarios prop on prop.id = i.proprietario_id
        left join lateral (
            select texto, criado_em, remetente_id
            from mensagens m
            where m.reserva_id = r.id
            order by m.criado_em desc
            limit 1
        ) ultima on true
        left join lateral (
            select count(*) as total
            from mensagens m
            where m.reserva_id = r.id
              and m.remetente_id != ${claims.sub}
              and m.lida = false
        ) nao_lidas on true
        where (r.hospede_id = ${claims.sub} or i.proprietario_id = ${claims.sub})
          and ultima.texto is not null
        order by ultima.criado_em desc
    `;

  return json(conversas);
};
