<script lang="ts">
    import { untrack } from "svelte";
    import { goto } from "$app/navigation";
    import { api } from "$lib/api/client";
    import { auth } from "$lib/stores/auth";
    import { publicacao } from "$lib/stores/publicacao";
    import { icones } from "$lib/icones";
    import { categorias } from "$lib/categorias";
    import Preloader from "$lib/components/Preloader.svelte";
    import "../../lib/styles/theme.css";

    interface Imovel {
        id: string;
        nome: string;
        cidade: string;
        capacidade_hospedes: number;
        quartos: number;
        banheiros: number;
        preco_base_noite: number;
        fotos: string; // JSON string
        categoria: string | null;
    }

    let imoveis: Imovel[] = $state([]);
    let carregando = $state(true);
    let erro = $state("");
    let busca = $state("");
    let categoriaSelecionada: string | null = $state(null);

    async function carregar() {
        try {
            imoveis = await api<Imovel[]>("/imoveis");
            erro = "";
        } catch (e) {
            erro = e instanceof Error ? e.message : "Erro ao carregar imóveis";
        } finally {
            carregando = false;
        }
    }

    // Carrega ao abrir e de novo sempre que um anúncio termina de ser publicado
    $effect(() => {
        void $publicacao.concluidas;
        untrack(() => carregar());
    });

    function primeiraFoto(fotosJson: string): string {
        try {
            const lista = JSON.parse(fotosJson);
            return lista[0] || "/atrios-simbolo.png";
        } catch {
            return "/atrios-simbolo.png";
        }
    }

    function nomeCategoria(id: string | null): string | null {
        return categorias.find((c) => c.id === id)?.nome ?? null;
    }

    function alternarCategoria(id: string) {
        categoriaSelecionada = categoriaSelecionada === id ? null : id;
    }

    function abrirImovel(id: string) {
        goto(`/imovel/${id}`);
    }

    let primeiroNome = $derived($auth.usuario?.nome?.split(" ")[0] ?? "");
    let inicial = $derived(primeiroNome.charAt(0).toUpperCase());

    let tituloFeed = $derived(
        categoriaSelecionada
            ? (nomeCategoria(categoriaSelecionada) ?? "Anúncios")
            : "Em destaque",
    );

    let imoveisFiltrados = $derived(
        imoveis.filter((i) => {
            const passaCategoria =
                !categoriaSelecionada || i.categoria === categoriaSelecionada;
            const termo = busca.trim().toLowerCase();
            const passaBusca =
                !termo ||
                i.nome.toLowerCase().includes(termo) ||
                i.cidade.toLowerCase().includes(termo);
            return passaCategoria && passaBusca;
        }),
    );
</script>

