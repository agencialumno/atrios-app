import { text } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url }) => {
  const comConflito = url.searchParams.get("conflito") === "1";

  const hoje = new Date();
  function formatar(diasAPartirDeHoje: number): string {
    const d = new Date(hoje);
    d.setDate(d.getDate() + diasAPartirDeHoje);
    return d.toISOString().slice(0, 10).replace(/-/g, "");
  }

  const eventos = [
    { inicio: formatar(5), fim: formatar(8) },
    { inicio: formatar(15), fim: formatar(18) },
  ];
  if (comConflito) {
    eventos.push({ inicio: formatar(1), fim: formatar(3) });
  }

  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Airbnb//Demo//PT",
  ];
  for (const ev of eventos) {
    linhas.push(
      "BEGIN:VEVENT",
      `UID:${crypto.randomUUID()}@airbnb-demo`,
      `DTSTART;VALUE=DATE:${ev.inicio}`,
      `DTEND;VALUE=DATE:${ev.fim}`,
      "SUMMARY:Reserved",
      "END:VEVENT",
    );
  }
  linhas.push("END:VCALENDAR");

  return text(linhas.join("\r\n"), {
    headers: { "Content-Type": "text/calendar; charset=utf-8" },
  });
};
