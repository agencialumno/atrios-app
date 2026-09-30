<script lang="ts">
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
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
            rota: null,
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
</script>

<nav class="barra">
    {#each itens as item (item.nome)}
        <button
            class="item"
            class:ativo={estaAtivo(item)}
            onclick={() => abrir(item)}
            aria-label={item.nome}
        >
            <span class="icone-fundo">
                <span class="icone">{@html item.icone}</span>
            </span>
            <span class="rotulo">{item.nome}</span>
        </button>
    {/each}
</nav>

<style>
    .barra {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        height: var(--altura-nav);
        display: flex;
        align-items: center;
        justify-content: space-around;
        padding: 0 0.5rem;
        background-color: var(--atrios-branco);
        border-radius: var(--raio-lg) var(--raio-lg) 0 0;
        box-shadow: 0 -4px 20px rgba(31, 42, 38, 0.08);
        z-index: 50;
    }

    .item {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.2rem;
        background: none;
        border: none;
        cursor: pointer;
        font-family: var(--fonte-corpo);
        color: var(--atrios-verde-escuro);
        opacity: 0.5;
        transition: opacity 0.2s;
    }

    .item.ativo {
        opacity: 1;
    }

    .icone-fundo {
        width: 44px;
        height: 30px;
        border-radius: var(--raio-pill);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s;
    }

    .item.ativo .icone-fundo {
        background-color: var(--atrios-dourado);
    }

    .icone {
        display: inline-flex;
        width: 22px;
        height: 22px;
    }

    .icone :global(svg) {
        width: 100%;
        height: 100%;
    }

    .rotulo {
        font-size: 0.68rem;
        font-weight: 500;
    }

    .item.ativo .rotulo {
        font-weight: 700;
    }

    /* No desktop, a navegação vira a barra superior (BarraNavegacaoDesktop) */
    @media (min-width: 960px) {
        .barra {
            display: none;
        }
    }
</style>
