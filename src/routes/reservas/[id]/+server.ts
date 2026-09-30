import { json, error } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request, params }) => {
  const claims = await extrairClaims(request.headers);

  const [reserva] = await sql`
        select
            r.id, r.imovel_id, r.data_checkin, r.data_checkout, r.num_hospedes,
            r.valor_total, r.status, r.criado_em,
            r.expira_em, r.motivo_cancelamento,
            (r.pagamento_id is not null) as pago,
            (r.reembolso_id is not null) as reembolsada,
            r.hospede_id,
            i.nome as imovel_nome,
            i.cidade as imovel_cidade
        from reservas r
        join imoveis i on i.id = r.imovel_id
        where r.id = ${params.id}
    `;

  if (!reserva) throw error(404, "reserva não encontrada");
  if (reserva.hospede_id !== claims.sub) {
    throw error(403, "você não pode ver esta reserva");
  }

  const { hospede_id, ...resposta } = reserva;
  return json(resposta);
};
