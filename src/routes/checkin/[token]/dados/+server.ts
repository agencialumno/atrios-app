import { json, error } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import type { RequestHandler } from "./$types";

// Rota pública: o link do check-in é enviado ao hóspede por WhatsApp, sem login.
// O token (UUID aleatório) é o que protege o acesso.
export const GET: RequestHandler = async ({ params }) => {
  if (!/^[0-9a-f-]{36}$/i.test(params.token)) {
    throw error(404, "link de check-in não encontrado");
  }

  const [linha] = await sql`
        select
            r.id, r.status, r.num_hospedes,
            r.data_checkin::text as data_checkin, r.data_checkout::text as data_checkout,
            u.nome as hospede_nome,
            i.id as imovel_id, i.nome as imovel_nome, i.endereco, i.cidade,
            (i.fotos->>0) as imovel_foto,
            i.guia_json
        from reservas r
        join imoveis i on i.id = r.imovel_id
        join usuarios u on u.id = r.hospede_id
        where r.checkin_token = ${params.token}
    `;
  if (!linha) throw error(404, "link de check-in não encontrado");

  return json(
    {
      reserva: {
        numero: String(linha.id).slice(0, 8).toUpperCase(),
        status: linha.status,
        data_checkin: linha.data_checkin,
        data_checkout: linha.data_checkout,
        num_hospedes: linha.num_hospedes,
        hospedes: [linha.hospede_nome],
      },
      imovel: {
        id: linha.imovel_id,
        nome: linha.imovel_nome,
        endereco: linha.endereco,
        cidade: linha.cidade,
        foto: linha.imovel_foto,
        latitude: null,
        longitude: null,
      },
      guia: linha.guia_json ?? null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
};
