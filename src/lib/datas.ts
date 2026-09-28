export function paraISO(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function deISO(iso: string): Date {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

export function somarDias(iso: string, dias: number): string {
  const d = deISO(iso);
  d.setDate(d.getDate() + dias);
  return paraISO(d);
}

export function diferencaDias(inicio: string, fim: string): number {
  return Math.round(
    (deISO(fim).getTime() - deISO(inicio).getTime()) / 86400000,
  );
}

export function hojeISO(): string {
  return paraISO(new Date());
}

export function formatarCurta(iso: string): string {
  return deISO(iso)
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    .replace(".", "");
}

export function formatarReais(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** "2026-09" -> "Setembro de 2026" */
export function formatarMes(chave: string): string {
  const [ano, mes] = chave.split("-").map(Number);
  const texto = new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "2026-09" -> "set/26" */
export function formatarMesCurto(chave: string): string {
  const [ano, mes] = chave.split("-").map(Number);
  const abreviado = new Date(ano, mes - 1, 1)
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "");
  return `${abreviado}/${String(ano).slice(2)}`;
}

/** "2026-10-10" -> "out" */
export function mesAbreviado(iso: string): string {
  return deISO(iso)
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "");
}

/** "2026-09-28" -> "seg" */
export function diaSemanaCurto(iso: string): string {
  return deISO(iso)
    .toLocaleDateString("pt-BR", { weekday: "short" })
    .replace(".", "");
}

/** "2026-09-28" -> "Segunda-feira, 28 de setembro" */
export function formatarDataLonga(iso: string): string {
  const texto = deISO(iso).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
