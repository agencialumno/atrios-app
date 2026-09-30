import { json, error } from "@sveltejs/kit";
import { randomUUID } from "node:crypto";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import { exigirEquipe } from "$lib/server/equipe";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request }) => {
  const claims = await extrairClaims(request.headers);
  await exigirEquipe(claims);

  const ocorrencias = await sql`
        select o.id, o.imovel_id, o.tipo, o.titulo, o.descricao, o.status,
               o.criada_por, o.criado_em, o.resolvida_em, i.nome as imovel_nome
        from ocorrencias o
        join imoveis i on i.id = o.imovel_id
        order by o.criado_em desc
    `;

  return json(ocorrencias);
};

interface NovaOcorrencia {
  imovel_id: string;
  tipo: string;
  titulo: string;
  descricao?: string | null;
}

export const POST: RequestHandler = async ({ request }) => {
  const claims = await extrairClaims(request.headers);
  await exigirEquipe(claims);

  const corpo = (await request.json()) as NovaOcorrencia;

  if (!corpo.imovel_id || !corpo.tipo || !corpo.titulo) {
    throw error(400, "imovel_id, tipo e titulo são obrigatórios");
  }

  const id = randomUUID();

  await sql`
        insert into ocorrencias (id, imovel_id, tipo, titulo, descricao, criada_por)
        values (${id}, ${corpo.imovel_id}, ${corpo.tipo}, ${corpo.titulo}, ${corpo.descricao ?? null}, ${claims.sub})
    `;

  const [ocorrencia] = await sql`select * from ocorrencias where id = ${id}`;
  return json(ocorrencia);
};
