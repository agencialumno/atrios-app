<script lang="ts">
    import "../../lib/styles/theme.css";
</script>

<main>
    <div class="conteudo">
        <div class="texto">
            <h1>Sua próxima estadia começa aqui</h1>
            <p>
                Imóveis selecionados, cuidados de perto pela coanfitriã Átrios.
            </p>
        </div>

        <div class="acoes">
            <a href="/login" class="botao-principal">Entrar</a>
            <a href="/cadastro" class="link-secundario">Criar uma conta</a>
        </div>
    </div>
</main>

<style>
    main {
        min-height: 100dvh;
        background-image: url("/fundo-auth.jpg");
        background-size: cover;
        background-position: center;
        display: flex;
        align-items: flex-end;
        font-family: var(--fonte-corpo);
    }

    .conteudo {
        width: 100%;
        padding: 2.5rem 1.5rem 3rem;
        background: linear-gradient(
            to top,
            rgba(31, 42, 38, 0.92) 20%,
            rgba(31, 42, 38, 0.4) 70%,
            transparent 100%
        );
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

    .texto h1 {
        color: var(--atrios-creme);
        font-size: 1.9rem;
        line-height: 1.25;
        margin: 0 0 0.6rem;
    }

    .texto p {
        color: var(--atrios-creme);
        opacity: 0.85;
        font-size: 0.95rem;
        margin: 0;
    }

    .acoes {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .botao-principal {
        text-align: center;
        padding: 0.9rem;
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        border-radius: 10px;
        font-weight: 600;
        text-decoration: none;
        font-size: 1rem;
    }

    .link-secundario {
        text-align: center;
        color: var(--atrios-creme);
        text-decoration: underline;
        font-size: 0.9rem;
    }
</style>
