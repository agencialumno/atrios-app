import { json } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import type { RequestHandler } from "./$types";

// Total de mensagens não lidas destinadas ao usuário. Usa os mesmos critérios da contagem por
// conversa de GET /conversas (remetente diferente do usuário e lida = false), para os números
// nunca divergirem:
//  - conversas por reserva em que o usuário é hóspede ou anfitrião;
//  - a conversa de suporte do próprio usuário;
//  - equipe: também o suporte dos outros usuários (só mensagens escritas por eles).
export const GET: RequestHandler = async ({ request }) => {
  const claims = await extrairClaims(request.headers);

  const [linha] = await sql`
        select (
            (select count(*)
               from mensagens m
               join reservas r on r.id = m.reserva_id
               join imoveis i on i.id = r.imovel_id
              where (r.hospede_id = ${claims.sub} or i.proprietario_id = ${claims.sub})
                and m.remetente_id != ${claims.sub}
                and m.lida = false)
          + (select count(*)
               from mensagens m
              where m.suporte_usuario_id = ${claims.sub}
                and m.remetente_id != ${claims.sub}
                and m.lida = false)
          + (select count(*)
               from mensagens m
              where (select papel from usuarios where id = ${claims.sub}) = 'equipe'
                and m.suporte_usuario_id is not null
                and m.suporte_usuario_id != ${claims.sub}
                and m.remetente_id = m.suporte_usuario_id
                and m.lida = false)
        )::int as total
    `;

  return json({ total: linha?.total ?? 0 });
};
