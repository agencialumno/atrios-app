import { json, error } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import type { RequestHandler } from "./$types";

const COLUNAS_USUARIO = sql`id, nome, email, papel, telefone, pode_hospedar, foto_url`;

export const GET: RequestHandler = async ({ request }) => {
  const claims = await extrairClaims(request.headers);

  const [usuario] = await sql`
        select ${COLUNAS_USUARIO}
        from usuarios
        where id = ${claims.sub}
    `;

  if (!usuario) {
    throw error(404, "usuário não encontrado");
  }

  return json(usuario);
};

// A foto sobe direto para o Vercel Blob; aqui só guardamos o endereço
function fotoValida(url: unknown): url is string {
  if (typeof url !== "string" || url.length > 500) return false;
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      u.hostname.endsWith(".public.blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}

export const PATCH: RequestHandler = async ({ request }) => {
  const claims = await extrairClaims(request.headers);
  const corpo = (await request.json()) as { foto_url?: string | null };

  if (corpo.foto_url !== undefined) {
    if (corpo.foto_url !== null && !fotoValida(corpo.foto_url)) {
      throw error(400, "endereço de foto inválido");
    }
    await sql`update usuarios set foto_url = ${corpo.foto_url} where id = ${claims.sub}`;
  }

  const [usuario] = await sql`
        select ${COLUNAS_USUARIO} from usuarios where id = ${claims.sub}
    `;
  return json(usuario);
};
