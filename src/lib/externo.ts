import { openUrl } from "@tauri-apps/plugin-opener";

/** Abre um link fora do app (o Safari, no iPhone). No navegador de desenvolvimento, abre uma aba nova. */
export async function abrirLinkExterno(url: string): Promise<void> {
  try {
    await openUrl(url);
  } catch {
    window.open(url, "_blank", "noopener");
  }
}
