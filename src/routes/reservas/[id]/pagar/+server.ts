import { json, error } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import {
  stripeAtivo,
  criarSessao,
  reconciliar,
  expirarPendentes,
} from "$lib/server/pagamentos";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, params, url }) => {
  const claims = await extrairClaims(request.headers);

  if (!stripeAtivo()) {
    throw error(400, "o pagamento online não está ativo");
  }

  const [reserva] = await sql`
        select r.*, i.nome, i.endereco, i.cidade
        from reservas r
        join imoveis i on i.id = r.imovel_id
        where r.id = ${params.id}
    `;
  if (!reserva) throw error(404, "reserva não encontrada");
  if (reserva.hospede_id !== claims.sub) {
    throw error(403, "você não pode pagar esta reserva");
  }

  await reconciliar(params.id);
  await expirarPendentes();

  const [atual] =
    await sql`select status, stripe_session_id, hospede_id from reservas where id = ${params.id}`;

  if (atual.status === "confirmada") {
    return json({ status: atual.status, checkout_url: null });
  }
  if (atual.status !== "pendente") {
    throw error(400, "o prazo para pagar esta reserva acabou");
  }

  const [usuario] =
    await sql`select email from usuarios where id = ${claims.sub}`;

  try {
    const checkoutUrl = await criarSessao(params.id, {
      imovelNome: reserva.nome,
      endereco: reserva.endereco,
      checkin: reserva.data_checkin,
      checkout: reserva.data_checkout,
      numHospedes: reserva.num_hospedes,
      valorTotal: Number(reserva.valor_total),
      emailHospede: usuario?.email ?? "",
      origem: url.origin,
    });
    return json({ status: atual.status, checkout_url: checkoutUrl });
  } catch {
    throw error(
      502,
      "Não foi possível abrir o pagamento agora. Tente de novo em instantes.",
    );
  }
};
