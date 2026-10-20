import { text, error } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import type { RequestHandler } from "./$types";

// Rota leve e pública: mantém a função e a conexão com o Supabase acordadas
export const GET: RequestHandler = async () => {
  try {
    await sql`select 1`;
  } catch {
    throw error(503, "banco indisponível");
  }
  return text("ok");
};
