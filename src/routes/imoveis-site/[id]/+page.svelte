<script lang="ts">
    import { page } from "$app/stores";
    import { onMount } from "svelte";
    import { api } from "$lib/api/client";
    import { encontrarComodidade } from "$lib/comodidades";
    import { icones } from "$lib/icones";
    import CabecalhoSite from "$lib/components/site/CabecalhoSite.svelte";
    import RodapeSite from "$lib/components/site/RodapeSite.svelte";
    import "$lib/styles/theme.css";
    import "$lib/styles/site.css";

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
        comodidades: string | null;
        fotos: string | null;
        video_tour: string | null;
        area_comum_fotos: string | null;
        area_comum_video: string | null;
    }

    let imovel = $state<Imovel | null>(null);
    let carregando = $state(true);
    let erro = $state("");
    let fotoAtiva = $state(0);
    let mostrarAreaComum = $state(false);

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

    function fotoAnterior() {
        if (fotos.length === 0) return;
        fotoAtiva = fotoAtiva === 0 ? fotos.length - 1 : fotoAtiva - 1;
    }

    function proximaFoto() {
        if (fotos.length === 0) return;
        fotoAtiva = fotoAtiva === fotos.length - 1 ? 0 : fotoAtiva + 1;
    }

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
            erro =
                e instanceof Error
                    ? e.message
                    : "Não foi possível carregar este imóvel";
        } finally {
            carregando = false;
        }
    });
</script>

<svelte:head>
    <title>{imovel?.nome ?? "Imóvel"} — Átrios Gestão & Locação</title>
</svelte:head>

<CabecalhoSite />

