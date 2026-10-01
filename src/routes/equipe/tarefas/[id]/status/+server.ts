import { json, error } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import { exigirEquipe } from "$lib/server/equipe";
import type { RequestHandler } from "./$types";

interface CorpoStatus {
  status: "pendente" | "em_andamento" | "concluida";
}

export const POST: RequestHandler = async ({ request, params }) => {
  const claims = await extrairClaims(request.headers);
  await exigirEquipe(claims);

  const corpo = (await request.json()) as CorpoStatus;
  if (!["pendente", "em_andamento", "concluida"].includes(corpo.status)) {
    throw error(400, "status inválido");
  }

  const [tarefa] = await sql`
        update tarefas
        set
            status = ${corpo.status},
            concluida_por = case when ${corpo.status} = 'concluida' then ${claims.sub} else null end,
            concluida_em = case when ${corpo.status} = 'concluida' then now() else null end
        where id = ${params.id}
        returning id, status, concluida_por, concluida_em
    `;

  if (!tarefa) throw error(404, "tarefa não encontrada");

  return json(tarefa);
};
