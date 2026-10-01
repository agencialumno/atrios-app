<script lang="ts">
    import { icones } from "$lib/icones";

    interface InfoAnuncio {
        cidade: string;
        preco: number;
        hospedes: number;
        quartos: number;
        banheiros: number;
    }

    let {
        fotos,
        nome,
        video = null,
        info = null,
        tourAberto = $bindable(false),
        aoReservar = () => {},
    }: {
        fotos: string[];
        nome: string;
        video?: string | null;
        info?: InfoAnuncio | null;
        tourAberto?: boolean;
        aoReservar?: () => void;
    } = $props();

    let indice = $state(0);
    let faixaEl: HTMLElement | undefined;
    let visorAberto = $state(false);
    let inicioVisor = $state(0);
    let indiceVisor = $state(0);

    let pausado = $state(false);
    let paisagem = $state(false);
    let tempoAtual = $state(0);
    let duracao = $state(0);

    let progresso = $derived(duracao > 0 ? (tempoAtual / duracao) * 100 : 0);

    function aoRolar(e: Event) {
        const el = e.currentTarget as HTMLElement;
        indice = Math.round(el.scrollLeft / el.clientWidth);
    }

    function irPara(i: number) {
        if (!faixaEl) return;
        faixaEl.scrollTo({ left: i * faixaEl.clientWidth, behavior: "smooth" });
    }

    function voltarFoto() {
        irPara(indice === 0 ? fotos.length - 1 : indice - 1);
    }

    function proximaFoto() {
        irPara(indice === fotos.length - 1 ? 0 : indice + 1);
    }

    function aoRolarVisor(e: Event) {
        const el = e.currentTarget as HTMLElement;
        indiceVisor = Math.round(el.scrollLeft / el.clientWidth);
    }

    function abrirVisor(i: number) {
        inicioVisor = i;
        indiceVisor = i;
        visorAberto = true;
    }

    function fecharVisor() {
        visorAberto = false;
    }

    function fecharPlayer() {
        tourAberto = false;
    }

    function reservarDoVideo() {
        fecharPlayer();
        aoReservar();
    }

    function alternarReproducao() {
        pausado = !pausado;
    }

    function aoCarregarVideo(e: Event) {
        const v = e.currentTarget as HTMLVideoElement;
        paisagem = v.videoWidth > v.videoHeight;
    }

    function aoTeclar(e: KeyboardEvent) {
        if (e.key !== "Escape") return;
        if (tourAberto) fecharPlayer();
        else if (visorAberto) fecharVisor();
    }

    // Posiciona o visor na foto que foi tocada
    function posicionar(node: HTMLElement, inicio: number) {
        node.scrollLeft = inicio * node.clientWidth;
    }

    // Sempre que o tour abre, começa do zero
    $effect(() => {
        if (tourAberto) {
            pausado = false;
            tempoAtual = 0;
            duracao = 0;
        }
    });

    // Trava a rolagem da página enquanto o visor ou o tour estiver aberto
    $effect(() => {
        if (!visorAberto && !tourAberto) return;
        const anterior = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = anterior;
        };
    });
</script>

<svelte:window onkeydown={aoTeclar} />