<main>
    <header>
        <img src="/atrios-logo-horizontal.png" alt="Átrios" class="logo" />

        <div class="linha-saudacao">
            <div class="saudacao">
                <h1>Olá{primeiroNome ? `, ${primeiroNome}` : ""} 👋</h1>
                <p>Encontre o lugar perfeito para sua estadia</p>
            </div>

            <div class="acoes">
                <button class="botao-icone" aria-label="Notificações">
                    <span class="icone">{@html icones.sino}</span>
                </button>
                <button
                    class="avatar"
                    onclick={() => goto("/perfil")}
                    aria-label="Perfil"
                >
                    {inicial}
                </button>
            </div>
        </div>
    </header>

    <div class="linha-busca">
        <label class="busca">
            <span class="icone">{@html icones.busca}</span>
            <input
                type="text"
                placeholder="Buscar por cidade ou condomínio"
                bind:value={busca}
            />
        </label>
        <button class="botao-icone" aria-label="Filtros">
            <span class="icone">{@html icones.filtros}</span>
        </button>
    </div>

    <div class="categorias">
        {#each categorias as cat (cat.id)}
            <button
                class="categoria"
                class:ativa={categoriaSelecionada === cat.id}
                onclick={() => alternarCategoria(cat.id)}
            >
                <span class="categoria-icone">{@html cat.icone}</span>
                <span class="categoria-nome">{cat.nome}</span>
            </button>
        {/each}
    </div>

    <section class="feed">
        <h2>{tituloFeed}</h2>

        {#if carregando}
            <div class="carregando-wrapper">
                <Preloader />
                <p>Carregando imóveis...</p>
            </div>
        {:else if erro}
            <p class="estado erro">{erro}</p>
        {:else if imoveisFiltrados.length === 0}
            <p class="estado">
                {categoriaSelecionada
                    ? "Ainda não temos anúncios nesta categoria."
                    : "Nenhum imóvel encontrado."}
            </p>
        {:else}
            <div class="lista-cards">
                {#each imoveisFiltrados as imovel (imovel.id)}
                    <button class="card" onclick={() => abrirImovel(imovel.id)}>
                        <div class="card-imagem">
                            <img
                                src={primeiraFoto(imovel.fotos)}
                                alt={imovel.nome}
                                class="card-foto"
                            />
                            {#if nomeCategoria(imovel.categoria)}
                                <span class="selo"
                                    >{nomeCategoria(imovel.categoria)}</span
                                >
                            {/if}
                        </div>
                        <div class="card-info">
                            <h3>{imovel.nome}</h3>
                            <p class="card-cidade">{imovel.cidade}</p>
                            <div class="card-specs">
                                <span
                                    >{imovel.capacidade_hospedes} hóspedes</span
                                >
                                <span>·</span>
                                <span>{imovel.quartos} quartos</span>
                            </div>
                            <p class="card-preco">
                                R$ {imovel.preco_base_noite.toFixed(0)}
                                <span>/noite</span>
                            </p>
                        </div>
                    </button>
                {/each}
            </div>
        {/if}
    </section>
</main>

<style>
    main {
        min-height: 100dvh;
        background-color: var(--cor-fundo);
        padding: 1.75rem 1.25rem calc(var(--altura-barra) + 1.5rem);
        font-family: var(--fonte-corpo);
    }

    header {
        margin-bottom: 1.5rem;
    }

    .logo {
        display: block;
        width: 118px;
        height: auto;
        margin-bottom: 1.5rem;
    }

    .linha-saudacao {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
    }

    .saudacao h1 {
        font-size: 1.35rem;
        color: var(--cor-texto);
        margin: 0 0 0.25rem;
    }

    .saudacao p {
        margin: 0;
        font-size: 0.85rem;
        color: var(--cor-texto);
        opacity: 0.65;
    }

    .acoes {
        display: flex;
        align-items: center;
        gap: 0.6rem;
    }

    .botao-icone {
        width: 46px;
        height: 46px;
        flex-shrink: 0;
        border-radius: 50%;
        border: none;
        background-color: var(--atrios-branco);
        color: var(--atrios-verde-escuro);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(31, 42, 38, 0.08);
    }

    .avatar {
        width: 46px;
        height: 46px;
        flex-shrink: 0;
        border-radius: 50%;
        border: 2px solid var(--atrios-branco);
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        font-family: var(--fonte-titulo);
        font-weight: 700;
        font-size: 1rem;
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(31, 42, 38, 0.12);
    }

    .icone {
        display: inline-flex;
        width: 20px;
        height: 20px;
    }

    .icone :global(svg) {
        width: 100%;
        height: 100%;
    }

    .linha-busca {
        display: flex;
        gap: 0.6rem;
        margin-bottom: 1.5rem;
    }

    .busca {
        flex: 1;
        min-width: 0;
        height: 46px;
        display: flex;
        align-items: center;
        gap: 0.6rem;
        padding: 0 1.1rem;
        background-color: var(--atrios-branco);
        border-radius: var(--raio-pill);
        box-shadow: 0 2px 10px rgba(31, 42, 38, 0.08);
        color: var(--cor-texto);
    }

    .busca input {
        flex: 1;
        min-width: 0;
        border: none;
        outline: none;
        background: transparent;
        font-size: 0.85rem;
        font-family: var(--fonte-corpo);
        color: var(--cor-texto);
    }

    .categorias {
        display: flex;
        gap: 0.9rem;
        overflow-x: auto;
        margin: 0 -1.25rem 0.75rem;
        padding: 0.25rem 1.25rem 1rem;
        scrollbar-width: none;
    }

    .categorias::-webkit-scrollbar {
        display: none;
    }

    .categoria {
        flex: 0 0 auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.45rem;
        background: none;
        border: none;
        cursor: pointer;
        font-family: var(--fonte-corpo);
        color: var(--cor-texto);
    }

    .categoria-icone {
        width: 58px;
        height: 58px;
        border-radius: var(--raio-md);
        background-color: var(--atrios-branco);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 10px rgba(31, 42, 38, 0.08);
        transition: background-color 0.2s;
    }

    .categoria-icone :global(svg) {
        width: 24px;
        height: 24px;
    }

    .categoria.ativa .categoria-icone {
        background-color: var(--atrios-dourado);
    }

    .categoria-nome {
        font-size: 0.72rem;
        opacity: 0.7;
    }

    .categoria.ativa .categoria-nome {
        font-weight: 700;
        opacity: 1;
    }

    .feed h2 {
        font-size: 1.05rem;
        color: var(--cor-texto);
        margin: 0 0 1rem;
    }

    .estado {
        color: var(--cor-texto);
        opacity: 0.7;
        font-size: 0.85rem;
    }

    .estado.erro {
        color: #b23a2f;
        opacity: 1;
    }

    .carregando-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        padding: 3rem 1rem;
        color: var(--cor-texto);
        opacity: 0.75;
        font-size: 0.85rem;
    }

    .carregando-wrapper p {
        margin: 0;
    }

    .lista-cards {
        display: flex;
        flex-direction: column;
        gap: 1.1rem;
    }

    .card {
        display: flex;
        flex-direction: column;
        text-align: left;
        background-color: var(--atrios-branco);
        border: none;
        border-radius: var(--raio-lg);
        overflow: hidden;
        cursor: pointer;
        padding: 0;
        font-family: var(--fonte-corpo);
        box-shadow: 0 4px 16px rgba(31, 42, 38, 0.08);
    }

    .card-imagem {
        position: relative;
    }

    .card-foto {
        display: block;
        width: 100%;
        height: 170px;
        object-fit: cover;
        background-color: var(--atrios-creme);
    }

    .selo {
        position: absolute;
        top: 0.75rem;
        left: 0.75rem;
        padding: 0.3rem 0.75rem;
        border-radius: var(--raio-pill);
        background-color: rgba(255, 255, 255, 0.92);
        color: var(--atrios-verde-escuro);
        font-size: 0.7rem;
        font-weight: 600;
    }

    .card-info {
        padding: 1rem 1.1rem 1.1rem;
    }

    .card-info h3 {
        font-size: 0.98rem;
        color: var(--cor-texto);
        margin: 0 0 0.15rem;
    }

    .card-cidade {
        font-size: 0.78rem;
        color: var(--cor-texto);
        opacity: 0.7;
        margin: 0 0 0.45rem;
    }

    .card-specs {
        display: flex;
        gap: 0.35rem;
        font-size: 0.75rem;
        color: var(--cor-texto);
        opacity: 0.8;
        margin-bottom: 0.55rem;
    }

    .card-preco {
        font-family: var(--fonte-titulo);
        font-size: 1rem;
        font-weight: 700;
        color: var(--atrios-dourado);
        margin: 0;
    }

    .card-preco span {
        font-family: var(--fonte-corpo);
        font-size: 0.7rem;
        font-weight: 400;
        color: var(--cor-texto);
        opacity: 0.6;
    }

    /* ===== Desktop ===== */
    @media (min-width: 960px) {
        main {
            max-width: 1080px;
            margin: 0 auto;
            padding-left: 2.5rem;
            padding-right: 2.5rem;
        }

        header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 2rem;
            margin-bottom: 2rem;
        }

        .logo {
            margin-bottom: 0;
            width: 140px;
        }

        .linha-saudacao {
            flex: 1;
            justify-content: flex-end;
            gap: 2rem;
        }

        .saudacao {
            text-align: right;
        }

        .linha-busca {
            max-width: 640px;
        }

        .categorias {
            margin: 0 0 1.5rem;
            padding: 0.25rem 0 1rem;
            overflow-x: visible;
            flex-wrap: wrap;
        }

        .lista-cards {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1.5rem;
        }

        .card:hover {
            transform: translateY(-3px);
            transition: transform 0.2s;
        }
    }

    @media (min-width: 1280px) {
        .lista-cards {
            grid-template-columns: repeat(4, 1fr);
        }
    }
</style>
