import { json } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
  const claims = await extrairClaims(request.headers);

  const [usuario] = await sql`
        update usuarios
        set pode_hospedar = true
        where id = ${claims.sub}
        returning id, nome, email, papel, telefone, pode_hospedar
    `;

  return json(usuario);
};
