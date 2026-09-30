import { createHmac, timingSafeEqual } from "node:crypto";

const TOLERANCIA_SEGUNDOS = 300;

export function verificarAssinaturaStripe(
  corpoBruto: string,
  cabecalho: string,
  segredo: string,
): { valido: boolean; motivo?: string } {
  let momento: string | null = null;
  const assinaturas: string[] = [];

  for (const parte of cabecalho.split(",")) {
    const [chave, valor] = parte.trim().split("=");
    if (chave === "t") momento = valor;
    else if (chave === "v1") assinaturas.push(valor);
  }

  if (!momento) return { valido: false, motivo: "assinatura sem data" };

  const carimbo = Number(momento);
  if (Math.abs(Date.now() / 1000 - carimbo) > TOLERANCIA_SEGUNDOS) {
    return { valido: false, motivo: "notificação fora do prazo de validade" };
  }
  if (assinaturas.length === 0)
    return { valido: false, motivo: "assinatura ausente" };

  const carga = `${momento}.${corpoBruto}`;
  const esperada = createHmac("sha256", segredo.trim())
    .update(carga)
    .digest("hex");
  const bufEsperada = Buffer.from(esperada, "hex");

  for (const candidata of assinaturas) {
    try {
      const bufCandidata = Buffer.from(candidata, "hex");
      if (
        bufCandidata.length === bufEsperada.length &&
        timingSafeEqual(bufCandidata, bufEsperada)
      ) {
        return { valido: true };
      }
    } catch {
      // hex inválido: ignora essa candidata
    }
  }

  return { valido: false, motivo: "assinatura inválida" };
}
