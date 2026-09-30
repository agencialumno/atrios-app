<script lang="ts">
    let {
        mensagem,
        aoFechar,
    }: { mensagem: string; aoFechar: () => void } = $props();
</script>

{#if mensagem}
    <div class="fundo" onclick={aoFechar} role="presentation">
        <div
            class="modal"
            onclick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-label="Erro"
        >
            <div class="icone">!</div>
            <p>{mensagem}</p>
            <button onclick={aoFechar}>Entendi</button>
        </div>
    </div>
{/if}

<style>
    .fundo {
        position: fixed;
        inset: 0;
        z-index: 200;
        background-color: rgba(31, 42, 38, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
    }

    .modal {
        width: 100%;
        max-width: 340px;
        background-color: var(--atrios-branco);
        border-radius: var(--raio-lg);
        padding: 1.8rem 1.6rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 0.9rem;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
    }

    .icone {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background-color: #f4dedb;
        color: #b23a2f;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.3rem;
        font-weight: 700;
    }

    p {
        margin: 0;
        font-size: 0.9rem;
        line-height: 1.5;
        color: var(--cor-texto);
    }

    button {
        padding: 0.65rem 1.6rem;
        border: none;
        border-radius: var(--raio-pill);
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        font-family: var(--fonte-corpo);
        font-weight: 600;
        font-size: 0.85rem;
        cursor: pointer;
    }
</style>
