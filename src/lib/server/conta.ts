import { del } from "@vercel/blob";
import { sql } from "$lib/server/db";

/** Erro esperado da exclusão (reservas em aberto, senha errada...): a mensagem vai para o usuário */
export class ErroConta extends Error {
  constructor(
    mensagem: string,
    readonly status = 400,
  ) {
    super(mensagem);
  }
}

const STATUS_EM_ABERTO = ["pendente", "confirmada"];

/** Lista, em português, o que o usuário precisa cancelar antes de excluir a conta */
export async function bloqueiosDaExclusao(usuarioId: string): Promise<string[]> {
  const comoHospede = await sql`
        select i.nome as imovel_nome, r.data_checkin::text as data_checkin
        from reservas r
        join imoveis i on i.id = r.imovel_id
        where r.hospede_id = ${usuarioId}
          and r.status in ${sql(STATUS_EM_ABERTO)}
          and r.data_checkout::date >= current_date
        order by r.data_checkin
    `;
  const comoAnfitriao = await sql`
        select i.nome as imovel_nome, r.data_checkin::text as data_checkin
        from reservas r
        join imoveis i on i.id = r.imovel_id
        where i.proprietario_id = ${usuarioId}
          and r.status in ${sql(STATUS_EM_ABERTO)}
          and r.data_checkout::date >= current_date
        order by r.data_checkin
    `;

  const dataBR = (iso: string) => iso.split("-").reverse().join("/");
  return [
    ...comoHospede.map(
      (r) =>
        `Reserva sua em ${r.imovel_nome} com check-in em ${dataBR(r.data_checkin)}: cancele em Minhas reservas.`,
    ),
    ...comoAnfitriao.map(
      (r) =>
        `Reserva de hóspede em ${r.imovel_nome} com check-in em ${dataBR(r.data_checkin)}: ela precisa ser cancelada ou concluída antes.`,
    ),
  ];
}

export async function exigirContaExcluivel(usuarioId: string): Promise<void> {
  const bloqueios = await bloqueiosDaExclusao(usuarioId);
  if (bloqueios.length > 0) {
    throw new ErroConta(
      `Você ainda tem reservas em aberto. ${bloqueios.join(" ")}`,
      409,
    );
  }
}

/**
 * Anonimiza a conta: mantém a linha (reservas, mensagens e pagamentos continuam apontando para ela),
 * mas remove os dados pessoais, invalida a senha e despublica os anúncios.
 */
export async function excluirConta(usuarioId: string): Promise<void> {
  await exigirContaExcluivel(usuarioId);

  const [antes] = await sql`
        select foto_url from usuarios where id = ${usuarioId} and excluida_em is null
    `;
  if (!antes) throw new ErroConta("Conta não encontrada.", 404);

  await sql.begin(async (tx) => {
    await tx`
            update usuarios
            set nome = 'Usuário excluído',
                email = ${`excluido-${usuarioId}@excluido.atrios`},
                telefone = null,
                foto_url = null,
                google_id = null,
                apple_id = null,
                senha_hash = '!conta-excluida',
                excluida_em = now()
            where id = ${usuarioId}
        `;
    await tx`update imoveis set status = 'inativo' where proprietario_id = ${usuarioId}`;
  });

  // Depois de gravar a anonimização: se o Blob falhar, a conta já está excluída
  if (antes.foto_url) {
    try {
      await del(antes.foto_url);
    } catch (e) {
      console.error("[conta] não foi possível apagar a foto do Blob:", e);
    }
  }
}

/** Como esta conta prova que é a dona: Apple (precisa revogar o acesso), Google ou senha */
export function metodoDeReautenticacao(u: Record<string, any>): "apple" | "google" | "senha" {
  if (u.apple_id) return "apple";
  if (u.google_id) return "google";
  return "senha";
}
