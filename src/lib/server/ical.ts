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
  // Cobre tanto "DTSTART;VALUE=DATE:20261210" (formato comum do Airbnb/Booking)
  // quanto "DTSTART:20261210T000000Z"
  const regex = new RegExp(`${campo}[^:\\n]*:(\\d{8})`);
  const encontrado = bloco.match(regex);
  if (!encontrado) return null;

  const bruto = encontrado[1]; // AAAAMMDD
  return `${bruto.slice(0, 4)}-${bruto.slice(4, 6)}-${bruto.slice(6, 8)}`;
}

/** Gera um .ics a partir dos bloqueios do imóvel, excluindo os que vieram do próprio canal de destino (sem eco) */
export function gerarICS(
  bloqueios: { data_inicio: string; data_fim: string; origem: string }[],
  imovelNome: string,
  destino: string | null,
): string {
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Atrios//iCal//PT",
  ];

  for (const b of bloqueios) {
    if (destino && b.origem === destino) continue; // não exporta de volta pro canal de origem

    const inicio = String(b.data_inicio).replace(/-/g, "");
    const fim = String(b.data_fim).replace(/-/g, "");

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
