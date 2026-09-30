import { json, error } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import { categoriaValida } from "$lib/server/imoveis";
import type { RequestHandler } from "./$types";

const SELECT_DETALHE = sql`
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

export const GET: RequestHandler = async ({ params }) => {
  const [imovel] = await sql`${SELECT_DETALHE} where id = ${params.id}`;
  if (!imovel) throw error(404, "imóvel não encontrado");
  return json(imovel);
};

interface EdicaoImovel {
  nome?: string;
  endereco?: string;
  cidade?: string;
  capacidade_hospedes?: number;
  quartos?: number;
  banheiros?: number;
  preco_base_noite?: number;
  descricao?: string | null;
  comodidades?: string[];
  fotos?: string[];
  video_tour?: string | null;
  categoria?: string | null;
  area_comum_fotos?: string[];
  area_comum_video?: string | null;
}

export const PUT: RequestHandler = async ({ request, params }) => {
  const claims = await extrairClaims(request.headers);

  const [existente] =
    await sql`select proprietario_id from imoveis where id = ${params.id}`;
  if (!existente) throw error(404, "imóvel não encontrado");

  const [usuario] =
    await sql`select papel from usuarios where id = ${claims.sub}`;
  if (existente.proprietario_id !== claims.sub && usuario?.papel !== "equipe") {
    throw error(403, "você não pode editar este imóvel");
  }

  const corpo = (await request.json()) as EdicaoImovel;

  if (!categoriaValida(corpo.categoria)) {
    throw error(400, "categoria inválida");
  }

  await sql`
        update imoveis set
            nome = coalesce(${corpo.nome ?? null}, nome),
            endereco = coalesce(${corpo.endereco ?? null}, endereco),
            cidade = coalesce(${corpo.cidade ?? null}, cidade),
            capacidade_hospedes = coalesce(${corpo.capacidade_hospedes ?? null}, capacidade_hospedes),
            quartos = coalesce(${corpo.quartos ?? null}, quartos),
            banheiros = coalesce(${corpo.banheiros ?? null}, banheiros),
            preco_base_noite = coalesce(${corpo.preco_base_noite ?? null}, preco_base_noite),
            descricao = case when ${corpo.descricao !== undefined} then ${corpo.descricao ?? null} else descricao end,
            comodidades = case when ${corpo.comodidades !== undefined} then ${sql.json(corpo.comodidades ?? [])} else comodidades end,
            fotos = case when ${corpo.fotos !== undefined} then ${sql.json(corpo.fotos ?? [])} else fotos end,
            video_tour = case when ${corpo.video_tour !== undefined} then ${corpo.video_tour ?? null} else video_tour end,
            categoria = case when ${corpo.categoria !== undefined} then ${corpo.categoria ?? null} else categoria end,
            area_comum_fotos = case when ${corpo.area_comum_fotos !== undefined} then ${sql.json(corpo.area_comum_fotos ?? [])} else area_comum_fotos end,
            area_comum_video = case when ${corpo.area_comum_video !== undefined} then ${corpo.area_comum_video ?? null} else area_comum_video end
        where id = ${params.id}
    `;

  const [imovel] = await sql`${SELECT_DETALHE} where id = ${params.id}`;
  return json(imovel);
};
