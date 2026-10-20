import { json, error } from "@sveltejs/kit";
import { randomUUID } from "node:crypto";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import { resolverConversa } from "$lib/server/conversas";
import type { RequestHandler } from "./$types";

const COLUNAS_MENSAGEM = sql`m.id, m.remetente_id, u.nome as remetente_nome, u.foto_url as remetente_foto, m.texto, m.criado_em, m.lida`;

export const GET: RequestHandler = async ({ request, params, url }) => {
  const claims = await extrairClaims(request.headers);
  const conversa = await resolverConversa(params.id, claims.sub);

  // O app consulta de tempos em tempos só o que chegou depois da última mensagem que já tem
  const depoisDe = url.searchParams.get("depois_de");
  const filtroData = depoisDe ? sql`and m.criado_em > ${depoisDe}` : sql``;

  const mensagens =
    conversa.tipo === "reserva"
      ? await sql`
          select ${COLUNAS_MENSAGEM}
          from mensagens m
          join usuarios u on u.id = m.remetente_id
          where m.reserva_id = ${conversa.reservaId} ${filtroData}
          order by m.criado_em asc
      `
      : await sql`
          select ${COLUNAS_MENSAGEM}
          from mensagens m
          join usuarios u on u.id = m.remetente_id
          where m.suporte_usuario_id = ${conversa.usuarioId} ${filtroData}
          order by m.criado_em asc
      `;

  if (conversa.tipo === "reserva") {
    await sql`
        update mensagens
        set lida = true
        where reserva_id = ${conversa.reservaId} and remetente_id != ${claims.sub} and lida = false
    `;
  } else if (conversa.comoEquipe) {
    // Qualquer pessoa da equipe lendo marca as mensagens do usuário como lidas
    await sql`
        update mensagens
        set lida = true
        where suporte_usuario_id = ${conversa.usuarioId} and remetente_id = ${conversa.usuarioId} and lida = false
    `;
  } else {
    await sql`
        update mensagens
        set lida = true
        where suporte_usuario_id = ${conversa.usuarioId} and remetente_id != ${claims.sub} and lida = false
    `;
  }

  return json(mensagens);
};

interface NovaMensagem {
  texto: string;
}

export const POST: RequestHandler = async ({ request, params }) => {
  const claims = await extrairClaims(request.headers);
  const conversa = await resolverConversa(params.id, claims.sub);

  const corpo = (await request.json()) as NovaMensagem;
  if (!corpo.texto || !corpo.texto.trim()) {
    throw error(400, "a mensagem não pode estar vazia");
  }
  if (corpo.texto.length > 2000) {
    throw error(400, "mensagem muito longa (máximo 2000 caracteres)");
  }

  const id = randomUUID();
  if (conversa.tipo === "reserva") {
    await sql`
        insert into mensagens (id, reserva_id, remetente_id, texto)
        values (${id}, ${conversa.reservaId}, ${claims.sub}, ${corpo.texto.trim()})
    `;
  } else {
    await sql`
        insert into mensagens (id, suporte_usuario_id, remetente_id, texto)
        values (${id}, ${conversa.usuarioId}, ${claims.sub}, ${corpo.texto.trim()})
    `;
  }

  const [mensagem] = await sql`
        select ${COLUNAS_MENSAGEM}
        from mensagens m
        join usuarios u on u.id = m.remetente_id
        where m.id = ${id}
    `;

  return json(mensagem);
};
