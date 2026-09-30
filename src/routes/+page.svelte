<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { isTauri } from "$lib/plataforma";
    import Splash from "$lib/components/Splash.svelte";
    import HomeInstitucional from "$lib/components/site/HomeInstitucional.svelte";
    import "../lib/styles/theme.css";

    let mostrarSplash = true;
    let ehWeb = $state(false);
    let verificado = $state(false);

    onMount(() => {
        if (isTauri()) {
            // App mobile/nativo: mantém a splash e o redirecionamento de sempre
            setTimeout(() => {
                mostrarSplash = false;

                const token = localStorage.getItem("atrios_token");
                if (token) {
                    goto("/home");
                } else {
                    goto("/bem-vindo");
                }
            }, 3000);
        } else {
            // Navegador comum (o site): mostra a home institucional
            ehWeb = true;
        }

        verificado = true;
    });
</script>

{#if !verificado}
    <!-- nada renderiza neste instante mínimo, evita piscar a splash no navegador -->
{:else if ehWeb}
    <HomeInstitucional />
{:else}
    <Splash visivel={mostrarSplash} />
{/if}
