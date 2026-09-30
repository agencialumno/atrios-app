export interface EventoICS {
  dataInicio: string; // AAAA-MM-DD
  dataFim: string;
}

/** Lê um .ics (Airbnb/Booking) e extrai os períodos bloqueados, em formato de data simples */
export function parsearICS(texto: string): EventoICS[] {
  const eventos: EventoICS[] = [];
  const blocos = texto.split("BEGIN:VEVENT").slice(1);

  for (const bloco of blocos) {
    const inicio = extrairData(bloco, "DTSTART");
    const fim = extrairData(bloco, "DTEND");
    if (inicio && fim) {
      eventos.push({ dataInicio: inicio, dataFim: fim });
    }
  }

  return eventos;
}

function extrairData(bloco: string, campo: string): string | null {
  const regex = new RegExp(`${campo}[^:\\n]*:(\\d{8})`);
  const encontrado = bloco.match(regex);
  if (!encontrado) return null;

  const bruto = encontrado[1]; // AAAAMMDD
  return `${bruto.slice(0, 4)}-${bruto.slice(4, 6)}-${bruto.slice(6, 8)}`;
}

/** Converte qualquer formato que o banco devolva (Date, string ISO, ou já AAAAMMDD) para AAAAMMDD puro */
function paraAAAAMMDD(valor: unknown): string {
  const data = valor instanceof Date ? valor : new Date(String(valor));
  if (isNaN(data.getTime())) {
    return String(valor).replace(/-/g, "").slice(0, 8);
  }
  return data.toISOString().slice(0, 10).replace(/-/g, "");
}

/** Gera um .ics a partir dos bloqueios do imóvel, excluindo os que vieram do próprio canal de destino (sem eco) */
export function gerarICS(
  bloqueios: { data_inicio: unknown; data_fim: unknown; origem: string }[],
  imovelNome: string,
  destino: string | null,
): string {
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Atrios//iCal//PT",
  ];

  for (const b of bloqueios) {
    if (destino && b.origem === destino) continue;

    const inicio = paraAAAAMMDD(b.data_inicio);
    const fim = paraAAAAMMDD(b.data_fim);

    linhas.push(
      "BEGIN:VEVENT",
      `UID:${crypto.randomUUID()}@atrios`,
      `DTSTART;VALUE=DATE:${inicio}`,
      `DTEND;VALUE=DATE:${fim}`,
      `SUMMARY:Reservado - ${imovelNome}`,
      "END:VEVENT",
    );
  }

  linhas.push("END:VCALENDAR");
  return linhas.join("\r\n");
}

const ORIGENS_VALIDAS = ["airbnb", "booking"];

export function origemValida(origem: string): boolean {
  return ORIGENS_VALIDAS.includes(origem);
}
