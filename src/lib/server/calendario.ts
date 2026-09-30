import { sql } from "$lib/server/db";

/**
 * Existe algum bloqueio do imóvel que se sobrepõe ao período [checkin, checkout)?
 * O dia de saída de uma reserva não conta como ocupado (quem sai de manhã libera o dia).
 */
export async function existeConflito(
  imovelId: string,
  checkin: string,
  checkout: string,
): Promise<boolean> {
  const [linha] = await sql`
        select exists (
            select 1 from calendario_bloqueios
            where imovel_id = ${imovelId}
              and data_inicio < ${checkout}
              and data_fim > ${checkin}
        ) as existe
    `;
  return linha.existe;
}
