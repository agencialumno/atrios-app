import { json } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import { COMISSAO_ATRIOS } from "$lib/server/constantes";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request }) => {
  const claims = await extrairClaims(request.headers);

  const imoveis = await sql`
        select
            id, nome, endereco, cidade,
            capacidade_hospedes, quartos, banheiros, preco_base_noite,
            fotos::text as fotos, categoria, status, criado_em
        from imoveis
        where proprietario_id = ${claims.sub}
        order by criado_em desc
    `;

  const reservas = await sql`
        select
            r.id, r.imovel_id, r.data_checkin, r.data_checkout,
            r.num_hospedes, r.valor_total, r.status, r.criado_em,
            i.nome as imovel_nome
        from reservas r
        join imoveis i on i.id = r.imovel_id
        where i.proprietario_id = ${claims.sub}
        order by r.data_checkin desc
    `;

  // Só reservas confirmadas/concluídas entram na receita (pendente/cancelada, não)
  const reservasPagas = reservas.filter(
    (r) => r.status === "confirmada" || r.status === "concluida",
  );
  const receitaBruta = reservasPagas.reduce(
    (soma, r) => soma + Number(r.valor_total),
    0,
  );
  const comissao = receitaBruta * COMISSAO_ATRIOS;
  const receitaLiquida = receitaBruta - comissao;

  return json({
    imoveis,
    reservas,
    resumo: {
      total_imoveis: imoveis.length,
      total_reservas: reservasPagas.length,
      receita_bruta: receitaBruta,
      comissao_atrios: comissao,
      receita_liquida: receitaLiquida,
    },
  });
};
