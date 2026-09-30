import { error, text } from "@sveltejs/kit";
import { STRIPE_WEBHOOK_SECRET } from "$env/static/private";
import { verificarAssinaturaStripe } from "$lib/server/stripeWebhook";
import { confirmarPagamento } from "$lib/server/pagamentos";
import { sql } from "$lib/server/db";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
  const assinatura = request.headers.get("stripe-signature");
  if (!assinatura) throw error(400, "sem assinatura");

  const corpoBruto = await request.text();

  const resultado = verificarAssinaturaStripe(
    corpoBruto,
    assinatura,
    STRIPE_WEBHOOK_SECRET,
  );
  if (!resultado.valido) {
    console.warn("webhook recusado:", resultado.motivo);
    throw error(400, resultado.motivo ?? "assinatura inválida");
  }

  const evento = JSON.parse(corpoBruto);
  const tipo = evento.type as string;
  const objeto = evento.data?.object ?? {};
  const reservaId: string | undefined =
    objeto.client_reference_id ?? objeto.metadata?.reserva_id;

  if (tipo === "checkout.session.completed") {
    if (reservaId && objeto.payment_status === "paid") {
      await confirmarPagamento(reservaId, objeto.payment_intent ?? null);
    }
  } else if (tipo === "checkout.session.expired") {
    if (reservaId) {
      await sql`
                update reservas
                set status = 'cancelada', motivo_cancelamento = 'expirada', expira_em = null
                where id = ${reservaId} and status = 'pendente' and stripe_session_id = ${objeto.id}
            `;
      await sql`delete from calendario_bloqueios where reserva_id = ${reservaId}`;
      await sql`delete from tarefas where reserva_id = ${reservaId}`;
    }
  }

  return text("ok");
};
