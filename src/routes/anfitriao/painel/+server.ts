import { json } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import { COMISSAO_ATRIOS } from "$lib/server/constantes";
import type { RequestHandler } from "./$types";

function somarDias(iso: string, dias: number): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const d = new Date(ano, mes - 1, dia);
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function diferencaDias(inicio: string, fim: string): number {
  const [a1, m1, d1] = inicio.split("-").map(Number);
  const [a2, m2, d2] = fim.split("-").map(Number);
  const t1 = new Date(a1, m1 - 1, d1).getTime();
  const t2 = new Date(a2, m2 - 1, d2).getTime();
  return Math.round((t2 - t1) / 86_400_000);
}

function primeiraFoto(fotosJson: string | null): string | null {
  try {
    const lista = JSON.parse(fotosJson ?? "[]");
    return Array.isArray(lista) && lista.length > 0 ? lista[0] : null;
  } catch {
    return null;
  }
}

export const GET: RequestHandler = async ({ request }) => {
  const claims = await extrairClaims(request.headers);
  const hoje = new Date().toISOString().slice(0, 10);
  const mesAtual = hoje.slice(0, 7);

  const imoveisBrutos = await sql`
        select id, nome, cidade, categoria, status, preco_base_noite, fotos::text as fotos
        from imoveis
        where proprietario_id = ${claims.sub}
        order by criado_em desc
    `;

  const imovelIds = imoveisBrutos.map((i) => i.id);

  const reservasBrutas =
    imovelIds.length === 0
      ? []
      : await sql`
                  select
                      r.id, r.imovel_id, i.nome as imovel_nome, u.nome as hospede_nome,
                      r.data_checkin::text as data_checkin, r.data_checkout::text as data_checkout,
                      r.num_hospedes, r.status, r.valor_total
                  from reservas r
                  join imoveis i on i.id = r.imovel_id
                  join usuarios u on u.id = r.hospede_id
                  where r.imovel_id = any(${imovelIds})
                  order by r.data_checkin desc
              `;

  const bloqueiosBrutos =
    imovelIds.length === 0
      ? []
      : await sql`
                  select imovel_id, data_inicio::text as data_inicio, data_fim::text as data_fim
                  from calendario_bloqueios
                  where imovel_id = any(${imovelIds})
              `;

  // Monta cada reserva já com noites e o valor líquido (depois da comissão)
  const reservas = reservasBrutas.map((r) => {
    const noites = diferencaDias(r.data_checkin, r.data_checkout);
    const valorBruto = Number(r.valor_total);
    const comissao = valorBruto * COMISSAO_ATRIOS;
    return {
      id: r.id,
      imovel_id: r.imovel_id,
      imovel_nome: r.imovel_nome,
      hospede_nome: r.hospede_nome,
      data_checkin: r.data_checkin,
      data_checkout: r.data_checkout,
      noites,
      num_hospedes: r.num_hospedes,
      status: r.status,
      valor_bruto: valorBruto,
      comissao,
      valor_liquido: valorBruto - comissao,
    };
  });

  function contaComoReceita(r: (typeof reservas)[number]): boolean {
    return r.status === "confirmada" || r.status === "concluida";
  }

  // Ocupação dos próximos 30 dias, por imóvel, a partir dos bloqueios de qualquer origem
  const fimJanela = somarDias(hoje, 30);

  function ocupacaoImovel(imovelId: string): number {
    const diasOcupados = new Set<string>();
    for (const b of bloqueiosBrutos) {
      if (b.imovel_id !== imovelId) continue;
      let dia = b.data_inicio > hoje ? b.data_inicio : hoje;
      const fim = b.data_fim < fimJanela ? b.data_fim : fimJanela;
      while (dia < fim) {
        diasOcupados.add(dia);
        dia = somarDias(dia, 1);
      }
    }
    return (diasOcupados.size / 30) * 100;
  }

  // Para cada imóvel: foto, ocupação e a reserva mais relevante (em andamento ou a próxima)
  const imoveis = imoveisBrutos.map((i) => {
    const doImovel = reservas
      .filter(
        (r) =>
          r.imovel_id === i.id &&
          contaComoReceita(r) &&
          r.data_checkout >= hoje,
      )
      .sort((a, b) => a.data_checkin.localeCompare(b.data_checkin));

    const proxima = doImovel[0] ?? null;

    return {
      id: i.id,
      nome: i.nome,
      cidade: i.cidade,
      categoria: i.categoria,
      status: i.status,
      preco_base_noite: Number(i.preco_base_noite),
      foto: primeiraFoto(i.fotos),
      ocupacao_30_dias: ocupacaoImovel(i.id),
      proxima_checkin: proxima?.data_checkin ?? null,
      proxima_checkout: proxima?.data_checkout ?? null,
      proximo_hospede: proxima?.hospede_nome ?? null,
    };
  });

  // Resumo do mês atual
  const reservasDoMes = reservas.filter(
    (r) => contaComoReceita(r) && r.data_checkin.startsWith(mesAtual),
  );
  const receitaMes = reservasDoMes.reduce(
    (soma, r) => soma + r.valor_liquido,
    0,
  );

  const imoveisAtivos = imoveis.filter((i) => i.status === "ativo");
  const ocupacaoGeral =
    imoveisAtivos.length === 0
      ? 0
      : imoveisAtivos.reduce((soma, i) => soma + i.ocupacao_30_dias, 0) /
        imoveisAtivos.length;

  const proximasChegadas = reservas
    .filter((r) => contaComoReceita(r) && r.data_checkin >= hoje)
    .sort((a, b) => a.data_checkin.localeCompare(b.data_checkin))
    .slice(0, 5);

  return json({
    comissao_percentual: COMISSAO_ATRIOS * 100,
    resumo: {
      mes_referencia: mesAtual,
      receita_mes: receitaMes,
      reservas_mes: reservasDoMes.length,
      ocupacao_30_dias: ocupacaoGeral,
      imoveis_ativos: imoveisAtivos.length,
      proximas_chegadas: proximasChegadas,
    },
    imoveis,
    reservas,
  });
};
