import { openUrl } from "@tauri-apps/plugin-opener";
import { isTauri } from "$lib/plataforma";

/** Abre um link fora do app (o Safari, no iPhone). No navegador de desenvolvimento, abre uma aba nova. */
export async function abrirLinkExterno(url: string): Promise<void> {
  try {
    await openUrl(url);
  } catch {
    window.open(url, "_blank", "noopener");
  }
}

function codificar(endereco: string): string {
  return encodeURIComponent(endereco);
}

/** Abre o endereço no Google Maps (aba nova no navegador, navegador do sistema no app) */
export function abrirMapa(endereco: string): Promise<void> {
  return abrirLinkExterno(
    `https://www.google.com/maps/search/?api=1&query=${codificar(endereco)}`,
  );
}

/**
 * Chama o Uber com o endereço como destino.
 * No app (Tauri) o esquema uber:// não é liberado pelo opener, então usa o link universal https,
 * que o sistema entrega ao app do Uber quando instalado.
 * No navegador, tenta o app (uber://) e, se a página continua visível, cai no link web em aba nova.
 */
export async function abrirUber(endereco: string): Promise<void> {
  const destino = codificar(endereco);
  const web = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${destino}`;

  if (isTauri()) {
    await abrirLinkExterno(web);
    return;
  }

  const link = document.createElement("a");
  link.href = `uber://?action=setPickup&pickup=my_location&dropoff[formatted_address]=${destino}`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => {
    if (document.visibilityState === "visible") {
      window.open(web, "_blank", "noopener");
    }
  }, 1200);
}

/** Copia o texto; usa um campo temporário quando a API de área de transferência não está disponível */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const campo = document.createElement("textarea");
    campo.value = texto;
    campo.style.position = "fixed";
    campo.style.opacity = "0";
    document.body.appendChild(campo);
    campo.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    campo.remove();
    return ok;
  }
}
