<script lang="ts">
    let {
        fotos,
        video = null,
        condominio,
        aberto = $bindable(false),
    }: {
        fotos: string[];
        video?: string | null;
        condominio: string;
        aberto?: boolean;
    } = $props();

    let indice = $state(0);
    let faixa = $state<HTMLElement | null>(null);
    let videoEl = $state<HTMLVideoElement | null>(null);

    let total = $derived(fotos.length + (video ? 1 : 0));
    let noVideo = $derived(!!video && indice === 0);

    function fechar() {
        aberto = false;
    }

    function aoRolar(e: Event) {
        const el = e.currentTarget as HTMLElement;
        indice = Math.round(el.scrollLeft / el.clientWidth);
    }

    function mover(delta: number) {
        if (!faixa) return;
        const destino = Math.min(Math.max(indice + delta, 0), total - 1);
        faixa.scrollTo({
            left: destino * faixa.clientWidth,
            behavior: "smooth",
        });
    }

    function aoTeclar(e: KeyboardEvent) {
        if (!aberto) return;
        if (e.key === "Escape") fechar();
        else if (e.key === "ArrowRight") mover(1);
        else if (e.key === "ArrowLeft") mover(-1);
    }

    // Sempre abre no primeiro item
    $effect(() => {
        if (aberto) indice = 0;
    });

    // O vídeo pausa sozinho quando você passa para as fotos
    $effect(() => {
        if (videoEl && indice !== 0) videoEl.pause();
    });

    // Trava a rolagem da página enquanto a galeria está aberta
    $effect(() => {
        if (!aberto) return;
        const anterior = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = anterior;
        };
    });
</script>

<svelte:window onkeydown={aoTeclar} />

{#if aberto}
    <div
        class="visor"
        role="dialog"
        aria-modal="true"
        aria-label="Área comum do {condominio}"
    >
        <div class="topo">
            <button class="voltar" onclick={fechar} aria-label="Voltar"
                >←</button
            >

            <div class="titulo">
                <span class="titulo-principal">Área comum</span>
                <span class="titulo-sub">{condominio}</span>
            </div>

            <span class="contador"
                >{total > 1 ? `${indice + 1}/${total}` : ""}</span
            >
        </div>

        <div class="palco">
            <div class="faixa" bind:this={faixa} onscroll={aoRolar}>
                {#if video}
                    <div class="slide">
                        <video
                            bind:this={videoEl}
                            src={video}
                            controls
                            playsinline
                            preload="metadata"
                        >
                            <track kind="captions" />
                        </video>
                        <span class="etiqueta">Vídeo</span>
                    </div>
                {/if}

                {#each fotos as foto, i (foto + i)}
                    <div class="slide">
                        <img
                            src={foto}
                            alt="Área comum do {condominio}, foto {i + 1}"
                            loading={i > 1 ? "lazy" : "eager"}
                            decoding="async"
                        />
                    </div>
                {/each}
            </div>

            {#if total > 1}
                {#if indice > 0}
                    <button
                        class="seta esq"
                        onclick={() => mover(-1)}
                        aria-label="Anterior">‹</button
                    >
                {/if}
                {#if indice < total - 1}
                    <button
                        class="seta dir"
                        onclick={() => mover(1)}
                        aria-label="Próximo">›</button
                    >
                {/if}
            {/if}
        </div>

        {#if noVideo && fotos.length > 0}
            <p class="dica">Deslize para o lado para ver as fotos</p>
        {/if}
    </div>
{/if}

<style>
    .visor {
        position: fixed;
        inset: 0;
        z-index: 90;
        display: flex;
        flex-direction: column;
        background-color: #111815;
        font-family: var(--fonte-corpo);
    }

    .topo {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.8rem;
        padding: calc(env(safe-area-inset-top, 0px) + 0.9rem) 1rem 0.9rem;
    }

    .voltar {
        width: 44px;
        height: 44px;
        flex-shrink: 0;
        border: none;
        border-radius: 50%;
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        font-size: 1.15rem;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
    }

    .titulo {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
    }

    .titulo-principal {
        font-family: var(--fonte-titulo);
        font-size: 0.95rem;
        font-weight: 700;
        color: #fff;
    }

    .titulo-sub {
        font-size: 0.72rem;
        color: rgba(255, 255, 255, 0.65);
    }

    .contador {
        flex-shrink: 0;
        min-width: 44px;
        text-align: right;
        font-size: 0.85rem;
        font-weight: 600;
        color: #fff;
    }

    .palco {
        position: relative;
        flex: 1;
        min-height: 0;
    }

    .faixa {
        display: flex;
        height: 100%;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        scrollbar-width: none;
    }

    .faixa::-webkit-scrollbar {
        display: none;
    }

    .slide {
        position: relative;
        flex: 0 0 100%;
        height: 100%;
        scroll-snap-align: center;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .slide img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
    }

    .slide video {
        width: 100%;
        height: 100%;
        object-fit: contain;
        background-color: #000;
    }

    .etiqueta {
        position: absolute;
        top: 0.6rem;
        left: 0.9rem;
        padding: 0.25rem 0.75rem;
        border-radius: var(--raio-pill);
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        font-size: 0.7rem;
        font-weight: 800;
        pointer-events: none;
    }

    .seta {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 42px;
        height: 42px;
        border: none;
        border-radius: 50%;
        background-color: rgba(255, 255, 255, 0.16);
        color: #fff;
        font-size: 1.6rem;
        line-height: 1;
        cursor: pointer;
    }

    .seta.esq {
        left: 0.6rem;
    }

    .seta.dir {
        right: 0.6rem;
    }

    .dica {
        margin: 0;
        padding: 0.7rem 1rem calc(env(safe-area-inset-bottom, 0px) + 0.9rem);
        text-align: center;
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.65);
    }
</style>
