import { sql } from "$lib/server/db";
import { STRIPE_SECRET_KEY } from "$env/static/private";

/** Por quanto tempo uma reserva ainda não paga segura as datas */
export const MINUTOS_RESERVA = 33;
/** A página de pagamento expira antes da reserva (o Stripe exige no mínimo 30 minutos) */
const MINUTOS_SESSAO = 31;

/** Sem a chave do Stripe nas variáveis de ambiente, as reservas continuam nascendo confirmadas */
export function stripeAtivo(): boolean {
  return !!STRIPE_SECRET_KEY && STRIPE_SECRET_KEY.trim().length > 0;
}

function dataCurta(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

async function chamarStripe(
  metodo: "GET" | "POST",
  caminho: string,
  campos?: Record<string, string>,
  idempotencia?: string,
): Promise<any> {
  const cabecalhos: Record<string, string> = {
    Authorization: `Bearer ${STRIPE_SECRET_KEY.trim()}`,
  };
  if (idempotencia) cabecalhos["Idempotency-Key"] = idempotencia;

  let corpo: string | undefined;
  if (metodo === "POST" && campos) {
    cabecalhos["Content-Type"] = "application/x-www-form-urlencoded";
    corpo = new URLSearchParams(campos).toString();
  }

  const resposta = await fetch(`https://api.stripe.com${caminho}`, {
    method: metodo,
    headers: cabecalhos,
    body: corpo,
  });

  const json = await resposta.json();

  if (!resposta.ok) {
    const mensagem = json?.error?.message ?? "erro desconhecido";
    throw new Error(`Stripe: ${mensagem}`);
  }

  return json;
}

interface DadosSessao {
  imovelNome: string;
  endereco: string;
  checkin: string;
  checkout: string;
  numHospedes: number;
  valorTotal: number;
  emailHospede: string;
  origem: string; // event.url.origin da requisição, para montar success_url/cancel_url
}

/** Cria a página de pagamento da reserva e devolve o endereço dela */
export async function criarSessao(
  reservaId: string,
  d: DadosSessao,
): Promise<string> {
  const noites = Math.round(
    (new Date(d.checkout).getTime() - new Date(d.checkin).getTime()) /
      86_400_000,
  );

  const apto = d.endereco.includes(",")
    ? d.endereco.split(",").pop()!.trim()
    : "";
  const nomeProduto = `${d.imovelNome}${apto ? ` · Apto ${apto}` : ""} · ${noites} ${noites === 1 ? "noite" : "noites"}`;
  const descricao = `${dataCurta(d.checkin)} a ${dataCurta(d.checkout)} · ${d.numHospedes} ${d.numHospedes === 1 ? "hóspede" : "hóspedes"}`;

  const expiraEm = Math.floor(Date.now() / 1000) + MINUTOS_SESSAO * 60;
  const centavos = Math.round(d.valorTotal * 100);

  const campos: Record<string, string> = {
    mode: "payment",
    locale: "pt-BR",
    "payment_method_types[0]": "card",
    client_reference_id: reservaId,
    expires_at: String(expiraEm),
    success_url: `${d.origem}/pagamentos/retorno?resultado=ok&reserva=${reservaId}`,
    cancel_url: `${d.origem}/pagamentos/retorno?resultado=cancelado&reserva=${reservaId}`,
    "metadata[reserva_id]": reservaId,
    "payment_intent_data[metadata][reserva_id]": reservaId,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "brl",
    "line_items[0][price_data][unit_amount]": String(centavos),
    "line_items[0][price_data][product_data][name]": nomeProduto,
    "line_items[0][price_data][product_data][description]": descricao,
  };

  if (d.emailHospede.includes("@")) {
    campos["customer_email"] = d.emailHospede;
  }

  const json = await chamarStripe("POST", "/v1/checkout/sessions", campos);

  await sql`
        update reservas
        set stripe_session_id = ${json.id}, expira_em = now() + interval '${sql.unsafe(String(MINUTOS_RESERVA))} minutes'
        where id = ${reservaId} and status = 'pendente'
    `;

  return json.url;
}

/** Devolve o valor integral ao cartão. Repetir a chamada não cobra duas vezes (chave de idempotência). */
export async function reembolsar(
  paymentIntent: string,
  reservaId: string,
): Promise<string> {
  const json = await chamarStripe(
    "POST",
    "/v1/refunds",
    { payment_intent: paymentIntent, "metadata[reserva_id]": reservaId },
    `reembolso-${reservaId}`,
  );
  return json.id;
}

/** Encerra a página de pagamento (melhor esforço: se já expirou ou foi paga, o erro é ignorado) */
export async function expirarSessaoStripe(sessaoId: string): Promise<void> {
  try {
    await chamarStripe("POST", `/v1/checkout/sessions/${sessaoId}/expire`);
  } catch {
    // já expirada ou já paga — sem problema
  }
}

export async function expirarSessaoDaReserva(reservaId: string): Promise<void> {
  if (!stripeAtivo()) return;

  const [linha] = await sql`
        select stripe_session_id from reservas where id = ${reservaId}
    `;
  if (linha?.stripe_session_id) {
    await expirarSessaoStripe(linha.stripe_session_id);
  }
}

/** Marca a reserva como paga e cria a limpeza da equipe. Repetir a chamada não faz mal. */
export async function confirmarPagamento(
  reservaId: string,
  paymentIntent: string | null,
): Promise<void> {
  const [alterada] = await sql`
        update reservas
        set status = 'confirmada', pagamento_id = ${paymentIntent}, pago_em = now(), expira_em = null
        where id = ${reservaId} and status = 'pendente'
        returning imovel_id, data_checkout
    `;

  if (alterada) {
    await sql`
            insert into tarefas (id, imovel_id, reserva_id, tipo, data)
            select gen_random_uuid()::text, ${alterada.imovel_id}, ${reservaId}, 'limpeza', ${alterada.data_checkout}
            where not exists (select 1 from tarefas where reserva_id = ${reservaId})
        `;
    return;
  }

  // A reserva não estava pendente. Se já foi cancelada e o pagamento entrou, devolve o dinheiro.
  const [atual] = await sql`
        select status, reembolso_id from reservas where id = ${reservaId}
    `;

  if (atual?.status === "cancelada" && !atual.reembolso_id && paymentIntent) {
    const reembolsoId = await reembolsar(paymentIntent, reservaId);
    await sql`
            update reservas
            set pagamento_id = ${paymentIntent}, pago_em = now(), reembolso_id = ${reembolsoId}
            where id = ${reservaId}
        `;
  }
}

/** Pergunta ao Stripe se a reserva pendente já foi paga (cobre o caso de o webhook não ter chegado) */
export async function reconciliar(reservaId: string): Promise<void> {
  if (!stripeAtivo()) return;

  const [linha] = await sql`
        select status, stripe_session_id from reservas where id = ${reservaId}
    `;
  if (!linha || linha.status !== "pendente" || !linha.stripe_session_id) return;

  try {
    const sessao = await chamarStripe(
      "GET",
      `/v1/checkout/sessions/${linha.stripe_session_id}`,
    );
    if (sessao.payment_status === "paid") {
      await confirmarPagamento(reservaId, sessao.payment_intent ?? null);
    }
  } catch {
    // falha ao consultar o Stripe: não trava a resposta, só não reconcilia agora
  }
}

/** Cancela uma reserva pendente que passou do prazo e libera as datas */
async function expirarReserva(reservaId: string): Promise<boolean> {
  const [alterada] = await sql`
        update reservas
        set status = 'cancelada', motivo_cancelamento = 'expirada', expira_em = null
        where id = ${reservaId} and status = 'pendente'
        returning id
    `;

  if (alterada) {
    await sql`delete from calendario_bloqueios where reserva_id = ${reservaId}`;
    await sql`delete from tarefas where reserva_id = ${reservaId}`;
    return true;
  }
  return false;
}

/** Libera as datas das reservas pendentes que passaram do prazo (chamado pelo Cron e sob demanda) */
export async function expirarPendentes(): Promise<void> {
  const vencidas = await sql`
        select id, stripe_session_id from reservas
        where status = 'pendente' and expira_em is not null and expira_em < now()
    `;

  for (const v of vencidas) {
    await reconciliar(v.id); // última chance: o pagamento pode ter entrado sem o webhook chegar
    const expirou = await expirarReserva(v.id);
    if (expirou && v.stripe_session_id) {
      await expirarSessaoStripe(v.stripe_session_id);
    }
  }
}
