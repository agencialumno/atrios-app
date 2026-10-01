import { randomUUID } from "node:crypto";
import { sql } from "$lib/server/db";

/** Monta a resposta completa que o frontend espera: links de exportação, demo e os calendários conectados */
export async function montarResposta(imovelId: string, origin: string) {
  let [imovel] =
    await sql`select ical_token from imoveis where id = ${imovelId}`;

  if (!imovel.ical_token) {
    const token = randomUUID();
    await sql`update imoveis set ical_token = ${token} where id = ${imovelId}`;
    imovel = { ical_token: token };
  }

  const calendarios = await sql`
        select id, origem, url, ultima_sincronizacao, ultimo_erro, eventos_importados
        from calendarios_externos
        where imovel_id = ${imovelId}
        order by origem
    `;

  return {
    exportacao: {
      airbnb: `${origin}/ical/${imovelId}/${imovel.ical_token}.ics?para=airbnb`,
      booking: `${origin}/ical/${imovelId}/${imovel.ical_token}.ics?para=booking`,
    },
    demo: {
      airbnb: `${origin}/demo/ical/airbnb/x.ics`,
      airbnb_conflito: `${origin}/demo/ical/airbnb/x.ics?conflito=1`,
    },
    calendarios,
  };
}
