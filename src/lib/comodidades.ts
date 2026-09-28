import { icones } from "./icones";

export interface Comodidade {
  id: string;
  nome: string; // é o texto salvo no anúncio
  icone: string;
  termos: string[]; // palavras que identificam esta comodidade em texto livre
}

export const comodidades: Comodidade[] = [
  {
    id: "wifi",
    nome: "Wi-Fi",
    icone: icones.wifi,
    termos: ["wifi", "wi fi", "internet"],
  },
  {
    id: "piscina",
    nome: "Piscina",
    icone: icones.piscina,
    termos: ["piscina", "pool"],
  },
  {
    id: "ar",
    nome: "Ar-condicionado",
    icone: icones.arCondicionado,
    termos: ["ar condicionado", "ar cond", "climatizado", "split"],
  },
  {
    id: "garagem",
    nome: "Vaga na garagem",
    icone: icones.garagem,
    termos: ["garagem", "vaga", "estacionamento"],
  },
  {
    id: "cozinha",
    nome: "Cozinha equipada",
    icone: icones.cozinha,
    termos: ["cozinha"],
  },
  {
    id: "tv",
    nome: "TV",
    icone: icones.tv,
    termos: ["tv", "televisao", "smart tv"],
  },
  {
    id: "lavadora",
    nome: "Máquina de lavar",
    icone: icones.lavadora,
    termos: ["maquina de lavar", "lavadora", "lavanderia"],
  },
  {
    id: "churrasqueira",
    nome: "Churrasqueira",
    icone: icones.churrasqueira,
    termos: ["churrasqueira", "churrasco"],
  },
  {
    id: "academia",
    nome: "Academia",
    icone: icones.academia,
    termos: ["academia", "fitness"],
  },
  {
    id: "seguranca",
    nome: "Portaria 24h",
    icone: icones.seguranca,
    termos: ["portaria", "seguranca"],
  },
  {
    id: "pet",
    nome: "Aceita pets",
    icone: icones.pet,
    termos: ["pet", "pets", "animais"],
  },
  {
    id: "cafe",
    nome: "Café da manhã",
    icone: icones.cafe,
    termos: ["cafe da manha", "cafe"],
  },
  {
    id: "varanda",
    nome: "Varanda",
    icone: icones.varanda,
    termos: ["varanda", "sacada", "terraco"],
  },
];

function normalizar(texto: string): string {
  return (
    " " +
    texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim() +
    " "
  );
}

/** Reconhece uma comodidade digitada em texto livre (ex: "Wi-Fi", "ar condicionado"). */
export function encontrarComodidade(texto: string): Comodidade | undefined {
  const alvo = normalizar(texto);
  return comodidades.find((c) =>
    c.termos.some((t) => alvo.includes(normalizar(t))),
  );
}
