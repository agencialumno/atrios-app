<script lang="ts">
    import { page } from "$app/stores";

    let pago = $derived($page.url.searchParams.get("resultado") === "ok");
</script>

<svelte:head>
    <title>Átrios</title>
</svelte:head>

<main>
    <div class="marca">{pago ? "✓" : "!"}</div>
    {#if pago}
        <h1>Pagamento recebido</h1>
        <p>Sua reserva está sendo confirmada. Volte ao app Átrios: ela já aparece em Minhas reservas.</p>
    {:else}
        <h1>Pagamento não concluído</h1>
        <p>
            Nenhuma cobrança foi feita. Volte ao app Átrios para tentar de novo, enquanto as datas
            estiverem reservadas para você.
        </p>
    {/if}
</main>

<style>
    main {
        min-height: 100dvh;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: var(--atrios-creme, #f5f1ea);
        color: var(--atrios-verde-escuro, #1f2a26);
        font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
    }

    .marca {
        width: 64px;
        height: 64px;
        margin: 0 auto 1.2rem;
        border-radius: 50%;
        background-color: var(--atrios-dourado, #c9a96b);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.8rem;
        font-weight: 700;
    }

    div {
        text-align: center;
        max-width: 360px;
        padding: 2rem 1.5rem;
    }

    h1 {
        margin: 0 0 0.6rem;
        font-size: 1.3rem;
    }

    p {
        margin: 0;
        line-height: 1.5;
        opacity: 0.75;
        font-size: 0.95rem;
    }
</style>
