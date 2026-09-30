import { json, error } from "@sveltejs/kit";
import { randomUUID } from "node:crypto";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import { existeConflito } from "$lib/server/calendario";
import {
  stripeAtivo,
  criarSessao,
  MINUTOS_RESERVA,
} from "$lib/server/pagamentos";
import type { RequestHandler } from "./$types";

interface NovaReserva {
  imovel_id: string;
  data_checkin: string; // AAAA-MM-DD
  data_checkout: string;
  num_hospedes: number;
}

export const POST: RequestHandler = async ({ request, url }) => {
  const claims = await extrairClaims(request.headers);
  const corpo = (await request.json()) as NovaReserva;

  const checkin = new Date(`${corpo.data_checkin}T00:00:00Z`);
  const checkout = new Date(`${corpo.data_checkout}T00:00:00Z`);
  const hoje = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");

  if (isNaN(checkin.getTime()) || isNaN(checkout.getTime())) {
    throw error(400, "datas inválidas");
  }
  if (checkin >= checkout) {
    throw error(400, "data de check-in deve ser anterior ao check-out");
  }
  if (checkin < hoje) {
    throw error(400, "a data de check-in já passou");
  }
  if (corpo.num_hospedes < 1) {
    throw error(400, "informe ao menos 1 hóspede");
  }

  const [imovel] = await sql`
        select proprietario_id, capacidade_hospedes, preco_base_noite, status, nome, endereco, cidade
        from imoveis
        where id = ${corpo.imovel_id}
    `;
  if (!imovel) throw error(404, "imóvel não encontrado");

  if (imovel.status !== "ativo") {
    throw error(400, "este anúncio está pausado e não aceita novas reservas");
  }
  if (imovel.proprietario_id === claims.sub) {
    throw error(403, "você não pode reservar o seu próprio imóvel");
  }
  if (corpo.num_hospedes > imovel.capacidade_hospedes) {
    throw error(
      400,
      `imóvel comporta no máximo ${imovel.capacidade_hospedes} hóspedes`,
    );
  }

  if (
    await existeConflito(
      corpo.imovel_id,
      corpo.data_checkin,
      corpo.data_checkout,
    )
  ) {
    throw error(409, "imóvel indisponível nas datas selecionadas");
  }

  const noites = Math.round(
    (checkout.getTime() - checkin.getTime()) / 86_400_000,
  );
  const valorTotal = noites * Number(imovel.preco_base_noite);

  // Com o Stripe ligado, a reserva nasce pendente e só confirma depois do pagamento
  const cobrar = stripeAtivo();
  const status = cobrar ? "pendente" : "confirmada";

  const reservaId = randomUUID();
  const bloqueioId = randomUUID();

  await sql.begin(async (tx) => {
    await tx`
            insert into reservas (id, imovel_id, hospede_id, data_checkin, data_checkout, num_hospedes, valor_total, status, expira_em)
            values (
                ${reservaId}, ${corpo.imovel_id}, ${claims.sub}, ${corpo.data_checkin}, ${corpo.data_checkout},
                ${corpo.num_hospedes}, ${valorTotal}, ${status},
                case when ${status} = 'pendente' then now() + interval '${sql.unsafe(String(MINUTOS_RESERVA))} minutes' end
            )
        `;

    await tx`
            insert into calendario_bloqueios (id, imovel_id, data_inicio, data_fim, origem, reserva_id)
            values (${bloqueioId}, ${corpo.imovel_id}, ${corpo.data_checkin}, ${corpo.data_checkout}, 'atrios_reserva', ${reservaId})
        `;

    if (!cobrar) {
      await tx`
                insert into tarefas (id, imovel_id, reserva_id, tipo, data)
                values (${randomUUID()}, ${corpo.imovel_id}, ${reservaId}, 'limpeza', ${corpo.data_checkout})
            `;
    }
  });

  let checkoutUrl: string | null = null;

  if (cobrar) {
    const [usuario] =
      await sql`select email from usuarios where id = ${claims.sub}`;

    try {
      checkoutUrl = await criarSessao(reservaId, {
        imovelNome: imovel.nome,
        endereco: `${imovel.endereco}`,
        checkin: corpo.data_checkin,
        checkout: corpo.data_checkout,
        numHospedes: corpo.num_hospedes,
        valorTotal,
        emailHospede: usuario?.email ?? "",
        origem: url.origin,
      });
    } catch (e) {
      // Desfaz: as datas voltam a ficar livres
      await sql`delete from calendario_bloqueios where reserva_id = ${reservaId}`;
      await sql`delete from reservas where id = ${reservaId}`;

      throw error(
        502,
        "Não foi possível iniciar o pagamento. Tente de novo em instantes.",
      );
    }
  }

  const [reserva] = await sql`select * from reservas where id = ${reservaId}`;

  return json({ ...reserva, checkout_url: checkoutUrl });
};

export const GET: RequestHandler = async ({ request }) => {
  const claims = await extrairClaims(request.headers);

  const reservas = await sql`
        select
            r.id, r.imovel_id, r.data_checkin, r.data_checkout, r.num_hospedes,
            r.valor_total, r.status, r.criado_em,
            r.expira_em, r.motivo_cancelamento,
            (r.pagamento_id is not null) as pago,
            (r.reembolso_id is not null) as reembolsada,
            i.nome as imovel_nome,
            i.cidade as imovel_cidade,
            (i.fotos->>0) as imovel_foto
        from reservas r
        join imoveis i on i.id = r.imovel_id
        where r.hospede_id = ${claims.sub}
        order by r.data_checkin desc
    `;

  return json(reservas);
};
