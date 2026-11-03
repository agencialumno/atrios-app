import { redirect, error } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { criarEstado, lerProvaExclusao } from "$lib/server/social";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url }) => {
  if (!env.APPLE_CLIENT_ID) {
    throw error(503, "o login com Apple ainda não está configurado");
  }

  const prova = url.searchParams.get("exc");
  const estado = await criarEstado(
    "apple",
    url.searchParams.get("app") === "1",
    prova ? await lerProvaExclusao(prova) : undefined,
  );
  const params = new URLSearchParams({
    client_id: env.APPLE_CLIENT_ID,
    redirect_uri: `${url.origin}/auth/apple/callback`,
    response_type: "code",
    response_mode: "form_post", // exigido pela Apple quando se pede nome e e-mail
    scope: "name email",
    state: estado,
  });

  throw redirect(302, `https://appleid.apple.com/auth/authorize?${params}`);
};
