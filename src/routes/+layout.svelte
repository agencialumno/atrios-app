<script lang="ts">
    import { onMount } from "svelte";
    import { bloquearGestosDoSistema } from "$lib/bloqueios";
    import { get } from "svelte/store";
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import { api } from "$lib/api/client";
    import { auth, type Usuario } from "$lib/stores/auth";
    import { publicacao } from "$lib/stores/publicacao";
    import BarraNavegacao from "$lib/components/BarraNavegacao.svelte";
    import BarraPublicacao from "$lib/components/BarraPublicacao.svelte";
    import "../lib/styles/theme.css";

    let { children } = $props();

    const rotasComBarra = [
        "/home",
        "/imovel",
        "/perfil",
        "/reservas",
        "/anfitriao",
        "/equipe",
    ];
    const ID_RESERVA = /^[0-9a-fA-F-]{8,64}$/;

    let mostrarBarra = $derived.by(() => {
        const caminho = $page.url.pathname;
        if (caminho.endsWith("/reservar")) return false;
        if (caminho.startsWith("/anfitriao/editar")) return false;
        return rotasComBarra.some(
            (r) => caminho === r || caminho.startsWith(r + "/"),
        );
    });

    let publicando = $derived($publicacao.status !== "ocioso");

    // Enquanto a barra de publicação aparece acima da navegação, empurra o conteúdo fixo para cima
    $effect(() => {
        const extra = mostrarBarra && publicando ? "64px" : "0px";
        document.documentElement.style.setProperty(
            "--altura-publicacao",
            extra,
        );
    });

    // Link que a página de retorno do pagamento usa para reabrir o app: atrios://pagamento?reserva=ID
    function abrirLinkDoApp(endereco: string) {
        try {
            const url = new URL(endereco);
            if (url.protocol !== "atrios:") return;

            const destino = url.hostname || url.pathname.replace(/\//g, "");
            if (destino !== "pagamento") return;

            const id = url.searchParams.get("reserva");
            if (id && ID_RESERVA.test(id)) {
                goto(`/reservas/${id}/pagamento`);
            } else {
                goto("/reservas");
            }
        } catch {
            // link inválido: ignora
        }
    }

    onMount(async () => {
        bloquearGestosDoSistema();
        const token = localStorage.getItem("atrios_token");
        if (!token || get(auth).usuario) return;

        try {
            const usuario = await api<Usuario>("/auth/me", {
                autenticado: true,
            });
            auth.atualizarUsuario(usuario);
        } catch {
            // sem backend no ar, mantém a sessão como está
        }
    });

    onMount(() => {
        let parar: (() => void) | undefined;
        let encerrado = false;

        (async () => {
            try {
                const { getCurrent, onOpenUrl } =
                    await import("@tauri-apps/plugin-deep-link");

                // App aberto do zero por um link
                const iniciais = await getCurrent();
                iniciais?.forEach(abrirLinkDoApp);

                // App já aberto que recebe um link
                const cancelar = await onOpenUrl((urls) =>
                    urls.forEach(abrirLinkDoApp),
                );
                if (encerrado) cancelar();
                else parar = cancelar;
            } catch {
                // fora do app (navegador de desenvolvimento): não há links do sistema
            }
        })();

        return () => {
            encerrado = true;
            parar?.();
        };
    });
</script>

<div class="pagina" class:abaixo-da-barra={publicando && !mostrarBarra}>
    {@render children()}
</div>

{#if mostrarBarra}
    <BarraNavegacao />
{/if}

<BarraPublicacao noTopo={!mostrarBarra} />

<style>
    .abaixo-da-barra {
        padding-top: 72px;
    }
</style>
