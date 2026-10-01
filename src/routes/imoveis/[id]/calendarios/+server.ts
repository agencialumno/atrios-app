import { json, error } from "@sveltejs/kit";
import { randomUUID } from "node:crypto";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import { origemValida, parsearICS } from "$lib/server/ical";
import { montarResposta } from "$lib/server/calendariosExternos";
import type { RequestHandler } from "./$types";

async function exigirDonoOuEquipe(imovelId: string, usuarioId: string) {
  const [imovel] =
    await sql`select proprietario_id from imoveis where id = ${imovelId}`;
  if (!imovel) throw error(404, "imóvel não encontrado");

  const [usuario] =
    await sql`select papel from usuarios where id = ${usuarioId}`;
  if (imovel.proprietario_id !== usuarioId && usuario?.papel !== "equipe") {
    throw error(403, "você não pode gerenciar os calendários deste imóvel");
  }
}

export const GET: RequestHandler = async ({ request, params, url }) => {
  const claims = await extrairClaims(request.headers);
  await exigirDonoOuEquipe(params.id, claims.sub);

  return json(await montarResposta(params.id, url.origin));
};

interface CorpoConectar {
  origem: string;
  url: string;
}

export const POST: RequestHandler = async ({ request, params, url }) => {
  const claims = await extrairClaims(request.headers);
  await exigirDonoOuEquipe(params.id, claims.sub);

  const corpo = (await request.json()) as CorpoConectar;

  if (!origemValida(corpo.origem)) {
    throw error(400, "origem inválida (use 'airbnb' ou 'booking')");
  }
  if (!corpo.url || !corpo.url.startsWith("http")) {
    throw error(400, "url do calendário inválida");
  }
  const dominioPermitido =
    corpo.url.includes("airbnb.com") ||
    corpo.url.includes("booking.com") ||
    corpo.url.startsWith(`${url.origin}/demo/ical/`);
  if (!dominioPermitido) {
    throw error(
      400,
      "só aceitamos calendários do Airbnb, Booking ou o de demonstração",
    );
  }

  let eventosImportados = 0;
  let ultimoErro: string | null = null;

  try {
    const resposta = await fetch(corpo.url);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const texto = await resposta.text();
    eventosImportados = parsearICS(texto).length;
  } catch (e) {
    ultimoErro =
      e instanceof Error ? e.message : "falha ao buscar o calendário";
  }

  await sql`
        insert into calendarios_externos (id, imovel_id, origem, url, ultima_sincronizacao, ultimo_erro, eventos_importados)
        values (${randomUUID()}, ${params.id}, ${corpo.origem}, ${corpo.url}, now(), ${ultimoErro}, ${eventosImportados})
        on conflict (imovel_id, origem)
        do update set url = excluded.url, ultima_sincronizacao = now(), ultimo_erro = excluded.ultimo_erro, eventos_importados = excluded.eventos_importados
    `;

  if (!ultimoErro) {
    await sql`delete from calendario_bloqueios where imovel_id = ${params.id} and origem = ${corpo.origem}`;
    const resposta = await fetch(corpo.url);
    const texto = await resposta.text();
    const eventos = parsearICS(texto);

    for (const ev of eventos) {
      await sql`
                insert into calendario_bloqueios (id, imovel_id, data_inicio, data_fim, origem)
                values (${randomUUID()}, ${params.id}, ${ev.dataInicio}, ${ev.dataFim}, ${corpo.origem})
            `;
    }
  }

  return json(await montarResposta(params.id, url.origin));
};
