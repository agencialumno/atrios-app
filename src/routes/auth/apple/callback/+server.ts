import { error } from "@sveltejs/kit";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "$env/dynamic/private";
import { sql } from "$lib/server/db";
import { segredoDaApple, revogarTokenApple } from "$lib/server/apple";
import { exigirContaExcluivel, excluirConta } from "$lib/server/conta";
import {
  entrarComPerfil,
  lerEstado,
  paginaContaExcluida,
  paginaDeErro,
  paginaDeRetorno,
} from "$lib/server/social";
import type { RequestHandler } from "./$types";

const chavesApple = createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys"),
);

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
    const estado = await lerEstado(String(form.get("state") ?? ""), "apple");
    noApp = estado.app;

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

    // Exclusão da conta: prova quem é o dono, revoga o acesso na Apple e só então anonimiza
    if (estado.excluir) {
      const [dono] = await sql`
            select id from usuarios
            where id = ${estado.excluir} and apple_id = ${String(payload.sub)} and excluida_em is null
        `;
      if (!dono) throw new Error("Este Apple ID não é o da conta que você quer excluir.");
      await exigirContaExcluivel(dono.id); // não revoga se a exclusão vai ser barrada
      await revogarTokenApple(dados);
      await excluirConta(dono.id);
      return paginaContaExcluida(noApp);
    }

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
