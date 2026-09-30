import { isTauri } from "$lib/plataforma";

// Só usada pelo build do Tauri (app mobile/desktop nativo), como substituto opcional
const configurada = import.meta.env.VITE_API_URL as string | undefined;

function calcularBaseURL(): string {
  if (isTauri()) {
    // App nativo: sem servidor próprio, precisa de endereço absoluto
    const padrao = "https://atrios-app-two.vercel.app";
    return (
      configurada && configurada.trim() !== "" ? configurada.trim() : padrao
    ).replace(/\/+$/, "");
  }

  // Site (local ou publicado na Vercel): backend e frontend vivem juntos,
  // então o caminho relativo já resolve certinho contra o domínio atual
  return "";
}

export const API_URL = calcularBaseURL();
