import { error } from "@sveltejs/kit";
import { sql } from "$lib/server/db";

/**
 * Uma conversa é identificada por uma chave de texto:
 *  - "<id da reserva>"     hóspede <-> anfitrião daquela reserva
 *  - "suporte"             o próprio usuário <-> equipe Átrios
 *  - "suporte-<id usuário>" a equipe vendo/respondendo a conversa de suporte de um usuário
 */
export type Conversa =
  | { tipo: "reserva"; reservaId: string }
  | { tipo: "suporte"; usuarioId: string; comoEquipe: boolean };

export const EQUIPE_NOME = "Equipe Átrios";

export async function resolverConversa(
  chave: string,
  usuarioId: string,
): Promise<Conversa> {
  if (chave === "suporte") {
    return { tipo: "suporte", usuarioId, comoEquipe: false };
  }

  if (chave.startsWith("suporte-")) {
    const [eu] = await sql`select papel from usuarios where id = ${usuarioId}`;
    if (eu?.papel !== "equipe") {
      throw error(403, "você não participa desta conversa");
    }
    return {
      tipo: "suporte",
      usuarioId: chave.slice("suporte-".length),
      comoEquipe: true,
    };
  }

  const [reserva] = await sql`
        select r.hospede_id, i.proprietario_id
        from reservas r
        join imoveis i on i.id = r.imovel_id
        where r.id = ${chave}
    `;
  if (!reserva) throw error(404, "reserva não encontrada");
  if (reserva.hospede_id !== usuarioId && reserva.proprietario_id !== usuarioId) {
    throw error(403, "você não participa desta conversa");
  }
  return { tipo: "reserva", reservaId: chave };
}
