<script lang="ts">
    import { page } from "$app/stores";
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { api } from "$lib/api/client";
    import { icones } from "$lib/icones";
    import { encontrarComodidade } from "$lib/comodidades";
    import Galeria from "$lib/components/Galeria.svelte";
    import AreaComum from "$lib/components/AreaComum.svelte";
    import Preloader from "$lib/components/Preloader.svelte";
    import "../../../lib/styles/theme.css";

    interface Imovel {
        id: string;
        nome: string;
        endereco: string;
        cidade: string;
        capacidade_hospedes: number;
        quartos: number;
        banheiros: number;
        preco_base_noite: number;
        descricao: string | null;
        comodidades: string | null; // JSON string
        fotos: string | null; // JSON string
        video_tour: string | null;
        area_comum_fotos: string | null; // JSON string
        area_comum_video: string | null;
    }

    let imovel = $state<Imovel | null>(null);
    let carregando = $state(true);
    let erro = $state("");
    let tourAberto = $state(false);
    let areaAberta = $state(false);

    let idImovel = $derived($page.params.id);

    function lerLista(json: string | null): string[] {
        try {
            const lista = JSON.parse(json ?? "[]");
            return Array.isArray(lista) ? lista : [];
        } catch {
            return [];
        }
    }

    function capitalizar(texto: string): string {
        const limpo = texto.trim();
        return limpo.charAt(0).toUpperCase() + limpo.slice(1);
    }

    let fotos = $derived(imovel ? lerLista(imovel.fotos) : []);
    let areaFotos = $derived(imovel ? lerLista(imovel.area_comum_fotos) : []);
    let areaVideo = $derived(imovel?.area_comum_video ?? null);
    let temAreaComum = $derived(areaFotos.length > 0 || !!areaVideo);

    let textoArea = $derived.by(() => {
        const partes: string[] = [];
        if (areaFotos.length > 0) {
            partes.push(
                `${areaFotos.length} ${areaFotos.length === 1 ? "foto" : "fotos"}`,
            );
        }
        if (areaVideo) partes.push("vídeo");
        return partes.join(" e ");
    });

    let itensComodidades = $derived(
        lerLista(imovel?.comodidades ?? null)
            .map((texto) => {
                const conhecida = encontrarComodidade(texto);
                return {
                    nome: conhecida?.nome ?? capitalizar(texto),
                    icone: conhecida?.icone ?? icones.check,
                };
            })
            .filter(
                (item, i, todos) =>
                    todos.findIndex((o) => o.nome === item.nome) === i,
            ),
    );

    onMount(async () => {
        try {
            imovel = await api<Imovel>(`/imoveis/${idImovel}`);
        } catch (e) {
            erro = e instanceof Error ? e.message : "Erro ao carregar imóvel";
        } finally {
            carregando = false;
        }
    });

    function irParaReserva() {
        goto(`/imovel/${idImovel}/reservar`);
    }

    // Garante autoplay mudo dentro do círculo (alguns navegadores ignoram o atributo)
    function iniciarMudo(node: HTMLVideoElement) {
        node.muted = true;
        node.play().catch(() => {});
    }
</script>

