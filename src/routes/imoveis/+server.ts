import { json, error } from "@sveltejs/kit";
import { randomUUID } from "node:crypto";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import { categoriaValida } from "$lib/server/imoveis";
import type { RequestHandler } from "./$types";

interface NovoImovel {
  nome: string;
  endereco: string;
  cidade: string;
  capacidade_hospedes: number;
  quartos: number;
  banheiros: number;
  preco_base_noite: number;
  descricao?: string | null;
  comodidades?: string[];
  fotos?: string[];
  video_tour?: string | null;
  categoria?: string | null;
  area_comum_fotos?: string[];
  area_comum_video?: string | null;
}

const SELECT_LISTA = sql`
    select
        id, proprietario_id, nome, endereco, cidade,
        capacidade_hospedes, quartos, banheiros, preco_base_noite,
        descricao,
        comodidades::text as comodidades,
        fotos::text as fotos,
        video_tour,
        area_comum_fotos::text as area_comum_fotos,
        area_comum_video,
        categoria, status, criado_em
    from imoveis
`;

export const GET: RequestHandler = async () => {
  const imoveis =
    await sql`${SELECT_LISTA} where status = 'ativo' order by criado_em desc`;
  return json(imoveis);
};

export const POST: RequestHandler = async ({ request }) => {
  const claims = await extrairClaims(request.headers);

  const [usuario] = await sql`
        select papel, pode_hospedar from usuarios where id = ${claims.sub}
    `;
  if (!usuario) throw error(404, "usuário não encontrado");

  if (usuario.papel !== "equipe" && !usuario.pode_hospedar) {
    throw error(
      403,
      "você precisa se tornar anfitrião antes de cadastrar um imóvel",
    );
  }

  const corpo = (await request.json()) as NovoImovel;

  if (!categoriaValida(corpo.categoria)) {
    throw error(400, "categoria inválida");
  }

  const id = randomUUID();

  await sql`
        insert into imoveis (
            id, proprietario_id, nome, endereco, cidade,
            capacidade_hospedes, quartos, banheiros, preco_base_noite,
            descricao, comodidades, fotos, video_tour,
            area_comum_fotos, area_comum_video, categoria
        ) values (
            ${id}, ${claims.sub}, ${corpo.nome}, ${corpo.endereco}, ${corpo.cidade},
            ${corpo.capacidade_hospedes}, ${corpo.quartos}, ${corpo.banheiros}, ${corpo.preco_base_noite},
            ${corpo.descricao ?? null}, ${sql.json(corpo.comodidades ?? [])}, ${sql.json(corpo.fotos ?? [])}, ${corpo.video_tour ?? null},
            ${sql.json(corpo.area_comum_fotos ?? [])}, ${corpo.area_comum_video ?? null}, ${corpo.categoria ?? null}
        )
    `;

  const [imovel] = await sql`${SELECT_LISTA} where id = ${id}`;

  return json(imovel);
};
