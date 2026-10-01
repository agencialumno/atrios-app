import { json } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import { exigirEquipe } from "$lib/server/equipe";
import type { RequestHandler } from "./$types";

function somarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  const dt = new Date(a, m - 1, d);
  dt.setDate(dt.getDate() + dias);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

interface ReservaBase {
  reserva_id: string;
  imovel_id: string;
  imovel_nome: string;
  imovel_cidade: string;
  hospede_nome: string;
  num_hospedes: number;
  data_checkin: string;
  data_checkout: string;
}

export const GET: RequestHandler = async ({ request }) => {
  const claims = await extrairClaims(request.headers);
  await exigirEquipe(claims);

  const hoje = new Date().toISOString().slice(0, 10);

  const reservas: ReservaBase[] = await sql`
        select
            r.id as reserva_id, r.imovel_id, i.nome as imovel_nome, i.cidade as imovel_cidade,
            u.nome as hospede_nome, r.num_hospedes,
            r.data_checkin::text as data_checkin, r.data_checkout::text as data_checkout
        from reservas r
        join imoveis i on i.id = r.imovel_id
        join usuarios u on u.id = r.hospede_id
        where r.status in ('confirmada', 'concluida')
    `;

  function viradaChegada(r: ReservaBase): boolean {
    return reservas.some(
      (o) =>
        o.reserva_id !== r.reserva_id &&
        o.imovel_id === r.imovel_id &&
        o.data_checkout === r.data_checkin,
    );
  }
  function viradaSaida(r: ReservaBase): boolean {
    return reservas.some(
      (o) =>
        o.reserva_id !== r.reserva_id &&
        o.imovel_id === r.imovel_id &&
        o.data_checkin === r.data_checkout,
    );
  }

  const chegadasHoje = reservas.filter((r) => r.data_checkin === hoje);
  const saidasHoje = reservas.filter((r) => r.data_checkout === hoje);
  const emEstadia = reservas.filter(
    (r) => r.data_checkin < hoje && r.data_checkout > hoje,
  );

  const limite = somarDias(hoje, 2);
  const proxChegadas = reservas.filter(
    (r) => r.data_checkin > hoje && r.data_checkin <= limite,
  );
  const proxSaidas = reservas.filter(
    (r) => r.data_checkout > hoje && r.data_checkout <= limite,
  );

  const [tarefasPendentes] = await sql`
        select count(*)::int as total from tarefas where status != 'concluida'
    `;
  const [ocorrenciasAbertas] = await sql`
        select count(*)::int as total from ocorrencias where status != 'resolvida'
    `;

  const mapMov = (
    r: ReservaBase,
    tipo: "checkin" | "checkout" | "estadia",
  ) => ({
    reserva_id: r.reserva_id,
    imovel_id: r.imovel_id,
    imovel_nome: r.imovel_nome,
    imovel_cidade: r.imovel_cidade,
    hospede_nome: r.hospede_nome,
    num_hospedes: r.num_hospedes,
    data_checkin: r.data_checkin,
    data_checkout: r.data_checkout,
    tipo,
    virada:
      tipo === "checkin"
        ? viradaChegada(r)
        : tipo === "checkout"
          ? viradaSaida(r)
          : false,
  });

  return json({
    hoje,
    resumo: {
      chegadas: chegadasHoje.length,
      saidas: saidasHoje.length,
      em_estadia: emEstadia.length,
      limpezas_pendentes: tarefasPendentes.total,
      ocorrencias_abertas: ocorrenciasAbertas.total,
    },
    chegadas: chegadasHoje.map((r) => mapMov(r, "checkin")),
    saidas: saidasHoje.map((r) => mapMov(r, "checkout")),
    em_estadia: emEstadia.map((r) => mapMov(r, "estadia")),
    proximos: [
      ...proxChegadas.map((r) => mapMov(r, "checkin")),
      ...proxSaidas.map((r) => mapMov(r, "checkout")),
    ].sort((a, b) => {
      const da = a.tipo === "checkin" ? a.data_checkin : a.data_checkout;
      const db = b.tipo === "checkin" ? b.data_checkin : b.data_checkout;
      return da.localeCompare(db);
    }),
  });
};