<main class:com-tour={!!imovel?.video_tour}>
    {#if carregando}
        <div class="carregando-wrapper">
            <Preloader />
            <p>Carregando...</p>
        </div>
    {:else if erro}
        <p class="estado erro">{erro}</p>
    {:else if imovel}
        <div class="grade-desktop">
            <div class="coluna-galeria">
                <div class="galeria">
                    <a href="/home" class="voltar">←</a>
                    <Galeria
                        {fotos}
                        nome={imovel.nome}
                        video={imovel.video_tour}
                        info={{
                            cidade: imovel.cidade,
                            preco: imovel.preco_base_noite,
                            hospedes: imovel.capacidade_hospedes,
                            quartos: imovel.quartos,
                            banheiros: imovel.banheiros,
                        }}
                        bind:tourAberto
                        aoReservar={irParaReserva}
                    />
                </div>
            </div>

            <div class="coluna-conteudo">
                <div class="conteudo">
                    <h1>{imovel.nome}</h1>
                    <p class="localizacao">
                        {imovel.cidade} — {imovel.endereco}
                    </p>

                    <div class="specs">
                        <div class="spec">
                            <span class="spec-icone"
                                >{@html icones.hospedes}</span
                            >
                            <span class="spec-numero"
                                >{imovel.capacidade_hospedes}</span
                            >
                            <span class="spec-label">
                                {imovel.capacidade_hospedes === 1
                                    ? "Hóspede"
                                    : "Hóspedes"}
                            </span>
                        </div>
                        <div class="spec">
                            <span class="spec-icone">{@html icones.quarto}</span
                            >
                            <span class="spec-numero">{imovel.quartos}</span>
                            <span class="spec-label"
                                >{imovel.quartos === 1
                                    ? "Quarto"
                                    : "Quartos"}</span
                            >
                        </div>
                        <div class="spec">
                            <span class="spec-icone"
                                >{@html icones.banheiro}</span
                            >
                            <span class="spec-numero">{imovel.banheiros}</span>
                            <span class="spec-label">
                                {imovel.banheiros === 1
                                    ? "Banheiro"
                                    : "Banheiros"}
                            </span>
                        </div>
                    </div>

                    {#if imovel.descricao}
                        <section>
                            <h2>Sobre o imóvel</h2>
                            <p class="descricao">{imovel.descricao}</p>
                        </section>
                    {/if}

                    {#if temAreaComum}
                        <button
                            class="area-comum"
                            onclick={() => (areaAberta = true)}
                        >
                            {#if areaFotos.length > 0}
                                <img
                                    class="area-capa"
                                    src={areaFotos[0]}
                                    alt=""
                                />
                            {:else}
                                <span class="area-capa area-capa-icone"
                                    >{@html icones.piscina}</span
                                >
                            {/if}

                            <span class="area-textos">
                                <span class="area-titulo"
                                    >Veja como é a área comum do condomínio</span
                                >
                                <span class="area-sub">{textoArea}</span>
                            </span>

                            <span class="area-seta" aria-hidden="true">›</span>
                        </button>
                    {/if}

                    {#if itensComodidades.length > 0}
                        <section>
                            <h2>O que este lugar oferece</h2>
                            <div class="comodidades">
                                {#each itensComodidades as item (item.nome)}
                                    <div class="comodidade">
                                        <span class="comodidade-icone"
                                            >{@html item.icone}</span
                                        >
                                        <span class="comodidade-nome"
                                            >{item.nome}</span
                                        >
                                    </div>
                                {/each}
                            </div>
                        </section>
                    {/if}
                </div>

                <div class="reserva-desktop">
                    <p class="reserva-preco">
                        R$ {imovel.preco_base_noite.toFixed(0)}
                        <span>/noite</span>
                    </p>
                    <button class="reserva-botao" onclick={irParaReserva}
                        >Reservar</button
                    >
                </div>
            </div>
        </div>

        <div class="rodape-conjunto">
            {#if imovel.video_tour}
                <button
                    class="tour"
                    onclick={() => (tourAberto = true)}
                    aria-label="Assistir ao tour em vídeo"
                >
                    <span class="miolo">
                        {#if !tourAberto}
                            <video
                                src={imovel.video_tour}
                                autoplay
                                muted
                                loop
                                playsinline
                                preload="auto"
                                tabindex="-1"
                                aria-hidden="true"
                                use:iniciarMudo
                            ></video>
                        {/if}
                    </span>

                    <span class="textos-tour">
                        <span class="texto">
                            <span class="ponto"></span>
                            TOUR
                        </span>
                        <span class="subtexto">Conheça o imóvel em vídeo</span>
                    </span>

                    <span class="play" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    </span>
                </button>
            {/if}

            <div class="rodape-fixo">
                <div class="preco-rodape">
                    <span class="valor"
                        >R$ {imovel.preco_base_noite.toFixed(0)}</span
                    >
                    <span class="unidade">/noite</span>
                </div>
                <button onclick={irParaReserva}>Reservar</button>
            </div>
        </div>

        {#if temAreaComum}
            <AreaComum
                bind:aberto={areaAberta}
                fotos={areaFotos}
                video={areaVideo}
                condominio={imovel.nome}
            />
        {/if}
    {/if}
</main>

<style>
    main {
        min-height: 100dvh;
        background-color: var(--cor-fundo);
        font-family: var(--fonte-corpo);
        padding-bottom: calc(var(--altura-barra) + 110px);
    }

    main.com-tour {
        padding-bottom: calc(var(--altura-barra) + 190px);
    }

    .estado {
        padding: 1.5rem 1rem;
        color: var(--cor-texto);
        font-size: 0.85rem;
    }

    .estado.erro {
        color: #b23a2f;
    }

    .carregando-wrapper {
        min-height: 60vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        color: var(--cor-texto);
        opacity: 0.75;
        font-size: 0.85rem;
    }

    .carregando-wrapper p {
        margin: 0;
    }

    .galeria {
        position: relative;
    }

    .voltar {
        position: absolute;
        top: 1rem;
        left: 1rem;
        width: 38px;
        height: 38px;
        background-color: var(--atrios-branco);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        text-decoration: none;
        color: var(--cor-texto);
        font-size: 1rem;
        z-index: 5;
        box-shadow: 0 2px 10px rgba(31, 42, 38, 0.15);
    }

    .conteudo {
        position: relative;
        margin-top: -24px;
        padding: 1.5rem 1.25rem 1.25rem;
        background-color: var(--cor-fundo);
        border-radius: var(--raio-lg) var(--raio-lg) 0 0;
    }

    h1 {
        font-size: 1.2rem;
        color: var(--cor-texto);
        margin: 0 0 0.2rem;
    }

    .localizacao {
        font-size: 0.8rem;
        color: var(--cor-texto);
        opacity: 0.65;
        margin: 0 0 1.25rem;
    }

    .specs {
        display: flex;
        justify-content: space-around;
        padding: 1rem 0.5rem;
        background-color: var(--atrios-branco);
        border-radius: var(--raio-md);
        box-shadow: 0 2px 10px rgba(31, 42, 38, 0.06);
        margin-bottom: 1.5rem;
    }

    .spec {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.15rem;
    }

    .spec-icone {
        display: inline-flex;
        width: 24px;
        height: 24px;
        margin-bottom: 0.25rem;
        color: var(--atrios-dourado);
    }

    .spec-icone :global(svg) {
        width: 100%;
        height: 100%;
    }

    .spec-numero {
        font-family: var(--fonte-titulo);
        font-size: 1.05rem;
        color: var(--cor-texto);
        font-weight: 700;
    }

    .spec-label {
        font-size: 0.7rem;
        color: var(--cor-texto);
        opacity: 0.65;
    }

    section {
        margin-bottom: 1.5rem;
    }

    h2 {
        font-size: 0.95rem;
        color: var(--cor-texto);
        margin: 0 0 0.5rem;
    }

    .descricao {
        font-size: 0.83rem;
        color: var(--cor-texto);
        opacity: 0.85;
        line-height: 1.5;
        margin: 0;
    }

    /* Cartão da área comum do condomínio */
    .area-comum {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 0.9rem;
        margin-bottom: 1.5rem;
        padding: 0.7rem 0.9rem 0.7rem 0.7rem;
        border: none;
        border-radius: var(--raio-lg);
        background-color: var(--atrios-branco);
        box-shadow: 0 4px 16px rgba(31, 42, 38, 0.08);
        text-align: left;
        font-family: var(--fonte-corpo);
        cursor: pointer;
    }

    .area-capa {
        width: 64px;
        height: 64px;
        flex-shrink: 0;
        border-radius: var(--raio-md);
        object-fit: cover;
        background-color: var(--atrios-creme);
    }

    .area-capa-icone {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--atrios-dourado);
    }

    .area-capa-icone :global(svg) {
        width: 28px;
        height: 28px;
    }

    .area-textos {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
    }

    .area-titulo {
        font-size: 0.86rem;
        font-weight: 700;
        line-height: 1.3;
        color: var(--cor-texto);
    }

    .area-sub {
        font-size: 0.72rem;
        color: var(--cor-texto);
        opacity: 0.65;
    }

    .area-seta {
        flex-shrink: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        font-size: 1.2rem;
        font-weight: 700;
        line-height: 1;
    }

    .comodidades {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.6rem;
    }

    .comodidade {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        min-width: 0;
        padding: 0.6rem 0.75rem;
        background-color: var(--atrios-branco);
        border-radius: var(--raio-md);
        box-shadow: 0 2px 10px rgba(31, 42, 38, 0.05);
    }

    .comodidade-icone {
        flex-shrink: 0;
        width: 34px;
        height: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--raio-sm);
        background-color: var(--atrios-creme);
        color: var(--atrios-verde-escuro);
    }

    .comodidade-icone :global(svg) {
        width: 18px;
        height: 18px;
    }

    .comodidade-nome {
        font-size: 0.78rem;
        font-weight: 500;
        color: var(--cor-texto);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    /* Bloco fixo no rodapé: badge do tour em cima, barra de reservar embaixo.
       Os dois têm a mesma largura e a mesma altura (--altura-cartao). */
    .rodape-conjunto {
        --altura-cartao: 72px;
        position: fixed;
        left: 0.75rem;
        right: 0.75rem;
        bottom: calc(var(--altura-barra) + 0.6rem);
        z-index: 40;
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
    }

    .rodape-fixo {
        width: 100%;
        height: var(--altura-cartao);
        background-color: var(--atrios-branco);
        border-radius: var(--raio-lg);
        box-shadow: 0 6px 24px rgba(31, 42, 38, 0.14);
        padding: 0 0.8rem 0 1.25rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
    }

    .preco-rodape {
        display: flex;
        flex-direction: column;
    }

    .valor {
        font-family: var(--fonte-titulo);
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--cor-texto);
    }

    .unidade {
        font-size: 0.7rem;
        color: var(--cor-texto);
        opacity: 0.6;
    }

    .rodape-fixo button {
        padding: 0.8rem 1.9rem;
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        border: none;
        border-radius: var(--raio-pill);
        font-weight: 600;
        font-size: 0.9rem;
        cursor: pointer;
    }

    /* Badge do tour: mesma largura e altura da barra de reservar */
    .tour {
        width: 100%;
        height: var(--altura-cartao);
        display: flex;
        align-items: center;
        gap: 0.85rem;
        padding: 0 0.8rem 0 8px;
        border: none;
        border-radius: var(--raio-lg);
        background: linear-gradient(
            135deg,
            #ead29a 0%,
            var(--atrios-dourado) 55%,
            #b8975a 100%
        );
        cursor: pointer;
        font-family: var(--fonte-corpo);
        text-align: left;
        animation: brilho 2.2s ease-in-out infinite;
    }

    .miolo {
        position: relative;
        flex-shrink: 0;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        overflow: hidden;
        border: 2px solid var(--atrios-branco);
        background-color: #101614;
    }

    .miolo video {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        pointer-events: none;
    }

    .textos-tour {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
    }

    .texto {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        color: var(--atrios-verde-escuro);
        font-size: 0.95rem;
        font-weight: 800;
        letter-spacing: 0.1em;
    }

    .subtexto {
        color: var(--atrios-verde-escuro);
        opacity: 0.8;
        font-size: 0.75rem;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .ponto {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background-color: var(--atrios-verde-escuro);
        animation: piscar 1.2s ease-in-out infinite;
    }

    .play {
        flex-shrink: 0;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background-color: var(--atrios-verde-escuro);
        color: var(--atrios-dourado);
    }

    .play svg {
        width: 18px;
        height: 18px;
        margin-left: 2px;
    }

    @keyframes brilho {
        0%,
        100% {
            box-shadow:
                inset 0 0 0 1.5px rgba(255, 255, 255, 0.5),
                0 0 10px 1px rgba(201, 169, 107, 0.55),
                0 0 22px 4px rgba(201, 169, 107, 0.35);
        }
        50% {
            box-shadow:
                inset 0 0 0 1.5px rgba(255, 255, 255, 0.85),
                0 0 16px 3px rgba(246, 230, 189, 0.9),
                0 0 34px 10px rgba(201, 169, 107, 0.5);
        }
    }

    @keyframes piscar {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0.25;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .tour,
        .ponto {
            animation: none;
        }

        .tour {
            box-shadow:
                inset 0 0 0 1.5px rgba(255, 255, 255, 0.6),
                0 0 12px 2px rgba(201, 169, 107, 0.6),
                0 0 26px 6px rgba(201, 169, 107, 0.35);
        }
    }

    /* ===== Desktop: layout de duas colunas, sem rodapé/badge de tour flutuante ===== */
    .grade-desktop {
        display: contents;
    }

    .reserva-desktop {
        display: none;
    }

    @media (min-width: 960px) {
        main {
            padding-bottom: 3rem;
        }

        main.com-tour {
            padding-bottom: 3rem;
        }

        .grade-desktop {
            display: grid;
            grid-template-columns: 1.5fr 1fr;
            gap: 3rem;
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem 2.5rem 0;
            align-items: start;
        }

        .coluna-galeria .galeria {
            border-radius: var(--raio-lg);
            overflow: hidden;
        }

        .voltar {
            top: 1.25rem;
            left: 1.25rem;
        }

        .coluna-conteudo {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }

        .conteudo {
            margin-top: 0;
            padding: 0;
            border-radius: 0;
            background: none;
        }

        .reserva-desktop {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            position: sticky;
            top: 100px;
            padding: 1.3rem 1.5rem;
            background-color: var(--atrios-branco);
            border-radius: var(--raio-lg);
            box-shadow: 0 10px 30px rgba(31, 42, 38, 0.1);
        }

        .reserva-preco {
            margin: 0;
            font-family: var(--fonte-titulo);
            font-size: 1.4rem;
            font-weight: 700;
            color: var(--cor-texto);
        }

        .reserva-preco span {
            font-family: var(--fonte-corpo);
            font-weight: 400;
            font-size: 0.85rem;
            opacity: 0.6;
        }

        .reserva-botao {
            padding: 0.85rem 2rem;
            border: none;
            border-radius: var(--raio-pill);
            background-color: var(--atrios-dourado);
            color: var(--atrios-verde-escuro);
            font-family: var(--fonte-corpo);
            font-weight: 700;
            font-size: 0.9rem;
            cursor: pointer;
        }

        /* No desktop, o rodapé flutuante e o badge de tour saem daqui:
           o preço/reservar já está fixo na coluna da direita */
        .rodape-conjunto {
            display: none;
        }
    }
</style>
