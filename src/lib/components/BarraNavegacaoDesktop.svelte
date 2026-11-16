<script lang="ts">
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { auth } from "$lib/stores/auth";
    import { icones } from "$lib/icones";
    import { naoLidas } from "$lib/naoLidas";
    import Avatar from "$lib/components/Avatar.svelte";

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

    function rotuloBadge(total: number): string {
        return total > 99 ? "99+" : String(total);
    }

    function rotuloAcessivel(item: Item, total: number): string {
        if (item.rota !== "/mensagens" || total <= 0) return item.nome;
        return `${item.nome}, ${total} ${total === 1 ? "não lida" : "não lidas"}`;
    }

    function abrir(item: Item) {
        if (item.rota) goto(item.rota);
    }

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
                    aria-label={rotuloAcessivel(item, $naoLidas)}
                >
                    <span class="icone">
                        {@html item.icone}
                        {#if item.rota === "/mensagens" && $naoLidas > 0}
                            <span class="badge" aria-hidden="true"
                                >{rotuloBadge($naoLidas)}</span
                            >
                        {/if}
                    </span>
                    {item.nome}
                </button>
            {/each}
        </nav>

        <button
            class="avatar"
            onclick={() => goto("/perfil")}
            aria-label="Perfil"
        >
            <Avatar
                nome={$auth.usuario?.nome ?? ""}
                semente={$auth.usuario?.id ?? ""}
                foto={$auth.usuario?.foto_url}
                tamanho={36}
            />
        </button>
    </div>
</header>

<style>
    /* Só aparece no desktop; no celular a navegação é a barra inferior */
    .barra {
        display: none;
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
        position: relative;
        display: inline-flex;
        width: 18px;
        height: 18px;
    }

    .icone :global(svg) {
        width: 100%;
        height: 100%;
    }

    /* Posição absoluta sobre o ícone: não desloca o layout da barra */
    .badge {
        position: absolute;
        top: -8px;
        right: -10px;
        min-width: 18px;
        height: 18px;
        padding: 0 5px;
        box-sizing: border-box;
        border-radius: 9px;
        background-color: #d93025;
        color: #fff;
        font-size: 0.65rem;
        font-weight: 700;
        line-height: 18px;
        text-align: center;
        pointer-events: none;
    }

    .avatar {
        width: 40px;
        height: 40px;
        flex-shrink: 0;
        border-radius: 50%;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        border: 2px solid var(--atrios-branco);
        background: none;
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(31, 42, 38, 0.12);
    }

    @media (min-width: 960px) {
        .barra {
            display: block;
        }
    }
</style>
