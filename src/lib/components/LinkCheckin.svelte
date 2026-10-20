<script lang="ts">
    import { icones } from "$lib/icones";
    import { copiarTexto } from "$lib/externo";

    let { token }: { token: string } = $props();

    // No site usa o próprio endereço; no app (sem domínio próprio) usa o endereço público do site
    const ORIGEM_PUBLICA = "https://atrios-app-two.vercel.app";

    let link = $derived(`${ORIGEM_PUBLICA}/checkin/${token}`);
    let copiado = $state(false);

    async function copiar() {
        copiado = await copiarTexto(link);
        if (copiado) setTimeout(() => (copiado = false), 2000);
    }
</script>

<div class="link-checkin">
    <div class="textos">
        <span class="rotulo">Link de check-in do hóspede</span>
        <span class="url">{link}</span>
    </div>
    <button type="button" onclick={copiar}>
        <span class="icone">{@html icones.copiar}</span>
        {copiado ? "Copiado!" : "Copiar"}
    </button>
</div>

<style>
    .link-checkin {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        padding: 0.7rem 0.8rem;
        background-color: var(--atrios-creme);
        border-radius: var(--raio-md);
        text-align: left;
    }

    .textos {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
    }

    .rotulo {
        font-size: 0.7rem;
        font-weight: 600;
        color: var(--cor-texto);
        opacity: 0.7;
    }

    .url {
        font-size: 0.75rem;
        color: var(--cor-texto);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    button {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        flex-shrink: 0;
        padding: 0.5rem 0.9rem;
        border: none;
        border-radius: var(--raio-pill);
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        font-family: var(--fonte-corpo);
        font-weight: 600;
        font-size: 0.78rem;
        cursor: pointer;
    }

    .icone {
        display: flex;
        width: 14px;
        height: 14px;
    }

    @media (min-width: 960px) {
        .url {
            font-size: 0.82rem;
        }
    }
</style>