<div class="raiz">
    {#if fotos.length === 0}
        <div class="sem-foto">
            <img src="/atrios-simbolo.png" alt="" />
        </div>
    {:else}
        <div class="carrossel">
            <div class="faixa" onscroll={aoRolar} bind:this={faixaEl}>
                {#each fotos as foto, i (foto + i)}
                    <button
                        class="slide"
                        onclick={() => abrirVisor(i)}
                        aria-label="Ampliar foto {i + 1}"
                    >
                        <img
                            src={foto}
                            alt="{nome}, foto {i + 1}"
                            loading={i > 1 ? "lazy" : "eager"}
                            decoding="async"
                        />
                    </button>
                {/each}
            </div>

            {#if fotos.length > 1}
                <span class="contador">{indice + 1}/{fotos.length}</span>

                <button
                    class="seta-galeria seta-galeria-esq"
                    onclick={voltarFoto}
                    aria-label="Foto anterior"
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                    >
                        <path d="m15 18-6-6 6-6" />
                    </svg>
                </button>
                <button
                    class="seta-galeria seta-galeria-dir"
                    onclick={proximaFoto}
                    aria-label="Próxima foto"
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                    >
                        <path d="m9 18 6-6-6-6" />
                    </svg>
                </button>
            {/if}
        </div>

        {#if fotos.length > 1}
            <div class="miniaturas-desktop">
                {#each fotos as foto, i (foto + i)}
                    <button
                        class="miniatura-desktop"
                        class:ativa={i === indice}
                        onclick={() => irPara(i)}
                    >
                        <img src={foto} alt="Miniatura {i + 1}" />
                    </button>
                {/each}
            </div>
        {/if}
    {/if}
</div>

{#if visorAberto}
    <div
        class="visor"
        role="dialog"
        aria-modal="true"
        aria-label="Fotos de {nome}"
    >
        <div class="visor-topo">
            <button class="fechar" onclick={fecharVisor} aria-label="Fechar"
                >✕</button
            >
            <span class="visor-contador">{indiceVisor + 1}/{fotos.length}</span>
        </div>

        <div
            class="visor-faixa"
            onscroll={aoRolarVisor}
            use:posicionar={inicioVisor}
        >
            {#each fotos as foto, i (foto + i)}
                <div class="visor-pagina">
                    <img src={foto} alt="{nome}, foto {i + 1}" />
                </div>
            {/each}
        </div>
    </div>
{/if}

{#if tourAberto && video}
    <div
        class="tela-video"
        role="dialog"
        aria-modal="true"
        aria-label="Tour em vídeo de {nome}"
    >
        <video
            class="video"
            class:contido={paisagem}
            src={video}
            autoplay
            playsinline
            loop
            bind:paused={pausado}
            bind:currentTime={tempoAtual}
            bind:duration={duracao}
            onloadedmetadata={aoCarregarVideo}
        >
            <track kind="captions" />
        </video>

        <button
            class="toque"
            onclick={alternarReproducao}
            aria-label={pausado ? "Reproduzir" : "Pausar"}
        ></button>

        {#if pausado}
            <span class="icone-pausa" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="#fff">
                    <path d="M8 5v14l11-7z" />
                </svg>
            </span>
        {/if}

        <button class="voltar-video" onclick={fecharPlayer} aria-label="Voltar"
            >←</button
        >

        <div class="rodape-video">
            <div class="trilho">
                <div class="preenchido" style="width: {progresso}%"></div>
            </div>

            <h3>{nome}</h3>

            {#if info}
                <p class="cidade">{info.cidade}</p>

                <div class="specs-video">
                    <span>
                        <i>{@html icones.hospedes}</i>
                        {info.hospedes}
                        {info.hospedes === 1 ? "hóspede" : "hóspedes"}
                    </span>
                    <span>
                        <i>{@html icones.quarto}</i>
                        {info.quartos}
                        {info.quartos === 1 ? "quarto" : "quartos"}
                    </span>
                    <span>
                        <i>{@html icones.banheiro}</i>
                        {info.banheiros}
                        {info.banheiros === 1 ? "banheiro" : "banheiros"}
                    </span>
                </div>

                <div class="acao">
                    <p class="preco">
                        R$ {info.preco.toFixed(0)}
                        <span>/noite</span>
                    </p>
                    <button class="reservar" onclick={reservarDoVideo}
                        >Reservar</button
                    >
                </div>
            {/if}
        </div>
    </div>
{/if}

<style>
    .raiz {
        position: relative;
    }

    .carrossel {
        position: relative;
    }

    .faixa {
        display: flex;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        scrollbar-width: none;
    }

    .faixa::-webkit-scrollbar {
        display: none;
    }

    .slide {
        flex: 0 0 100%;
        scroll-snap-align: start;
        padding: 0;
        border: none;
        background: none;
        cursor: pointer;
    }

    .slide img {
        display: block;
        width: 100%;
        height: 280px;
        object-fit: cover;
        background-color: var(--atrios-creme);
    }

    .contador {
        position: absolute;
        right: 1rem;
        bottom: 2.5rem;
        padding: 0.3rem 0.75rem;
        border-radius: var(--raio-pill);
        background-color: rgba(31, 42, 38, 0.72);
        color: var(--atrios-creme);
        font-family: var(--fonte-corpo);
        font-size: 0.72rem;
        font-weight: 600;
        pointer-events: none;
    }

    .sem-foto {
        height: 280px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: var(--atrios-creme);
    }

    .sem-foto img {
        width: 72px;
        height: auto;
        opacity: 0.6;
    }

    /* Visor de fotos */
    .visor {
        position: fixed;
        inset: 0;
        z-index: 90;
        display: flex;
        flex-direction: column;
        background-color: #111815;
    }

    .visor-topo {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: calc(env(safe-area-inset-top, 0px) + 0.9rem) 1rem 0.9rem;
    }

    .fechar {
        width: 40px;
        height: 40px;
        border: none;
        border-radius: 50%;
        background-color: rgba(255, 255, 255, 0.14);
        color: #fff;
        font-size: 1rem;
        cursor: pointer;
    }

    .visor-contador {
        font-family: var(--fonte-corpo);
        font-size: 0.85rem;
        font-weight: 600;
        color: #fff;
    }

    .visor-faixa {
        flex: 1;
        min-height: 0;
        display: flex;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        scrollbar-width: none;
    }

    .visor-faixa::-webkit-scrollbar {
        display: none;
    }

    .visor-pagina {
        flex: 0 0 100%;
        scroll-snap-align: center;
        display: flex;
        align-items: center;
        justify-content: center;
        padding-bottom: env(safe-area-inset-bottom, 0px);
    }

    .visor-pagina img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
    }

    /* Tour em tela cheia */
    .tela-video {
        position: fixed;
        inset: 0;
        z-index: 90;
        background-color: #000;
        font-family: var(--fonte-corpo);
    }

    .video {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .video.contido {
        object-fit: contain;
    }

    .toque {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        padding: 0;
        border: none;
        background: none;
        cursor: pointer;
    }

    .icone-pausa {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 76px;
        height: 76px;
        margin: -38px 0 0 -38px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background-color: rgba(16, 22, 20, 0.45);
        pointer-events: none;
    }

    .icone-pausa svg {
        width: 34px;
        height: 34px;
        margin-left: 4px;
    }

    .voltar-video {
        position: absolute;
        top: calc(env(safe-area-inset-top, 0px) + 1rem);
        left: 1rem;
        z-index: 2;
        width: 44px;
        height: 44px;
        border: none;
        border-radius: 50%;
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        font-size: 1.15rem;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
    }

    .rodape-video {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1;
        padding: 6rem 1.25rem calc(env(safe-area-inset-bottom, 0px) + 1.25rem);
        background: linear-gradient(
            to top,
            rgba(16, 22, 20, 0.94) 0%,
            rgba(16, 22, 20, 0.78) 45%,
            rgba(16, 22, 20, 0) 100%
        );
        color: #fff;
        pointer-events: none;
    }

    .rodape-video button {
        pointer-events: auto;
    }

    .trilho {
        height: 3px;
        margin-bottom: 1.1rem;
        border-radius: var(--raio-pill);
        background-color: rgba(255, 255, 255, 0.25);
        overflow: hidden;
    }

    .preenchido {
        height: 100%;
        background-color: var(--atrios-dourado);
    }

    .rodape-video h3 {
        margin: 0 0 0.2rem;
        font-family: var(--fonte-titulo);
        font-size: 1.2rem;
        font-weight: 700;
        color: #fff;
    }

    .cidade {
        margin: 0 0 0.8rem;
        font-size: 0.82rem;
        color: rgba(255, 255, 255, 0.8);
    }

    .specs-video {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem 1rem;
        margin-bottom: 1.1rem;
        font-size: 0.78rem;
        color: rgba(255, 255, 255, 0.9);
    }

    .specs-video span {
        display: flex;
        align-items: center;
        gap: 0.35rem;
    }

    .specs-video i {
        display: inline-flex;
        width: 16px;
        height: 16px;
        color: var(--atrios-dourado);
    }

    .specs-video i :global(svg) {
        width: 100%;
        height: 100%;
    }

    .acao {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
    }

    .preco {
        margin: 0;
        font-family: var(--fonte-titulo);
        font-size: 1.25rem;
        font-weight: 700;
        color: #fff;
    }

    .preco span {
        font-family: var(--fonte-corpo);
        font-size: 0.75rem;
        font-weight: 400;
        color: rgba(255, 255, 255, 0.75);
    }

    .reservar {
        padding: 0.85rem 2.1rem;
        border: none;
        border-radius: var(--raio-pill);
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        font-family: var(--fonte-corpo);
        font-weight: 700;
        font-size: 0.9rem;
        cursor: pointer;
    }

    /* Setas e miniaturas: só aparecem no desktop. No mobile, o swipe nativo já resolve */
    .seta-galeria {
        display: none;
    }

    .miniaturas-desktop {
        display: none;
    }

    @media (min-width: 960px) {
        .seta-galeria {
            display: flex;
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            width: 44px;
            height: 44px;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            border: none;
            background-color: rgba(255, 255, 255, 0.85);
            color: var(--atrios-verde-escuro);
            cursor: pointer;
            box-shadow: 0 2px 10px rgba(31, 42, 38, 0.2);
            z-index: 2;
            transition: background-color 0.2s;
        }

        .seta-galeria:hover {
            background-color: var(--atrios-branco);
        }

        .seta-galeria svg {
            width: 22px;
            height: 22px;
        }

        .seta-galeria-esq {
            left: 1rem;
        }

        .seta-galeria-dir {
            right: 1rem;
        }

        .miniaturas-desktop {
            display: flex;
            gap: 0.6rem;
            margin-top: 0.7rem;
            overflow-x: auto;
        }

        .miniatura-desktop {
            flex-shrink: 0;
            width: 90px;
            height: 65px;
            padding: 0;
            border: 2px solid transparent;
            border-radius: var(--raio-sm);
            overflow: hidden;
            cursor: pointer;
            background: none;
        }

        .miniatura-desktop.ativa {
            border-color: var(--atrios-dourado);
        }

        .miniatura-desktop img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
    }
</style>
