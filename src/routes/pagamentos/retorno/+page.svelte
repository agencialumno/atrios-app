<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/stores";

    let pago = $derived($page.url.searchParams.get("resultado") === "ok");
    let temAbaDeOrigem = $state(false);

    onMount(() => {
        temAbaDeOrigem = !!window.opener;

        if (pago && temAbaDeOrigem) {
            const temporizador = setTimeout(() => {
                window.close();
            }, 1800);
            return () => clearTimeout(temporizador);
        }
    });

    function fecharAgora() {
        window.close();
    }
</script>

<svelte:head>
    <title>Átrios</title>
</svelte:head>

<main>
    <div class="cartao">
        <div class="marca" class:alerta={!pago}>{pago ? "✓" : "!"}</div>

        {#if pago}
            <h1>Pagamento recebido</h1>
            <p>
                Sua reserva está sendo confirmada.
                {#if temAbaDeOrigem}
                    Esta aba vai fechar sozinha em instantes.
                {:else}
                    Volte ao app Átrios: ela já aparece em Minhas reservas.
                {/if}
            </p>
        {:else}
            <h1>Pagamento não concluído</h1>
            <p>
                Nenhuma cobrança foi feita. Volte ao app Átrios para tentar de
                novo, enquanto as datas estiverem reservadas para você.
            </p>
        {/if}

        {#if temAbaDeOrigem}
            <button class="botao" onclick={fecharAgora}>Fechar esta aba</button>
        {/if}
    </div>
</main>

<style>
    main {
        min-height: 100dvh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        background-color: var(--atrios-creme, #f5f1ea);
        font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
    }

    .cartao {
        width: 100%;
        max-width: 380px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 0.9rem;
        padding: 2.5rem 2rem;
        background-color: var(--atrios-branco, #fff);
        border-radius: var(--raio-lg, 18px);
        box-shadow: 0 20px 60px rgba(31, 42, 38, 0.15);
    }

    .marca {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background-color: var(--atrios-dourado, #c9a96b);
        color: var(--atrios-verde-escuro, #1f2a26);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.8rem;
        font-weight: 700;
    }

    .marca.alerta {
        background-color: #f4dedb;
        color: #b23a2f;
    }

    h1 {
        margin: 0;
        font-size: 1.25rem;
        color: var(--atrios-verde-escuro, #1f2a26);
    }

    p {
        margin: 0;
        line-height: 1.55;
        color: var(--atrios-verde-escuro, #1f2a26);
        opacity: 0.75;
        font-size: 0.92rem;
    }

    .botao {
        margin-top: 0.4rem;
        padding: 0.75rem 1.8rem;
        border: none;
        border-radius: 999px;
        background-color: var(--atrios-dourado, #c9a96b);
        color: var(--atrios-verde-escuro, #1f2a26);
        font-weight: 700;
        font-size: 0.88rem;
        cursor: pointer;
    }
</style>
