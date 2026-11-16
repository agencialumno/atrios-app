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

export interface DestinoUber {
  endereco: string;
  nome?: string;
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * Link universal do Uber com o endereço como destino. Sem uber://: o iOS entrega o link https ao app
 * do Uber quando instalado e abre a página web quando não está.
 */
export function linkUber(destino: DestinoUber): string {
  const partes = [
    "action=setPickup",
    "pickup=my_location",
    `dropoff[formatted_address]=${codificar(destino.endereco)}`,
  ];
  if (destino.nome) partes.push(`dropoff[nickname]=${codificar(destino.nome)}`);
  if (destino.latitude != null && destino.longitude != null) {
    partes.push(`dropoff[latitude]=${destino.latitude}`);
    partes.push(`dropoff[longitude]=${destino.longitude}`);
  }
  return `https://m.uber.com/ul/?${partes.join("&")}`;
}

/**
 * Clique do <a> do Uber. No navegador deixa o link nativo abrir (target="_blank"); no app (Tauri)
 * cancela o link e abre pelo mesmo caminho do botão do mapa.
 */
export function aoClicarLink(evento: MouseEvent, url: string): void {
  if (!isTauri()) return;
  evento.preventDefault();
  void abrirLinkExterno(url);
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
