<script lang="ts">
    import { onMount } from "svelte";
    import { api } from "$lib/api/client";
    import CabecalhoSite from "$lib/components/site/CabecalhoSite.svelte";
    import RodapeSite from "$lib/components/site/RodapeSite.svelte";
    import "$lib/styles/theme.css";
    import "$lib/styles/site.css";

    interface Imovel {
        id: string;
        nome: string;
        cidade: string;
        preco_base_noite: number;
        capacidade_hospedes: number;
        quartos: number;
        banheiros: number;
        fotos: string | null;
        categoria: string | null;
    }

    const categorias = [
        { id: "", nome: "Todos" },
        { id: "apartamento", nome: "Apartamento" },
        { id: "cobertura", nome: "Cobertura" },
        { id: "casa", nome: "Casa" },
        { id: "studio", nome: "Studio" },
        { id: "tematico", nome: "Temático" },
    ];

    let imoveis = $state<Imovel[]>([]);
    let carregando = $state(true);
    let erro = $state("");
    let categoriaAtiva = $state("");

    function lerPrimeiraFoto(json: string | null): string | null {
        try {
            const lista = JSON.parse(json ?? "[]");
            return Array.isArray(lista) && lista.length > 0 ? lista[0] : null;
        } catch {
            return null;
        }
    }

    let filtrados = $derived(
        categoriaAtiva
            ? imoveis.filter((i) => i.categoria === categoriaAtiva)
            : imoveis,
    );

    onMount(async () => {
        try {
            imoveis = await api<Imovel[]>("/imoveis");
        } catch (e) {
            erro =
                e instanceof Error
                    ? e.message
                    : "Não foi possível carregar os imóveis";
        } finally {
            carregando = false;
        }
    });
</script>

<svelte:head>
    <title>Imóveis — Átrios Gestão & Locação</title>
</svelte:head>

<CabecalhoSite />

<main class="pagina">
    <section class="hero-pagina">
        <span class="etiqueta">Imóveis</span>
        <h1>Encontre o imóvel certo para a sua estadia</h1>
        <p>
            Reserve direto com a Átrios, com fotos e vídeo reais de cada imóvel.
        </p>
    </section>

    <section class="secao-pagina">
        <div class="filtros">
            {#each categorias as c (c.id)}
                <button
                    class="filtro"
                    class:ativo={categoriaAtiva === c.id}
                    onclick={() => (categoriaAtiva = c.id)}
                >
                    {c.nome}
                </button>
            {/each}
        </div>

        {#if carregando}
            <p class="estado">Carregando imóveis...</p>
        {:else if erro}
            <p class="estado erro">{erro}</p>
        {:else if filtrados.length === 0}
            <p class="estado">Nenhum imóvel encontrado nessa categoria.</p>
        {:else}
            <div class="grade-imoveis">
                {#each filtrados as im (im.id)}
                    {@const foto = lerPrimeiraFoto(im.fotos)}
                    <a href="/imoveis-site/{im.id}" class="card-imovel">
                        <div class="card-foto">
                            {#if foto}
                                <img src={foto} alt={im.nome} loading="lazy" />
                            {:else}
                                <img
                                    src="/atrios-simbolo.png"
                                    alt=""
                                    class="sem-foto"
                                />
                            {/if}
                            {#if im.categoria}
                                <span class="chip-categoria"
                                    >{im.categoria}</span
                                >
                            {/if}
                        </div>
                        <div class="card-info">
                            <h3>{im.nome}</h3>
                            <p>
                                {im.cidade} · {im.quartos}
                                {im.quartos === 1 ? "quarto" : "quartos"} · até {im.capacidade_hospedes}
                                hóspedes
                            </p>
                            <strong
                                >R$ {im.preco_base_noite.toFixed(0)}
                                <span>/noite</span></strong
                            >
                        </div>
                    </a>
                {/each}
            </div>
        {/if}
    </section>
</main>

<RodapeSite />

<style>
    :global(body) {
        margin: 0;
    }

    .pagina {
        font-family: var(--fonte-corpo);
        color: var(--cor-texto);
        background-color: var(--cor-fundo);
    }

    .filtros {
        display: flex;
        flex-wrap: wrap;
        gap: 0.7rem;
        justify-content: center;
        margin-bottom: 3rem;
    }

    .filtro {
        padding: 0.6rem 1.3rem;
        border-radius: var(--raio-pill);
        border: 1.5px solid var(--cor-borda);
        background-color: var(--atrios-branco);
        color: var(--cor-texto);
        font-family: var(--fonte-corpo);
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .filtro.ativo {
        background-color: var(--atrios-dourado);
        border-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
    }

    .estado {
        text-align: center;
        font-size: 0.92rem;
        opacity: 0.7;
        padding: 3rem 0;
    }

    .estado.erro {
        color: #b23a2f;
    }

    .grade-imoveis {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 2rem;
    }

    .card-imovel {
        display: block;
        text-decoration: none;
        color: var(--cor-texto);
        border-radius: var(--raio-lg);
        overflow: hidden;
        background-color: var(--atrios-branco);
        box-shadow: 0 8px 24px rgba(31, 42, 38, 0.08);
        transition: transform 0.25s;
    }

    .card-imovel:hover {
        transform: translateY(-4px);
    }

    .card-foto {
        position: relative;
        aspect-ratio: 4 / 3;
        background-color: var(--atrios-creme);
    }

    .card-foto img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .card-foto img.sem-foto {
        object-fit: contain;
        padding: 2.5rem;
        opacity: 0.4;
    }

    .chip-categoria {
        position: absolute;
        top: 0.8rem;
        left: 0.8rem;
        padding: 0.25rem 0.7rem;
        border-radius: var(--raio-pill);
        background-color: var(--atrios-branco);
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: capitalize;
    }

    .card-info {
        padding: 1.1rem 1.3rem 1.4rem;
    }

    .card-info h3 {
        font-family: var(--fonte-titulo);
        font-size: 1rem;
        margin: 0 0 0.3rem;
    }

    .card-info p {
        font-size: 0.82rem;
        opacity: 0.65;
        margin: 0 0 0.6rem;
    }

    .card-info strong {
        font-family: var(--fonte-titulo);
        font-size: 1.05rem;
    }

    .card-info strong span {
        font-family: var(--fonte-corpo);
        font-weight: 400;
        font-size: 0.75rem;
        opacity: 0.6;
    }

    @media (max-width: 960px) {
        .grade-imoveis {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (max-width: 620px) {
        .grade-imoveis {
            grid-template-columns: 1fr;
        }
    }
</style>
