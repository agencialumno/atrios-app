<script lang="ts">
    import { onMount } from "svelte";
    import { get } from "svelte/store";
    import { page } from "$app/stores";
    import { api } from "$lib/api/client";
    import { auth, type Usuario } from "$lib/stores/auth";
    import { publicacao } from "$lib/stores/publicacao";
    import BarraNavegacao from "$lib/components/BarraNavegacao.svelte";
    import BarraNavegacaoDesktop from "$lib/components/BarraNavegacaoDesktop.svelte";
    import BarraPublicacao from "$lib/components/BarraPublicacao.svelte";
    import "../lib/styles/theme.css";

    let { children } = $props();

    const rotasComBarra = ["/home", "/imovel", "/perfil", "/reservas"];

    let mostrarBarra = $derived.by(() => {
        const caminho = $page.url.pathname;
        if (caminho.endsWith("/reservar")) return false;
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

    onMount(async () => {
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
</script>

<div
    class="pagina"
    class:abaixo-da-barra={publicando && !mostrarBarra}
    class:com-topo-desktop={mostrarBarra}
>
    {@render children()}
</div>

{#if mostrarBarra}
    <BarraNavegacao />
    <BarraNavegacaoDesktop />
{/if}

<BarraPublicacao noTopo={!mostrarBarra} />

<style>
    .abaixo-da-barra {
        padding-top: 72px;
    }

    /* No desktop, a barra de navegação vira fixa no topo; empurra o conteúdo pra baixo dela */
    @media (min-width: 960px) {
        .com-topo-desktop {
            padding-top: 64px;
        }
    }
</style>
