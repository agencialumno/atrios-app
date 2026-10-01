<script lang="ts">
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { auth } from "$lib/stores/auth";
    import { icones } from "$lib/icones";

    interface Item {
        nome: string;
        icone: string;
        rota: string | null;
        ativoEm: string[];
    }

    const itens: Item[] = [
        {
            nome: "Início",
            icone: icones.casa,
            rota: "/home",
            ativoEm: ["/home", "/imovel"],
        },
        {
            nome: "Reservas",
            icone: icones.calendario,
            rota: "/reservas",
            ativoEm: ["/reservas"],
        },
        {
            nome: "Mensagens",
            icone: icones.mensagem,
            rota: "/mensagens",
            ativoEm: ["/mensagens"],
        },
        {
            nome: "Perfil",
            icone: icones.usuario,
            rota: "/perfil",
            ativoEm: ["/perfil"],
        },
    ];

    function estaAtivo(item: Item): boolean {
        const caminho = $page.url.pathname;
        return item.ativoEm.some(
            (r) => caminho === r || caminho.startsWith(r + "/"),
        );
    }

    function abrir(item: Item) {
        if (item.rota) goto(item.rota);
    }

    let inicial = $derived(($auth.usuario?.nome ?? "").charAt(0).toUpperCase());
</script>

<header class="barra">
    <div class="conteudo">
        <a href="/home" class="logo">
            <img src="/atrios-logo-horizontal.png" alt="Átrios" />
        </a>

        <nav class="nav">
            {#each itens as item (item.nome)}
                <button
                    class="item"
                    class:ativo={estaAtivo(item)}
                    onclick={() => abrir(item)}
                >
                    <span class="icone">{@html item.icone}</span>
                    {item.nome}
                </button>
            {/each}
        </nav>

        <button
            class="avatar"
            onclick={() => goto("/perfil")}
            aria-label="Perfil"
        >
            {inicial}
        </button>
    </div>
</header>

<style>
    .barra {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 50;
        background-color: rgba(245, 241, 234, 0.92);
        backdrop-filter: blur(8px);
        border-bottom: 1px solid rgba(31, 42, 38, 0.06);
    }

    .conteudo {
        max-width: 1280px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 2rem;
        padding: 0.5rem 2.5rem;
    }

    .logo img {
        height: 56px;
        width: auto;
        display: block;
    }

    .nav {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.55rem 1rem;
        border: none;
        border-radius: var(--raio-pill);
        background: none;
        color: var(--cor-texto);
        font-family: var(--fonte-corpo);
        font-size: 0.85rem;
        font-weight: 600;
        opacity: 0.6;
        cursor: pointer;
        transition:
            background-color 0.2s,
            opacity 0.2s;
    }

    .item:hover {
        opacity: 0.85;
    }

    .item.ativo {
        opacity: 1;
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
    }

    .icone {
        display: inline-flex;
        width: 18px;
        height: 18px;
    }

    .icone :global(svg) {
        width: 100%;
        height: 100%;
    }

    .avatar {
        width: 40px;
        height: 40px;
        flex-shrink: 0;
        border-radius: 50%;
        border: 2px solid var(--atrios-branco);
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        font-family: var(--fonte-titulo);
        font-weight: 700;
        font-size: 0.9rem;
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(31, 42, 38, 0.12);
    }
</style>
