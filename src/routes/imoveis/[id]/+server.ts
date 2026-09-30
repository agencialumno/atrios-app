import { json, error } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params }) => {
  const [imovel] = await sql`
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
        where id = ${params.id}
    `;

  if (!imovel) throw error(404, "imóvel não encontrado");

  return json(imovel);
};
