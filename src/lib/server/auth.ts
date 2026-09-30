import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { error } from "@sveltejs/kit";
import { JWT_SECRET } from "$env/static/private";

const segredo = new TextEncoder().encode(JWT_SECRET);
const RODADAS_HASH = 10;

export async function gerarHashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, RODADAS_HASH);
}

export async function conferirSenha(
  senha: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

export interface Claims {
  sub: string; // id do usuário
}

export async function gerarToken(usuarioId: string): Promise<string> {
  return new SignJWT({ sub: usuarioId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(segredo);
}

/** Extrai e valida o Bearer token do cabeçalho Authorization. Lança 401 se ausente/inválido. */
export async function extrairClaims(headers: Headers): Promise<Claims> {
  const cabecalho = headers.get("authorization");
  if (!cabecalho?.startsWith("Bearer ")) {
    throw error(401, "não autenticado");
  }

  const token = cabecalho.slice("Bearer ".length);

  try {
    const { payload } = await jwtVerify(token, segredo);
    if (typeof payload.sub !== "string") throw new Error("token sem sub");
    return { sub: payload.sub };
  } catch {
    throw error(401, "token inválido ou expirado");
  }
}
