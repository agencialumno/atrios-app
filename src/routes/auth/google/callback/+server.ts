import { error } from "@sveltejs/kit";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "$env/dynamic/private";
import {
  entrarComPerfil,
  lerEstado,
  paginaDeErro,
  paginaDeRetorno,
} from "$lib/server/social";
import type { RequestHandler } from "./$types";

const chavesGoogle = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

export const GET: RequestHandler = async ({ url }) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw error(503, "o login com Google ainda não está configurado");
  }

  let noApp = false;
  try {
    ({ app: noApp } = await lerEstado(
      url.searchParams.get("state"),
      "google",
    ));

    const code = url.searchParams.get("code");
    if (!code) throw new Error("o Google não devolveu o código de acesso");

    const resposta = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${url.origin}/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    const dados = await resposta.json();
    if (!resposta.ok || !dados.id_token) {
      throw new Error("o Google recusou o login");
    }

    const { payload } = await jwtVerify(dados.id_token, chavesGoogle, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: env.GOOGLE_CLIENT_ID,
    });
    if (payload.email_verified === false) {
      throw new Error("o e-mail do Google não está verificado");
    }

    const token = await entrarComPerfil({
      provedor: "google",
      id: String(payload.sub),
      email: (payload.email as string) ?? null,
      nome: (payload.name as string) ?? null,
      foto: (payload.picture as string) ?? null,
    });
    return paginaDeRetorno(token, noApp);
  } catch (e) {
    return paginaDeErro(e instanceof Error ? e.message : "falha no login");
  }
};
