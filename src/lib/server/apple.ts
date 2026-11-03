import { SignJWT, importPKCS8 } from "jose";
import { env } from "$env/dynamic/private";

/** A Apple exige um "client secret" que é um JWT assinado com a chave .p8 */
export async function segredoDaApple(): Promise<string> {
  const chave = await importPKCS8(
    env.APPLE_PRIVATE_KEY!.replace(/\n/g, "\n"),
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

/**
 * Revoga o token do Sign in with Apple (a Apple pede isso quando a conta é excluída no app).
 * Prefere o refresh token; sem ele, usa o access token.
 */
export async function revogarTokenApple(tokens: {
  refresh_token?: string;
  access_token?: string;
}): Promise<void> {
  const refresh = tokens.refresh_token;
  const token = refresh ?? tokens.access_token;
  if (!token) throw new Error("a Apple não devolveu um token para revogar");

  const resposta = await fetch("https://appleid.apple.com/auth/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.APPLE_CLIENT_ID!,
      client_secret: await segredoDaApple(),
      token,
      token_type_hint: refresh ? "refresh_token" : "access_token",
    }),
  });
  if (!resposta.ok) {
    throw new Error("a Apple não conseguiu revogar o acesso da conta");
  }
}
