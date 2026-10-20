import { goto } from "$app/navigation";
import { API_URL } from "$lib/config";
import { api } from "$lib/api/client";
import { abrirLinkExterno } from "$lib/externo";
import { isTauri } from "$lib/plataforma";
import { auth, type Usuario } from "$lib/stores/auth";

export type Provedor = "google" | "apple";

/**
 * Login com Google/Apple pelo navegador do sistema.
 * O servidor faz todo o OAuth e devolve o token do Átrios:
 *  - no app, por deep link (atrios://auth?token=...), tratado em ouvirLoginSocial()
 *  - no site, pelo fragmento da URL (/login#token=...), tratado em concluirLoginDoFragmento()
 */
export async function entrarCom(provedor: Provedor): Promise<void> {
  if (isTauri()) {
    await abrirLinkExterno(`${API_URL}/auth/${provedor}/iniciar?app=1`);
  } else {
    window.location.href = `/auth/${provedor}/iniciar`;
  }
}

/** Guarda o token, busca o usuário e entra no app */
export async function concluirLoginComToken(token: string): Promise<void> {
  localStorage.setItem("atrios_token", token);
  const usuario = await api<Usuario>("/auth/me", { autenticado: true });
  auth.login(usuario, token);
  await goto("/home", { replaceState: true });
}

/** No site: o servidor volta para /login#token=... */
export async function concluirLoginDoFragmento(): Promise<boolean> {
  const fragmento = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const token = fragmento.get("token");
  if (!token) return false;
  history.replaceState(null, "", window.location.pathname);
  await concluirLoginComToken(token);
  return true;
}

/** No app: escuta o deep link atrios://auth?token=... (também quando o app é aberto por ele) */
export async function ouvirLoginSocial(
  aoErro: (mensagem: string) => void,
): Promise<() => void> {
  if (!isTauri()) return () => {};

  const { onOpenUrl, getCurrent } = await import(
    "@tauri-apps/plugin-deep-link"
  );

  const tratar = async (urls: string[] | null) => {
    for (const bruta of urls ?? []) {
      try {
        const url = new URL(bruta);
        if (url.protocol !== "atrios:" || url.hostname !== "auth") continue;
        const token = url.searchParams.get("token");
        if (token) await concluirLoginComToken(token);
      } catch (e) {
        aoErro(
          e instanceof Error ? e.message : "Não foi possível concluir o login",
        );
      }
    }
  };

  await tratar(await getCurrent().catch(() => null));
  const parar = await onOpenUrl((urls) => void tratar(urls));
  return parar;
}
