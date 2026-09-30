import { json } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import { exigirEquipe } from "$lib/server/equipe";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request }) => {
  const claims = await extrairClaims(request.headers);
  await exigirEquipe(claims);

  const hoje = new Date().toISOString().slice(0, 10);

  const chegadas = await sql`
        select r.id, r.num_hospedes, r.status, i.id as imovel_id, i.nome as imovel_nome, i.cidade as imovel_cidade
        from reservas r
        join imoveis i on i.id = r.imovel_id
        where r.data_checkin = ${hoje} and r.status in ('confirmada', 'concluida')
        order by i.nome
    `;

  const saidas = await sql`
        select r.id, r.num_hospedes, r.status, i.id as imovel_id, i.nome as imovel_nome, i.cidade as imovel_cidade
        from reservas r
        join imoveis i on i.id = r.imovel_id
        where r.data_checkout = ${hoje} and r.status in ('confirmada', 'concluida')
        order by i.nome
    `;

  const limpezasHoje = await sql`
        select t.id, t.status, t.tipo, i.id as imovel_id, i.nome as imovel_nome
        from tarefas t
        join imoveis i on i.id = t.imovel_id
        where t.data = ${hoje}
        order by i.nome
    `;

  return json({ chegadas, saidas, limpezas: limpezasHoje });
};
