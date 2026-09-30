import { json } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import { exigirEquipe } from "$lib/server/equipe";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request, url }) => {
  const claims = await extrairClaims(request.headers);
  await exigirEquipe(claims);

  const apenasPendentes = url.searchParams.get("pendentes") === "1";

  const tarefas = apenasPendentes
    ? await sql`
              select t.id, t.imovel_id, t.reserva_id, t.tipo, t.data, t.status,
                     t.concluida_por, t.concluida_em, i.nome as imovel_nome, i.cidade as imovel_cidade
              from tarefas t
              join imoveis i on i.id = t.imovel_id
              where t.status = 'pendente'
              order by t.data
          `
    : await sql`
              select t.id, t.imovel_id, t.reserva_id, t.tipo, t.data, t.status,
                     t.concluida_por, t.concluida_em, i.nome as imovel_nome, i.cidade as imovel_cidade
              from tarefas t
              join imoveis i on i.id = t.imovel_id
              order by t.data desc
          `;

  return json(tarefas);
};
