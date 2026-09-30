import { json, error } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import { exigirEquipe } from "$lib/server/equipe";
import type { RequestHandler } from "./$types";

interface CorpoStatus {
  status: "aberta" | "resolvida";
}

export const POST: RequestHandler = async ({ request, params }) => {
  const claims = await extrairClaims(request.headers);
  await exigirEquipe(claims);

  const corpo = (await request.json()) as CorpoStatus;
  if (corpo.status !== "aberta" && corpo.status !== "resolvida") {
    throw error(400, "status inválido");
  }

  const [ocorrencia] = await sql`
        update ocorrencias
        set status = ${corpo.status},
            resolvida_em = case when ${corpo.status} = 'resolvida' then now() else null end
        where id = ${params.id}
        returning id, status, resolvida_em
    `;

  if (!ocorrencia) throw error(404, "ocorrência não encontrada");

  return json(ocorrencia);
};
