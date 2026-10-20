import { error } from "@sveltejs/kit";
import { SignJWT, createRemoteJWKSet, importPKCS8, jwtVerify } from "jose";
import { env } from "$env/dynamic/private";
import {
  entrarComPerfil,
  lerEstado,
  paginaDeErro,
  paginaDeRetorno,
} from "$lib/server/social";
import type { RequestHandler } from "./$types";

const chavesApple = createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys"),
);

/** A Apple exige um "client secret" que é um JWT assinado com a chave .p8 */
async function segredoDaApple(): Promise<string> {
  const chave = await importPKCS8(
    env.APPLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    "ES256",
  );
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: env.APPLE_KEY_ID! })
    .setIssuer(env.APPLE_TEAM_ID!)
    .setSubject(env.APPLE_CLIENT_ID!)
    .setAudience("https://appleid.apple.com")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(chave);
}

// A Apple responde com POST (form_post). O SvelteKit libera essa origem em svelte.config.js.
export const POST: RequestHandler = async ({ request, url }) => {
  if (
    !env.APPLE_CLIENT_ID ||
    !env.APPLE_TEAM_ID ||
    !env.APPLE_KEY_ID ||
    !env.APPLE_PRIVATE_KEY
  ) {
    throw error(503, "o login com Apple ainda não está configurado");
  }

  let noApp = false;
  try {
    const form = await request.formData();
    ({ app: noApp } = await lerEstado(
      String(form.get("state") ?? ""),
      "apple",
    ));

    if (form.get("error")) throw new Error("login cancelado");
    const code = String(form.get("code") ?? "");
    if (!code) throw new Error("a Apple não devolveu o código de acesso");

    const resposta = await fetch("https://appleid.apple.com/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.APPLE_CLIENT_ID,
        client_secret: await segredoDaApple(),
        redirect_uri: `${url.origin}/auth/apple/callback`,
        grant_type: "authorization_code",
      }),
    });
    const dados = await resposta.json();
    if (!resposta.ok || !dados.id_token) {
      throw new Error("a Apple recusou o login");
    }

    const { payload } = await jwtVerify(dados.id_token, chavesApple, {
      issuer: "https://appleid.apple.com",
      audience: env.APPLE_CLIENT_ID,
    });

    // A Apple só manda o nome na primeira autorização, no campo "user"
    let nome: string | null = null;
    try {
      const usuario = JSON.parse(String(form.get("user") ?? "null"));
      nome =
        [usuario?.name?.firstName, usuario?.name?.lastName]
          .filter(Boolean)
          .join(" ") || null;
    } catch {
      nome = null;
    }

    const token = await entrarComPerfil({
      provedor: "apple",
      id: String(payload.sub),
      email: (payload.email as string) ?? null,
      nome,
      foto: null,
    });
    return paginaDeRetorno(token, noApp);
  } catch (e) {
    return paginaDeErro(e instanceof Error ? e.message : "falha no login");
  }
};
