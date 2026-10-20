import { json, error } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import { sanitizarGuia } from "$lib/server/guia";
import type { RequestHandler } from "./$types";

async function exigirProprietario(request: Request, imovelId: string) {
  const claims = await extrairClaims(request.headers);
  const [imovel] =
    await sql`select proprietario_id from imoveis where id = ${imovelId}`;
  if (!imovel) throw error(404, "imóvel não encontrado");
  if (imovel.proprietario_id !== claims.sub) {
    throw error(403, "você não pode editar o guia deste imóvel");
  }
}

export const GET: RequestHandler = async ({ request, params }) => {
  await exigirProprietario(request, params.id);
  const [linha] =
    await sql`select guia_json from imoveis where id = ${params.id}`;
  return json(linha?.guia_json ?? null);
};

export const PUT: RequestHandler = async ({ request, params }) => {
  await exigirProprietario(request, params.id);
  const guia = sanitizarGuia(await request.json());

  await sql`update imoveis set guia_json = ${sql.json(guia as any)} where id = ${params.id}`;
  return json(guia);
};
