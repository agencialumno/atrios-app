import { json, error } from "@sveltejs/kit";
import { randomUUID } from "node:crypto";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import { parsearICS } from "$lib/server/ical";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, params }) => {
  const claims = await extrairClaims(request.headers);

  const [imovel] =
    await sql`select proprietario_id from imoveis where id = ${params.id}`;
  if (!imovel) throw error(404, "imóvel não encontrado");

  const [usuario] =
    await sql`select papel from usuarios where id = ${claims.sub}`;
  if (imovel.proprietario_id !== claims.sub && usuario?.papel !== "equipe") {
    throw error(403, "você não pode gerenciar os calendários deste imóvel");
  }

  const [calendario] = await sql`
        select url from calendarios_externos where imovel_id = ${params.id} and origem = ${params.origem}
    `;
  if (!calendario) throw error(404, "este calendário não está conectado");

  let ultimoErro: string | null = null;
  let eventosImportados = 0;

  try {
    const resposta = await fetch(calendario.url);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const texto = await resposta.text();
    const eventos = parsearICS(texto);

    await sql`delete from calendario_bloqueios where imovel_id = ${params.id} and origem = ${params.origem}`;
    for (const ev of eventos) {
      await sql`
                insert into calendario_bloqueios (id, imovel_id, data_inicio, data_fim, origem)
                values (${randomUUID()}, ${params.id}, ${ev.dataInicio}, ${ev.dataFim}, ${params.origem})
            `;
    }
    eventosImportados = eventos.length;
  } catch (e) {
    ultimoErro =
      e instanceof Error ? e.message : "falha ao buscar o calendário";
  }

  const [atualizado] = await sql`
        update calendarios_externos
        set ultima_sincronizacao = now(), ultimo_erro = ${ultimoErro}, eventos_importados = ${eventosImportados}
        where imovel_id = ${params.id} and origem = ${params.origem}
        returning origem, url, ultima_sincronizacao, ultimo_erro, eventos_importados
    `;

  return json(atualizado);
};
