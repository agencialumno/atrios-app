import { json, error } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import { extrairClaims, conferirSenha } from "$lib/server/auth";
import {
  ErroConta,
  bloqueiosDaExclusao,
  metodoDeReautenticacao,
  excluirConta,
} from "$lib/server/conta";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request }) => {
  const claims = await extrairClaims(request.headers);
  const [u] = await sql`select apple_id, google_id from usuarios where id = ${claims.sub}`;
  if (!u) throw error(404, "usuário não encontrado");

  return json({
    metodo: metodoDeReautenticacao(u),
    bloqueios: await bloqueiosDaExclusao(claims.sub),
  });
};

export const DELETE: RequestHandler = async ({ request }) => {
  const claims = await extrairClaims(request.headers);
  const corpo = (await request.json().catch(() => ({}))) as { senha?: string };

  const [u] = await sql`
        select senha_hash, apple_id, google_id from usuarios where id = ${claims.sub}
    `;
  if (!u) throw error(404, "usuário não encontrado");

  if (metodoDeReautenticacao(u) !== "senha") {
    throw error(400, "confirme a exclusão entrando de novo com Apple ou Google");
  }
  if (!corpo.senha) throw error(400, "informe a sua senha");

  // 403 (não 401): o app trata 401 como sessão expirada e desloga
  if (!(await conferirSenha(corpo.senha, u.senha_hash))) {
    throw error(403, "senha incorreta");
  }

  try {
    await excluirConta(claims.sub);
  } catch (e) {
    if (e instanceof ErroConta) throw error(e.status as 400, e.message);
    throw e;
  }
  return json({ ok: true });
};
