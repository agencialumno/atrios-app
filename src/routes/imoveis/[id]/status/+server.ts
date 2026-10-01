import { json, error } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import type { RequestHandler } from "./$types";

interface CorpoStatus {
  status: "ativo" | "pausado";
}

export const POST: RequestHandler = async ({ request, params }) => {
  const claims = await extrairClaims(request.headers);
  const corpo = (await request.json()) as CorpoStatus;

  if (corpo.status !== "ativo" && corpo.status !== "pausado") {
    throw error(400, "status inválido");
  }

  const [existente] =
    await sql`select proprietario_id from imoveis where id = ${params.id}`;
  if (!existente) throw error(404, "imóvel não encontrado");

  const [usuario] =
    await sql`select papel from usuarios where id = ${claims.sub}`;
  if (existente.proprietario_id !== claims.sub && usuario?.papel !== "equipe") {
    throw error(403, "você não pode alterar este imóvel");
  }

  const [imovel] = await sql`
      update imoveis set status = ${corpo.status} where id = ${params.id}
      returning id, status
  `;

  return json(imovel, {
    headers: { "Cache-Control": "no-store" },
  });
};