<main class="pagina">
    {#if carregando}
        <p class="estado">Carregando...</p>
    {:else if erro || !imovel}
        <p class="estado erro">{erro || "Imóvel não encontrado."}</p>
    {:else}
        <section class="galeria-secao">
            <div class="galeria">
                <div class="foto-principal">
                    {#if fotos.length > 0}
                        <img src={fotos[fotoAtiva]} alt={imovel.nome} />
                        {#if fotos.length > 1}
                            <button
                                class="seta seta-esq"
                                onclick={fotoAnterior}
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
                                class="seta seta-dir"
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
                            <span class="contador-fotos"
                                >{fotoAtiva + 1} / {fotos.length}</span
                            >
                        {/if}
                    {:else}
                        <img
                            src="/atrios-simbolo.png"
                            alt=""
                            class="sem-foto"
                        />
                    {/if}
                </div>

                {#if fotos.length > 1}
                    <div class="miniaturas">
                        {#each fotos as foto, i (i)}
                            <button
                                class="miniatura"
                                class:ativa={i === fotoAtiva}
                                onclick={() => (fotoAtiva = i)}
                            >
                                <img src={foto} alt="Foto {i + 1}" />
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>
        </section>

        <section class="secao-pagina detalhe">
            <div class="coluna-principal">
                <h1>{imovel.nome}</h1>
                <p class="localizacao">{imovel.cidade} — {imovel.endereco}</p>

                <div class="specs">
                    <span>{imovel.capacidade_hospedes} hóspedes</span>
                    <span>·</span>
                    <span
                        >{imovel.quartos}
                        {imovel.quartos === 1 ? "quarto" : "quartos"}</span
                    >
                    <span>·</span>
                    <span
                        >{imovel.banheiros}
                        {imovel.banheiros === 1
                            ? "banheiro"
                            : "banheiros"}</span
                    >
                </div>

                {#if imovel.descricao}
                    <section class="bloco">
                        <h2>Sobre o imóvel</h2>
                        <p class="descricao">{imovel.descricao}</p>
                    </section>
                {/if}

                {#if areaFotos.length > 0 || imovel.area_comum_video}
                    <button
                        class="bloco-area-comum"
                        onclick={() => (mostrarAreaComum = true)}
                    >
                        {#if areaFotos.length > 0}
                            <img class="area-capa" src={areaFotos[0]} alt="" />
                        {/if}
                        <span class="area-texto"
                            >Veja como é a área comum do condomínio</span
                        >
                    </button>
                {/if}

                {#if itensComodidades.length > 0}
                    <section class="bloco">
                        <h2>O que este lugar oferece</h2>
                        <div class="comodidades">
                            {#each itensComodidades as item (item.nome)}
                                <div class="comodidade">
                                    <span class="comodidade-icone"
                                        >{@html item.icone}</span
                                    >
                                    <span>{item.nome}</span>
                                </div>
                            {/each}
                        </div>
                    </section>
                {/if}
            </div>

            <aside class="coluna-lateral">
                <div class="cartao-reserva">
                    <p class="preco">
                        R$ {imovel.preco_base_noite.toFixed(0)}
                        <span>/noite</span>
                    </p>
                    <p class="nota-reserva">
                        Para reservar, baixe o app Átrios ou fale com a nossa
                        equipe.
                    </p>
                    <a href="/contato" class="botao-principal cheio"
                        >Falar com a Átrios</a
                    >
                </div>
            </aside>
        </section>
    {/if}
</main>

<RodapeSite />

{#if mostrarAreaComum && imovel}
    <div
        class="visor-area"
        role="dialog"
        aria-modal="true"
        onclick={() => (mostrarAreaComum = false)}
    >
        <div class="visor-conteudo" onclick={(e) => e.stopPropagation()}>
            <button
                class="fechar-visor"
                onclick={() => (mostrarAreaComum = false)}>✕</button
            >
            {#if imovel.area_comum_video}
                <video src={imovel.area_comum_video} controls class="video-area"
                ></video>
            {/if}
            <div class="fotos-area">
                {#each areaFotos as foto, i (i)}
                    <img src={foto} alt="Área comum, foto {i + 1}" />
                {/each}
            </div>
        </div>
    </div>
{/if}

<style>
    :global(body) {
        margin: 0;
    }

    .pagina {
        font-family: var(--fonte-corpo);
        color: var(--cor-texto);
        background-color: var(--cor-fundo);
        padding-top: 88px;
    }

    .estado {
        text-align: center;
        padding: 6rem 2rem;
        font-size: 0.95rem;
        opacity: 0.7;
    }

    .estado.erro {
        color: #b23a2f;
    }

    /* Galeria */
    .galeria-secao {
        max-width: 1280px;
        margin: 0 auto;
        padding: 1.5rem 2.5rem 0;
    }

    .galeria {
        display: flex;
        flex-direction: column;
        gap: 0.7rem;
    }

    .foto-principal {
        position: relative;
        border-radius: var(--raio-lg);
        overflow: hidden;
        aspect-ratio: 16 / 9;
        background-color: var(--atrios-creme);
    }

    .seta {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: none;
        background-color: rgba(255, 255, 255, 0.85);
        color: var(--atrios-verde-escuro);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(31, 42, 38, 0.2);
        transition: background-color 0.2s;
    }

    .seta:hover {
        background-color: var(--atrios-branco);
    }

    .seta svg {
        width: 22px;
        height: 22px;
    }

    .seta-esq {
        left: 1rem;
    }

    .seta-dir {
        right: 1rem;
    }

    .contador-fotos {
        position: absolute;
        bottom: 1rem;
        right: 1rem;
        padding: 0.3rem 0.8rem;
        border-radius: var(--raio-pill);
        background-color: rgba(0, 0, 0, 0.6);
        color: #fff;
        font-size: 0.75rem;
        font-weight: 600;
    }

    .foto-principal img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .foto-principal img.sem-foto {
        object-fit: contain;
        padding: 4rem;
        opacity: 0.4;
    }

    .miniaturas {
        display: flex;
        gap: 0.6rem;
        overflow-x: auto;
    }

    .miniatura {
        flex-shrink: 0;
        width: 90px;
        height: 65px;
        border-radius: var(--raio-sm);
        overflow: hidden;
        border: 2px solid transparent;
        padding: 0;
        cursor: pointer;
        background: none;
    }

    .miniatura.ativa {
        border-color: var(--atrios-dourado);
    }

    .miniatura img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    /* Detalhe */
    .detalhe {
        display: grid;
        grid-template-columns: 1fr 340px;
        gap: 3.5rem;
        align-items: start;
    }

    .coluna-principal h1 {
        font-family: var(--fonte-titulo);
        font-size: clamp(1.5rem, 3vw, 2rem);
        margin: 0 0 0.4rem;
    }

    .localizacao {
        font-size: 0.9rem;
        opacity: 0.65;
        margin: 0 0 1.2rem;
    }

    .specs {
        display: flex;
        gap: 0.6rem;
        font-size: 0.9rem;
        opacity: 0.75;
        margin-bottom: 2rem;
        padding-bottom: 2rem;
        border-bottom: 1px solid var(--cor-borda);
    }

    .bloco {
        margin-bottom: 2.2rem;
    }

    .bloco h2 {
        font-family: var(--fonte-titulo);
        font-size: 1.1rem;
        margin: 0 0 0.8rem;
    }

    .descricao {
        font-size: 0.92rem;
        line-height: 1.7;
        opacity: 0.8;
        margin: 0;
    }

    .bloco-area-comum {
        display: flex;
        align-items: center;
        gap: 1rem;
        width: 100%;
        margin-bottom: 2.2rem;
        padding: 0.9rem;
        border: none;
        border-radius: var(--raio-md);
        background-color: var(--atrios-branco);
        box-shadow: 0 4px 16px rgba(31, 42, 38, 0.08);
        cursor: pointer;
        text-align: left;
    }

    .area-capa {
        width: 72px;
        height: 72px;
        border-radius: var(--raio-sm);
        object-fit: cover;
        flex-shrink: 0;
    }

    .area-texto {
        font-weight: 700;
        font-size: 0.92rem;
    }

    .comodidades {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.8rem;
    }

    .comodidade {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        font-size: 0.88rem;
    }

    .comodidade-icone {
        display: flex;
        width: 22px;
        height: 22px;
        color: var(--atrios-verde-escuro);
    }

    .comodidade-icone :global(svg) {
        width: 100%;
        height: 100%;
    }

    /* Coluna lateral (reserva) */
    .coluna-lateral {
        position: sticky;
        top: 100px;
    }

    .cartao-reserva {
        padding: 1.6rem;
        border-radius: var(--raio-lg);
        background-color: var(--atrios-branco);
        box-shadow: 0 10px 30px rgba(31, 42, 38, 0.1);
    }

    .preco {
        font-family: var(--fonte-titulo);
        font-size: 1.5rem;
        font-weight: 700;
        margin: 0 0 0.8rem;
    }

    .preco span {
        font-family: var(--fonte-corpo);
        font-weight: 400;
        font-size: 0.85rem;
        opacity: 0.6;
    }

    .nota-reserva {
        font-size: 0.82rem;
        opacity: 0.7;
        margin: 0 0 1.2rem;
        line-height: 1.5;
    }

    .botao-principal.cheio {
        width: 100%;
        display: block;
        text-align: center;
    }

    /* Visor da área comum */
    .visor-area {
        position: fixed;
        inset: 0;
        z-index: 100;
        background-color: rgba(17, 22, 20, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
    }

    .visor-conteudo {
        position: relative;
        max-width: 900px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        background-color: var(--atrios-branco);
        border-radius: var(--raio-lg);
        padding: 1.5rem;
    }

    .fechar-visor {
        position: absolute;
        top: 1rem;
        right: 1rem;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: none;
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        font-size: 1rem;
        cursor: pointer;
        z-index: 2;
    }

    .video-area {
        width: 100%;
        border-radius: var(--raio-md);
        margin-bottom: 1rem;
        max-height: 60vh;
    }

    .fotos-area {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.6rem;
    }

    .fotos-area img {
        width: 100%;
        aspect-ratio: 4 / 3;
        object-fit: cover;
        border-radius: var(--raio-sm);
    }

    @media (max-width: 900px) {
        .detalhe {
            grid-template-columns: 1fr;
        }

        .coluna-lateral {
            position: static;
        }

        .fotos-area {
            grid-template-columns: repeat(2, 1fr);
        }
    }
</style>
