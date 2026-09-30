/** true quando roda dentro do app (Tauri, mobile/desktop nativo); false no navegador comum (o site) */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
