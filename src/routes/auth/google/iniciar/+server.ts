import { redirect, error } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { criarEstado } from "$lib/server/social";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url }) => {
  if (!env.GOOGLE_CLIENT_ID) {
    throw error(503, "o login com Google ainda não está configurado");
  }

  const estado = await criarEstado(
    "google",
    url.searchParams.get("app") === "1",
  );
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${url.origin}/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state: estado,
    prompt: "select_account",
  });

  throw redirect(
    302,
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
  );
};
