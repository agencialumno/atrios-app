import { json } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import { exigirEquipe } from "$lib/server/equipe";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request }) => {
  const claims = await extrairClaims(request.headers);
  await exigirEquipe(claims);

  const tarefas = await sql`
        select
            t.id, t.imovel_id, i.nome as imovel_nome, i.cidade as imovel_cidade,
            t.data::text as data, t.status,
            u.nome as hospede_nome,
            cu.nome as concluida_por_nome,
            t.concluida_em::text as concluida_em
        from tarefas t
        join imoveis i on i.id = t.imovel_id
        left join reservas r on r.id = t.reserva_id
        left join usuarios u on u.id = r.hospede_id
        left join usuarios cu on cu.id = t.concluida_por
        order by t.data
    `;

  const checkins = await sql`
        select imovel_id, data_checkin::text as data_checkin
        from reservas
        where status in ('confirmada', 'concluida')
    `;

  function proximoCheckin(imovelId: string, data: string): string | null {
    const candidatos = checkins
      .filter((r) => r.imovel_id === imovelId && r.data_checkin >= data)
      .map((r) => r.data_checkin)
      .sort();
    return candidatos[0] ?? null;
  }

  const resultado = tarefas.map((t) => {
    const proximo = proximoCheckin(t.imovel_id, t.data);
    return {
      id: t.id,
      imovel_id: t.imovel_id,
      imovel_nome: t.imovel_nome,
      imovel_cidade: t.imovel_cidade,
      data: t.data,
      status: t.status,
      hospede_nome: t.hospede_nome,
      urgente: proximo === t.data,
      proximo_checkin: proximo,
      concluida_por_nome: t.concluida_por_nome,
      concluida_em: t.concluida_em,
    };
  });

  return json(resultado);
};
