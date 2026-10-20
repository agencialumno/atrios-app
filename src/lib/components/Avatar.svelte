<script lang="ts">
    // Foto de perfil, ou as iniciais do nome sobre uma cor que é sempre a mesma para a mesma pessoa
    let {
        nome = "",
        semente = "",
        foto = null,
        tamanho = 40,
    }: {
        nome?: string;
        semente?: string;
        foto?: string | null;
        tamanho?: number;
    } = $props();

    const CORES = [
        "#8a6f3a",
        "#3f6b57",
        "#5b5f97",
        "#a4573f",
        "#4a7c8c",
        "#7a4f7d",
        "#6b7a3a",
        "#9a4a5a",
    ];

    function iniciais(texto: string): string {
        const partes = texto.trim().split(/\s+/).filter(Boolean);
        if (partes.length === 0) return "?";
        const primeira = Array.from(partes[0])[0];
        if (partes.length === 1) return primeira.toUpperCase();
        const ultima = Array.from(partes[partes.length - 1])[0];
        return (primeira + ultima).toUpperCase();
    }

    function cor(texto: string): string {
        let hash = 0;
        for (const c of texto) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
        return CORES[hash % CORES.length];
    }

    let falhou = $state(false);
    let mostrarFoto = $derived(!!foto && !falhou);

    $effect(() => {
        foto; // nova foto: tenta carregar de novo
        falhou = false;
    });
</script>

<span
    class="avatar"
    style:width="{tamanho}px"
    style:height="{tamanho}px"
    style:font-size="{Math.round(tamanho * 0.4)}px"
    style:background-color={mostrarFoto ? "transparent" : cor(semente || nome)}
    aria-label={nome}
>
    {#if mostrarFoto}
        <img src={foto} alt="" onerror={() => (falhou = true)} />
    {:else}
        {iniciais(nome)}
    {/if}
</span>

<style>
    .avatar {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        border-radius: 50%;
        overflow: hidden;
        color: #fff;
        font-family: var(--fonte-titulo);
        font-weight: 700;
        line-height: 1;
        user-select: none;
    }

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }
</style>
