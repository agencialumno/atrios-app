import { env } from "$env/dynamic/private";
import { sql } from "$lib/server/db";

const ORIGEM_PUBLICA = "https://atrios-app-two.vercel.app";
const REMETENTE_PADRAO = "Átrios <onboarding@resend.dev>"; // domínio de testes do Resend

function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dataBR(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Envia ao hóspede o e-mail com o link do check-in.
 * Nunca lança erro: se falhar (sem chave, serviço fora do ar...), só registra no log,
 * para não atrapalhar a confirmação da reserva.
 */
export async function enviarLinkCheckin(reservaId: string): Promise<void> {
  try {
    if (!env.RESEND_API_KEY) {
      console.warn("[email] RESEND_API_KEY não configurada; e-mail de check-in não enviado");
      return;
    }

    const [r] = await sql`
            select
                r.checkin_token, r.data_checkin::text as data_checkin, r.data_checkout::text as data_checkout,
                u.nome as hospede_nome, u.email as hospede_email,
                i.nome as imovel_nome, i.endereco, i.cidade
            from reservas r
            join usuarios u on u.id = r.hospede_id
            join imoveis i on i.id = r.imovel_id
            where r.id = ${reservaId}
        `;
    if (!r?.checkin_token) return;
    if (!r.hospede_email || r.hospede_email.endsWith("@sem-email.atrios")) return;

    const link = `${ORIGEM_PUBLICA}/checkin/${r.checkin_token}`;
    const primeiroNome = String(r.hospede_nome ?? "").trim().split(/\s+/)[0] || "hóspede";
    const periodo = `${dataBR(r.data_checkin)} a ${dataBR(r.data_checkout)}`;

    const html = `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:24px;background:#f5f1ea;font-family:Arial,Helvetica,sans-serif;color:#1f2a26">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px" cellpadding="0" cellspacing="0">
      <tr><td>
        <h1 style="margin:0 0 8px;font-size:22px">Olá, ${escapar(primeiroNome)}!</h1>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.5">Sua reserva está confirmada. Estamos ansiosos para receber você.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1ea;border-radius:12px;padding:16px;margin-bottom:24px">
          <tr><td style="font-size:14px;line-height:1.6">
            <strong>${escapar(r.imovel_nome)}</strong><br>
            ${escapar(r.endereco)}, ${escapar(r.cidade)}<br>
            ${escapar(periodo)}
          </td></tr>
        </table>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5">No seu guia de check-in você encontra como chegar, informações de acesso e as regras do condomínio.</p>
        <p style="margin:0 0 24px"><a href="${link}" style="display:inline-block;padding:14px 28px;background:#c9a96b;color:#1f2a26;text-decoration:none;font-weight:bold;font-size:15px;border-radius:999px">Acessar meu check-in</a></p>
        <p style="margin:0;font-size:12px;color:#6b6b66;line-height:1.5">Se o botão não funcionar, copie este endereço no navegador:<br>${link}</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

    const texto = `Olá, ${primeiroNome}! Sua reserva em ${r.imovel_nome} (${periodo}) está confirmada.\n\nAcesse seu check-in: ${link}`;

    const resposta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM || REMETENTE_PADRAO,
        to: [r.hospede_email],
        subject: `Sua reserva em ${r.imovel_nome} está confirmada`,
        html,
        text: texto,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!resposta.ok) {
      console.error(
        `[email] Resend recusou o envio (${resposta.status}):`,
        await resposta.text().catch(() => ""),
      );
    }
  } catch (e) {
    console.error("[email] falha ao enviar o link de check-in:", e);
  }
}
