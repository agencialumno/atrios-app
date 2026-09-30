import { json, error } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import { conferirSenha, gerarToken } from "$lib/server/auth";
import type { RequestHandler } from "./$types";

interface CorpoLogin {
  email: string;
  senha: string;
}

export const POST: RequestHandler = async ({ request }) => {
  const corpo = (await request.json()) as CorpoLogin;

  if (!corpo.email || !corpo.senha) {
    throw error(400, "e-mail e senha são obrigatórios");
  }

  const [usuario] = await sql`
        select id, nome, email, senha_hash, papel, telefone, pode_hospedar
        from usuarios
        where email = ${corpo.email}
    `;

  if (!usuario) {
    throw error(401, "e-mail ou senha incorretos");
  }

  const senhaConfere = await conferirSenha(corpo.senha, usuario.senha_hash);
  if (!senhaConfere) {
    throw error(401, "e-mail ou senha incorretos");
  }

  const token = await gerarToken(usuario.id);

  return json({
    token,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.papel,
      telefone: usuario.telefone,
      pode_hospedar: usuario.pode_hospedar,
    },
  });
};
