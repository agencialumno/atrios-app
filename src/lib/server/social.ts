import { randomUUID } from "node:crypto";
import { error } from "@sveltejs/kit";
import { SignJWT, jwtVerify } from "jose";
import { JWT_SECRET } from "$env/static/private";
import { sql } from "$lib/server/db";
import { gerarHashSenha, gerarToken } from "$lib/server/auth";

const segredo = new TextEncoder().encode(JWT_SECRET);

export type Provedor = "google" | "apple";

export interface PerfilSocial {
  provedor: Provedor;
  id: string; // "sub" do provedor
  email: string | null;
  nome: string | null;
  foto: string | null;
}

/** "state" do OAuth: assinado, vale 10 minutos, lembra se o login começou no app ou no site */
export async function criarEstado(
  provedor: Provedor,
  noApp: boolean,
): Promise<string> {
  return new SignJWT({ p: provedor, app: noApp, n: randomUUID() })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("10m")
    .sign(segredo);
}

export async function lerEstado(
  estado: string | null,
  provedor: Provedor,
): Promise<{ app: boolean }> {
  if (!estado) throw error(400, "login social inválido");
  try {
    const { payload } = await jwtVerify(estado, segredo);
    if (payload.p !== provedor) throw new Error("provedor diferente");
    return { app: payload.app === true };
  } catch {
    throw error(400, "o login social expirou, tente de novo");
  }
}

/** Acha (ou cria) o usuário do provedor e devolve o token do Átrios */
export async function entrarComPerfil(perfil: PerfilSocial): Promise<string> {
  const coluna = perfil.provedor === "google" ? "google_id" : "apple_id";

  const [porId] = await sql`
        select id from usuarios where ${sql(coluna)} = ${perfil.id}
    `;
  if (porId) return gerarToken(porId.id);

  // Mesmo e-mail de uma conta já existente: vincula o provedor a ela
  if (perfil.email) {
    const [porEmail] = await sql`
            select id from usuarios where lower(email) = ${perfil.email.toLowerCase()}
        `;
    if (porEmail) {
      await sql`
                update usuarios
                set ${sql(coluna)} = ${perfil.id},
                    foto_url = coalesce(foto_url, ${perfil.foto})
                where id = ${porEmail.id}
            `;
      return gerarToken(porEmail.id);
    }
  }

  // Conta nova: hóspede, igual ao cadastro normal. Sem senha utilizável.
  const email =
    perfil.email ?? `${perfil.provedor}-${perfil.id}@sem-email.atrios`;
  const id = randomUUID();
  const senhaInutil = await gerarHashSenha(randomUUID() + randomUUID());

  await sql`
        insert into usuarios (id, nome, email, senha_hash, papel, ${sql(coluna)}, foto_url)
        values (${id}, ${perfil.nome?.trim() || email.split("@")[0]}, ${email}, ${senhaInutil}, 'hospede', ${perfil.id}, ${perfil.foto})
    `;
  return gerarToken(id);
}

const ESTILO_PAGINA =
  "body{font-family:system-ui,sans-serif;background:#f5f1ea;color:#1f2a26;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;margin:0;padding:1.5rem}a{display:inline-block;margin-top:1rem;padding:.8rem 1.6rem;border-radius:999px;background:#c9a96b;color:#1f2a26;font-weight:600;text-decoration:none}";

function pagina(corpo: string, status = 200): Response {
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Átrios</title><style>${ESTILO_PAGINA}</style></head><body>${corpo}</body></html>`;
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/** Página que devolve o token ao app (deep link) ou ao site (fragmento da URL) */
export function paginaDeRetorno(token: string, noApp: boolean): Response {
  const destino = noApp
    ? `atrios://auth?token=${encodeURIComponent(token)}`
    : `/login#token=${encodeURIComponent(token)}`;

  return pagina(
    `<div><h2>Login concluído</h2><p>Voltando para o Átrios...</p><a href="${destino}">Abrir o Átrios</a></div><script>location.replace(${JSON.stringify(destino)});</script>`,
  );
}

export function paginaDeErro(mensagem: string): Response {
  const limpa = mensagem.replace(/[<>&"]/g, "");
  return pagina(
    `<div><h2>Não foi possível entrar</h2><p>${limpa}</p><p>Volte ao app e tente de novo.</p></div>`,
    400,
  );
}
