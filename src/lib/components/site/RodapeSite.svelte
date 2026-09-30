<script lang="ts">
    const ano = new Date().getFullYear();
</script>

<footer class="rodape">
    <div class="conteudo">
        <div class="coluna marca">
            <div class="logo-rodape">
                <img src="/atrios-simbolo.png" alt="" />
                <span class="texto-logo">
                    <span class="nome">ÁTRIOS</span>
                    <span class="subtitulo">Gestão & Locação</span>
                </span>
            </div>
            <p>
                Gestão e locação de imóveis por temporada, com confiança,
                transparência e atendimento personalizado.
            </p>
        </div>

        <div class="coluna">
            <h3>Sobre</h3>
            <a href="/sobre">Quem somos</a>
            <a href="/servicos">Como funciona</a>
        </div>

        <div class="coluna">
            <h3>Serviços</h3>
            <a href="/servicos">Gestão de imóveis</a>
            <a href="/imoveis-site">Locação por temporada</a>
            <a href="/servicos">Para proprietários</a>
        </div>

        <div class="coluna">
            <h3>Contato</h3>
            <a href="/contato">Fale conosco</a>
            <a href="mailto:contato@atrios.com.br">contato@atrios.com.br</a>
            <span class="local">Rio de Janeiro, RJ</span>
        </div>
    </div>

    <div class="baixo">
        <span
            >© {ano} Átrios Gestão & Locação. Todos os direitos reservados.</span
        >
    </div>
</footer>

<style>
    .rodape {
        background-color: var(--atrios-verde-escuro);
        color: var(--atrios-creme);
        padding: 3.5rem 2.5rem 1.5rem;
    }

    .conteudo {
        max-width: 1280px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: 1.4fr 1fr 1fr 1fr;
        gap: 2.5rem;
    }

    .coluna {
        display: flex;
        flex-direction: column;
        gap: 0.7rem;
    }

    .marca p {
        font-size: 0.85rem;
        line-height: 1.6;
        opacity: 0.75;
        max-width: 320px;
    }

    .logo-rodape {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        margin-bottom: 0.8rem;
    }

    .logo-rodape img {
        height: 34px;
        width: auto;
        display: block;
    }

    .texto-logo {
        display: flex;
        flex-direction: column;
        line-height: 1.15;
    }

    .nome {
        font-family: var(--fonte-titulo);
        font-size: 1.15rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        color: var(--atrios-creme);
    }

    .subtitulo {
        font-size: 0.62rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--atrios-dourado);
    }

    .coluna h3 {
        font-family: var(--fonte-titulo);
        font-size: 0.85rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--atrios-dourado);
        margin: 0 0 0.3rem;
    }

    .coluna a,
    .local {
        font-size: 0.86rem;
        color: var(--atrios-creme);
        opacity: 0.8;
        text-decoration: none;
    }

    .coluna a:hover {
        opacity: 1;
        text-decoration: underline;
    }

    .baixo {
        max-width: 1280px;
        margin: 2.5rem auto 0;
        padding-top: 1.5rem;
        border-top: 1px solid rgba(245, 241, 234, 0.15);
        font-size: 0.78rem;
        opacity: 0.6;
    }

    @media (max-width: 860px) {
        .conteudo {
            grid-template-columns: 1fr 1fr;
        }
    }

    @media (max-width: 560px) {
        .conteudo {
            grid-template-columns: 1fr;
        }
    }
</style>
