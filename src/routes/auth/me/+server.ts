import { json, error } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request }) => {
  const claims = await extrairClaims(request.headers);

  const [usuario] = await sql`
        select id, nome, email, papel, telefone, pode_hospedar
        from usuarios
        where id = ${claims.sub}
    `;

  if (!usuario) {
    throw error(404, "usuário não encontrado");
  }

  return json(usuario);
};
