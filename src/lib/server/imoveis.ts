export const CATEGORIAS_VALIDAS = [
  "apartamento",
  "cobertura",
  "casa",
  "studio",
  "tematico",
];

export function categoriaValida(categoria: string | null | undefined): boolean {
  return categoria == null || CATEGORIAS_VALIDAS.includes(categoria);
}
