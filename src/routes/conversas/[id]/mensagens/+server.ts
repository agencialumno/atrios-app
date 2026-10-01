import { json, error } from "@sveltejs/kit";
import { randomUUID } from "node:crypto";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import type { RequestHandler } from "./$types";

async function exigirParticipante(reservaId: string, usuarioId: string) {
  const [reserva] = await sql`
        select r.hospede_id, i.proprietario_id
        from reservas r
        join imoveis i on i.id = r.imovel_id
        where r.id = ${reservaId}
    `;
  if (!reserva) throw error(404, "reserva não encontrada");
  if (
    reserva.hospede_id !== usuarioId &&
    reserva.proprietario_id !== usuarioId
  ) {
    throw error(403, "você não participa desta conversa");
  }
  return reserva;
}

export const GET: RequestHandler = async ({ request, params }) => {
  const claims = await extrairClaims(request.headers);
  await exigirParticipante(params.id, claims.sub);

  const mensagens = await sql`
        select m.id, m.remetente_id, u.nome as remetente_nome, m.texto, m.criado_em, m.lida
        from mensagens m
        join usuarios u on u.id = m.remetente_id
        where m.reserva_id = ${params.id}
        order by m.criado_em asc
    `;

  await sql`
        update mensagens
        set lida = true
        where reserva_id = ${params.id} and remetente_id != ${claims.sub}
    `;

  return json(mensagens);
};

interface NovaMensagem {
  texto: string;
}

export const POST: RequestHandler = async ({ request, params }) => {
  const claims = await extrairClaims(request.headers);
  await exigirParticipante(params.id, claims.sub);

  const corpo = (await request.json()) as NovaMensagem;
  if (!corpo.texto || !corpo.texto.trim()) {
    throw error(400, "a mensagem não pode estar vazia");
  }
  if (corpo.texto.length > 2000) {
    throw error(400, "mensagem muito longa (máximo 2000 caracteres)");
  }

  const id = randomUUID();
  await sql`
        insert into mensagens (id, reserva_id, remetente_id, texto)
        values (${id}, ${params.id}, ${claims.sub}, ${corpo.texto.trim()})
    `;

  const [mensagem] = await sql`
        select m.id, m.remetente_id, u.nome as remetente_nome, m.texto, m.criado_em, m.lida
        from mensagens m
        join usuarios u on u.id = m.remetente_id
        where m.id = ${id}
    `;

  return json(mensagem);
};
