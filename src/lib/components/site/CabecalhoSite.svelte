<script lang="ts">
    let menuAberto = $state(false);

    const links = [
        { rotulo: "Início", href: "/" },
        { rotulo: "Sobre Nós", href: "/sobre" },
        { rotulo: "Serviços", href: "/servicos" },
        { rotulo: "Imóveis", href: "/imoveis-site" },
        { rotulo: "Contato", href: "/contato" },
    ];
</script>

<header class="cabecalho">
    <div class="conteudo">
        <a href="/" class="logo">
            <img
                src="/atrios-logo-horizontal.png"
                alt="Átrios Gestão & Locação"
            />
        </a>

        <nav class="nav-desktop">
            {#each links as l (l.href)}
                <a href={l.href}>{l.rotulo}</a>
            {/each}
        </nav>

        <div class="acoes">
            <a href="/login" class="botao-cliente">Já sou cliente</a>
            <a href="/contato" class="botao-cta">Fale Conosco</a>
            <a
                href="/login"
                class="botao-cliente-mobile"
                aria-label="Já sou cliente"
            >
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
                </svg>
            </a>
            <button
                class="botao-menu"
                onclick={() => (menuAberto = !menuAberto)}
                aria-label="Abrir menu"
            >
                <span></span>
                <span></span>
                <span></span>
            </button>
        </div>
    </div>

    {#if menuAberto}
        <nav class="nav-mobile">
            {#each links as l (l.href)}
                <a href={l.href} onclick={() => (menuAberto = false)}
                    >{l.rotulo}</a
                >
            {/each}
        </nav>
    {/if}
</header>

<style>
    .cabecalho {
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
        padding: 1rem 2.5rem;
    }

    .logo img {
        height: 48px;
        width: auto;
        display: block;
    }

    .nav-desktop {
        display: none;
        align-items: center;
        gap: 2.2rem;
    }

    .nav-desktop a {
        font-family: var(--fonte-corpo);
        font-size: 0.92rem;
        font-weight: 600;
        color: var(--cor-texto);
        text-decoration: none;
        letter-spacing: 0.02em;
        transition: color 0.2s;
    }

    .nav-desktop a:hover {
        color: var(--atrios-dourado);
    }

    .acoes {
        display: flex;
        align-items: center;
        gap: 1.2rem;
    }

    .botao-cta {
        display: none;
        padding: 0.7rem 1.6rem;
        border-radius: var(--raio-pill);
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        font-family: var(--fonte-corpo);
        font-weight: 700;
        font-size: 0.88rem;
        text-decoration: none;
        white-space: nowrap;
    }

    .botao-cliente {
        display: none;
        padding: 0.7rem 1.5rem;
        border-radius: var(--raio-pill);
        border: 1.5px solid var(--cor-texto);
        color: var(--cor-texto);
        font-family: var(--fonte-corpo);
        font-weight: 700;
        font-size: 0.88rem;
        text-decoration: none;
        white-space: nowrap;
        transition:
            background-color 0.2s,
            color 0.2s;
    }

    .botao-cliente:hover {
        background-color: var(--cor-texto);
        color: var(--atrios-creme);
    }

    .link-cliente-mobile {
        margin-top: 0.4rem;
        padding-top: 0.8rem;
        border-top: 1px solid rgba(31, 42, 38, 0.1);
        font-family: var(--fonte-corpo);
        font-weight: 700;
        color: var(--atrios-dourado);
        text-decoration: none;
    }

    .botao-cliente-mobile {
        display: flex;
        width: 40px;
        height: 40px;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        flex-shrink: 0;
    }

    .botao-cliente-mobile svg {
        width: 20px;
        height: 20px;
    }

    .botao-menu {
        width: 40px;
        height: 40px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 5px;
        border: none;
        background: none;
        cursor: pointer;
    }

    .botao-menu span {
        width: 22px;
        height: 2px;
        background-color: var(--cor-texto);
        border-radius: 2px;
    }

    .nav-mobile {
        display: flex;
        flex-direction: column;
        padding: 0.5rem 2.5rem 1.5rem;
        gap: 1rem;
        border-top: 1px solid rgba(31, 42, 38, 0.06);
    }

    .nav-mobile a {
        font-family: var(--fonte-corpo);
        font-weight: 600;
        color: var(--cor-texto);
        text-decoration: none;
        padding: 0.4rem 0;
    }

    @media (min-width: 960px) {
        .nav-desktop,
        .botao-cta,
        .botao-cliente {
            display: flex;
        }

        .botao-menu,
        .botao-cliente-mobile {
            display: none;
        }
    }
</style>
