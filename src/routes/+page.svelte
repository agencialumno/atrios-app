<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import Splash from "$lib/components/Splash.svelte";
    import "../lib/styles/theme.css";

    let mostrarSplash = true;

    onMount(() => {
        setTimeout(() => {
            mostrarSplash = false;

            const token = localStorage.getItem("atrios_token");
            if (token) {
                goto("/home");
            } else {
                goto("/bem-vindo");
            }
        }, 3000);
    });
</script>

<Splash visivel={mostrarSplash} />
