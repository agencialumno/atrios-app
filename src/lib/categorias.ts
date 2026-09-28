import { icones } from "./icones";

export interface Categoria {
  id: string; // mesmo valor salvo no banco (precisa bater com o backend)
  nome: string;
  icone: string;
}

export const categorias: Categoria[] = [
  { id: "apartamento", nome: "Apartamento", icone: icones.apartamento },
  { id: "cobertura", nome: "Cobertura", icone: icones.cobertura },
  { id: "casa", nome: "Casa", icone: icones.casa },
  { id: "studio", nome: "Studio", icone: icones.studio },
  { id: "tematico", nome: "Temático", icone: icones.estrela },
];
