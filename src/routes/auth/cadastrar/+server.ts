import { json, error } from "@sveltejs/kit";
import { randomUUID } from "node:crypto";
import { sql } from "$lib/server/db";
import { gerarHashSenha, gerarToken } from "$lib/server/auth";
import type { RequestHandler } from "./$types";

interface CorpoCadastro {
  nome: string;
  email: string;
  senha: string;
  papel?: string;
  telefone?: string | null;
}

export const POST: RequestHandler = async ({ request }) => {
  const corpo = (await request.json()) as CorpoCadastro;

  if (!corpo.nome || !corpo.email || !corpo.senha) {
    throw error(400, "nome, e-mail e senha são obrigatórios");
  }

  const [existente] = await sql`
        select id from usuarios where email = ${corpo.email}
    `;
  if (existente) {
    throw error(409, "já existe uma conta com este e-mail");
  }

  // Cadastro público sempre cria hóspede, mesmo que o corpo peça "equipe"
  // (a mesma regra que o backend Rust já seguia)
  const papel = "hospede";

  const id = randomUUID();
  const senhaHash = await gerarHashSenha(corpo.senha);

  const [usuario] = await sql`
        insert into usuarios (id, nome, email, senha_hash, papel, telefone)
        values (${id}, ${corpo.nome}, ${corpo.email}, ${senhaHash}, ${papel}, ${corpo.telefone ?? null})
        returning id, nome, email, papel, telefone, pode_hospedar
    `;

  const token = await gerarToken(usuario.id);

  return json({ token, usuario });
};
