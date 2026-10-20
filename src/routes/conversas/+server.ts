import { json } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request }) => {
  const claims = await extrairClaims(request.headers);

  const [eu] = await sql`select papel from usuarios where id = ${claims.sub}`;
  const ehEquipe = eu?.papel === "equipe";

  const porReserva = await sql`
        select
            r.id as id,
            'reserva' as tipo,
            r.id as reserva_id,
            i.id as imovel_id,
            i.nome as imovel_nome,
            r.data_checkin::text as data_checkin,
            r.data_checkout::text as data_checkout,
            r.status as reserva_status,
            case
                when r.hospede_id = ${claims.sub} then prop.id
                else hosp.id
            end as outro_id,
            case
                when r.hospede_id = ${claims.sub} then prop.nome
                else hosp.nome
            end as outro_nome,
            case
                when r.hospede_id = ${claims.sub} then prop.foto_url
                else hosp.foto_url
            end as outro_foto,
            ultima.texto as ultima_mensagem,
            ultima.criado_em as ultima_mensagem_em,
            ultima.remetente_id as ultima_mensagem_de,
            coalesce(nao_lidas.total, 0)::int as nao_lidas
        from reservas r
        join imoveis i on i.id = r.imovel_id
        join usuarios hosp on hosp.id = r.hospede_id
        join usuarios prop on prop.id = i.proprietario_id
        left join lateral (
            select texto, criado_em, remetente_id
            from mensagens m
            where m.reserva_id = r.id
            order by m.criado_em desc
            limit 1
        ) ultima on true
        left join lateral (
            select count(*) as total
            from mensagens m
            where m.reserva_id = r.id
              and m.remetente_id != ${claims.sub}
              and m.lida = false
        ) nao_lidas on true
        where (r.hospede_id = ${claims.sub} or i.proprietario_id = ${claims.sub})
          and ultima.texto is not null
    `;

  // Suporte: cada usuário tem a sua conversa com a equipe (sempre aparece, mesmo vazia).
  // A equipe vê a conversa de cada usuário que já escreveu.
  const suporteDoUsuario = await sql`
        select
            'suporte' as id,
            'suporte' as tipo,
            null::text as reserva_id,
            null::text as imovel_id,
            null::text as imovel_nome,
            null::text as outro_id,
            'Equipe Átrios' as outro_nome,
            null::text as outro_foto,
            ultima.texto as ultima_mensagem,
            ultima.criado_em as ultima_mensagem_em,
            ultima.remetente_id as ultima_mensagem_de,
            coalesce(nao_lidas.total, 0)::int as nao_lidas
        from (select 1) base
        left join lateral (
            select texto, criado_em, remetente_id
            from mensagens m
            where m.suporte_usuario_id = ${claims.sub}
            order by m.criado_em desc
            limit 1
        ) ultima on true
        left join lateral (
            select count(*) as total
            from mensagens m
            where m.suporte_usuario_id = ${claims.sub}
              and m.remetente_id != ${claims.sub}
              and m.lida = false
        ) nao_lidas on true
    `;

  const suporteDaEquipe = !ehEquipe
    ? []
    : await sql`
        select
            'suporte-' || u.id as id,
            'suporte' as tipo,
            null::text as reserva_id,
            null::text as imovel_id,
            null::text as imovel_nome,
            u.id as outro_id,
            u.nome as outro_nome,
            u.foto_url as outro_foto,
            ultima.texto as ultima_mensagem,
            ultima.criado_em as ultima_mensagem_em,
            ultima.remetente_id as ultima_mensagem_de,
            coalesce(nao_lidas.total, 0)::int as nao_lidas
        from usuarios u
        join lateral (
            select texto, criado_em, remetente_id
            from mensagens m
            where m.suporte_usuario_id = u.id
            order by m.criado_em desc
            limit 1
        ) ultima on true
        left join lateral (
            select count(*) as total
            from mensagens m
            where m.suporte_usuario_id = u.id
              and m.remetente_id = u.id
              and m.lida = false
        ) nao_lidas on true
        where u.id != ${claims.sub}
    `;

  const todas = [...porReserva, ...suporteDoUsuario, ...suporteDaEquipe].sort(
    (a, b) => {
      const ta = a.ultima_mensagem_em ? new Date(a.ultima_mensagem_em).getTime() : 0;
      const tb = b.ultima_mensagem_em ? new Date(b.ultima_mensagem_em).getTime() : 0;
      return tb - ta;
    },
  );

  return json(todas);
};
