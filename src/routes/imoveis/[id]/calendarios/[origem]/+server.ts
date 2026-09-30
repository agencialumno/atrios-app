import { json, error } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import type { RequestHandler } from "./$types";

export const DELETE: RequestHandler = async ({ request, params }) => {
  const claims = await extrairClaims(request.headers);

  const [imovel] =
    await sql`select proprietario_id from imoveis where id = ${params.id}`;
  if (!imovel) throw error(404, "imóvel não encontrado");

  const [usuario] =
    await sql`select papel from usuarios where id = ${claims.sub}`;
  if (imovel.proprietario_id !== claims.sub && usuario?.papel !== "equipe") {
    throw error(403, "você não pode gerenciar os calendários deste imóvel");
  }

  await sql`delete from calendarios_externos where imovel_id = ${params.id} and origem = ${params.origem}`;
  await sql`delete from calendario_bloqueios where imovel_id = ${params.id} and origem = ${params.origem}`;

  return json({ ok: true });
};
