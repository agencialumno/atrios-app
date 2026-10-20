import { error } from "@sveltejs/kit";

export interface GuiaImovel {
  acesso?: string;
  estacionamento?: { custo?: string; instrucoes?: string };
  piscina?: { horario?: string; regras?: string };
  academia?: { andar?: string; horario?: string; regras?: string };
  area_gourmet?: { preco?: string; como_reservar?: string };
  lavanderia?: { preco_lavar?: string; preco_secar?: string };
  restaurante?: { descricao?: string };
  bagagem?: {
    tem_maleiro?: boolean;
    lockers_disponiveis?: number | null;
    observacao?: string;
  };
}

const LIMITE_TEXTO = 2000;

const CAMPOS_TEXTO: Record<string, string[]> = {
  estacionamento: ["custo", "instrucoes"],
  piscina: ["horario", "regras"],
  academia: ["andar", "horario", "regras"],
  area_gourmet: ["preco", "como_reservar"],
  lavanderia: ["preco_lavar", "preco_secar"],
  restaurante: ["descricao"],
};

function texto(v: unknown): string {
  return typeof v === "string" ? v.trim().slice(0, LIMITE_TEXTO) : "";
}

/** Aceita só os campos conhecidos do guia, com tipos certos e tamanho limitado */
export function sanitizarGuia(entrada: unknown): GuiaImovel {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) {
    throw error(400, "guia inválido");
  }
  const bruto = entrada as Record<string, any>;
  const guia: Record<string, any> = {};

  guia.acesso = texto(bruto.acesso);

  for (const [secao, campos] of Object.entries(CAMPOS_TEXTO)) {
    guia[secao] = {};
    for (const campo of campos) {
      guia[secao][campo] = texto(bruto[secao]?.[campo]);
    }
  }

  const lockers = Number(bruto.bagagem?.lockers_disponiveis);
  guia.bagagem = {
    tem_maleiro: bruto.bagagem?.tem_maleiro === true,
    lockers_disponiveis:
      Number.isInteger(lockers) && lockers > 0 && lockers < 100000
        ? lockers
        : null,
    observacao: texto(bruto.bagagem?.observacao),
  };

  return guia;
}
