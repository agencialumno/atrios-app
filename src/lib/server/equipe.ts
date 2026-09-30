import { error } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import type { Claims } from "$lib/server/auth";

/** Garante que o usuário logado é da equipe. Lança 403 se não for. */
export async function exigirEquipe(claims: Claims): Promise<void> {
    const [usuario] = await sql`select papel from usuarios where id = ${claims.sub}`;
    if (usuario?.papel !== "equipe") {
        throw error(403, "acesso restrito à equipe");
    }
}
