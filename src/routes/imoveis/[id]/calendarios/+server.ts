import { json, error } from "@sveltejs/kit";
import { randomUUID } from "node:crypto";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import { origemValida, parsearICS } from "$lib/server/ical";
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

export const GET: RequestHandler = async ({ request, params }) => {
  const claims = await extrairClaims(request.headers);
  await exigirDonoOuEquipe(params.id, claims.sub);

  const calendarios = await sql`
        select origem, url, ultima_sincronizacao, ultimo_erro, eventos_importados
        from calendarios_externos
        where imovel_id = ${params.id}
        order by origem
    `;

  // Garante que o imóvel tenha um token pra exportação, gerando na primeira consulta
  let [imovel] =
    await sql`select ical_token from imoveis where id = ${params.id}`;
  if (!imovel.ical_token) {
    const token = randomUUID();
    await sql`update imoveis set ical_token = ${token} where id = ${params.id}`;
    imovel = { ical_token: token };
  }

  return json({ calendarios, ical_token: imovel.ical_token });
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
  // Só aceita iCal do Airbnb, Booking ou o de demonstração do próprio servidor
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

  // Testa a conexão agora, pra já devolver erro claro se a URL não for um .ics válido
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

  // Já popula os bloqueios dessa origem imediatamente
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

  const [calendario] = await sql`
        select origem, url, ultima_sincronizacao, ultimo_erro, eventos_importados
        from calendarios_externos
        where imovel_id = ${params.id} and origem = ${corpo.origem}
    `;

  return json(calendario);
};
