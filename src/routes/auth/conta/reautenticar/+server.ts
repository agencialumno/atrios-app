import { json, error } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import { ErroConta, exigirContaExcluivel } from "$lib/server/conta";
import { criarProvaExclusao } from "$lib/server/social";
import type { RequestHandler } from "./$types";

/**
 * Contas de Apple/Google provam que são donas entrando de novo no provedor.
 * Devolve o endereço que o app abre no navegador; a exclusão acontece no retorno do provedor.
 */
export const POST: RequestHandler = async ({ request, url }) => {
  const claims = await extrairClaims(request.headers);
  const corpo = (await request.json().catch(() => ({}))) as { app?: boolean };

  const [u] = await sql`select apple_id, google_id from usuarios where id = ${claims.sub}`;
  if (!u) throw error(404, "usuário não encontrado");

  const provedor = u.apple_id ? "apple" : u.google_id ? "google" : null;
  if (!provedor) throw error(400, "esta conta confirma a exclusão com a senha");

  try {
    await exigirContaExcluivel(claims.sub);
  } catch (e) {
    if (e instanceof ErroConta) throw error(e.status as 400, e.message);
    throw e;
  }

  const exc = await criarProvaExclusao(claims.sub);
  const params = new URLSearchParams({ exc });
  if (corpo.app) params.set("app", "1");
  return json({ url: `${url.origin}/auth/${provedor}/iniciar?${params}` });
};
