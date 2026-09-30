import { json, error } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import {
  stripeAtivo,
  reembolsar,
  expirarSessaoDaReserva,
  reconciliar,
} from "$lib/server/pagamentos";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, params }) => {
  const claims = await extrairClaims(request.headers);

  await reconciliar(params.id);

  const [reserva] = await sql`select * from reservas where id = ${params.id}`;
  if (!reserva) throw error(404, "reserva não encontrada");
  if (reserva.hospede_id !== claims.sub) {
    throw error(403, "você não pode cancelar esta reserva");
  }
  if (reserva.status !== "confirmada" && reserva.status !== "pendente") {
    throw error(400, "esta reserva não pode mais ser cancelada");
  }

  const hoje = new Date().toISOString().slice(0, 10);
  if (reserva.data_checkin <= hoje) {
    throw error(400, "não é possível cancelar uma reserva que já começou");
  }

  let reembolsoId: string | null = null;

  if (reserva.status === "confirmada" && reserva.pagamento_id) {
    if (!stripeAtivo()) {
      throw error(
        503,
        "o reembolso não está disponível agora. Tente de novo mais tarde.",
      );
    }
    try {
      reembolsoId = await reembolsar(reserva.pagamento_id, reserva.id);
    } catch {
      throw error(
        502,
        "não foi possível fazer o reembolso agora, então a reserva não foi cancelada. Tente de novo em instantes.",
      );
    }
  }

  if (reserva.status === "pendente") {
    await expirarSessaoDaReserva(reserva.id);
  }

  await sql.begin(async (tx) => {
    await tx`
            update reservas
            set status = 'cancelada', motivo_cancelamento = 'hospede', expira_em = null, reembolso_id = ${reembolsoId}
            where id = ${params.id}
        `;
    await tx`delete from calendario_bloqueios where reserva_id = ${params.id}`;
    await tx`delete from tarefas where reserva_id = ${params.id}`;
  });

  const [atualizada] =
    await sql`select * from reservas where id = ${params.id}`;
  return json(atualizada);
};
