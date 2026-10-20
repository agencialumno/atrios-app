import { json, error } from "@sveltejs/kit";
import { sql } from "$lib/server/db";
import { extrairClaims } from "$lib/server/auth";
import { EQUIPE_NOME, resolverConversa } from "$lib/server/conversas";
import type { RequestHandler } from "./$types";

// Dados do cabeçalho de uma conversa (usado ao abrir uma conversa que ainda não tem mensagens)
export const GET: RequestHandler = async ({ request, params }) => {
  const claims = await extrairClaims(request.headers);
  const conversa = await resolverConversa(params.id, claims.sub);

  if (conversa.tipo === "suporte") {
    if (!conversa.comoEquipe) {
      return json({
        id: params.id,
        tipo: "suporte",
        outro_nome: EQUIPE_NOME,
        outro_foto: null,
        imovel_nome: null,
      });
    }
    const [u] = await sql`select nome, foto_url from usuarios where id = ${conversa.usuarioId}`;
    if (!u) throw error(404, "usuário não encontrado");
    return json({
      id: params.id,
      tipo: "suporte",
      outro_nome: u.nome,
      outro_foto: u.foto_url,
      imovel_nome: null,
    });
  }

  const [r] = await sql`
        select
            i.nome as imovel_nome,
            case when r.hospede_id = ${claims.sub} then prop.id else hosp.id end as outro_id,
            case when r.hospede_id = ${claims.sub} then prop.nome else hosp.nome end as outro_nome,
            case when r.hospede_id = ${claims.sub} then prop.foto_url else hosp.foto_url end as outro_foto
        from reservas r
        join imoveis i on i.id = r.imovel_id
        join usuarios hosp on hosp.id = r.hospede_id
        join usuarios prop on prop.id = i.proprietario_id
        where r.id = ${conversa.reservaId}
    `;
  return json({
    id: params.id,
    tipo: "reserva",
    outro_id: r.outro_id,
    outro_nome: r.outro_nome,
    outro_foto: r.outro_foto,
    imovel_nome: r.imovel_nome,
  });
};
