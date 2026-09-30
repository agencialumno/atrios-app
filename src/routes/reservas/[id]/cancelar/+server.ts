import { json, error } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, params }) => {
  const claims = await extrairClaims(request.headers);

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

  // TODO: quando o Stripe entrar, uma reserva paga precisa de reembolso aqui antes de cancelar

  await sql.begin(async (tx) => {
    await tx`
            update reservas
            set status = 'cancelada', motivo_cancelamento = 'hospede'
            where id = ${params.id}
        `;
    await tx`delete from calendario_bloqueios where reserva_id = ${params.id}`;
    await tx`delete from tarefas where reserva_id = ${params.id}`;
  });

  const [atualizada] =
    await sql`select * from reservas where id = ${params.id}`;
  return json(atualizada);
};
