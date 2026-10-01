<script lang="ts">
    import "../../lib/styles/theme.css";
</script>

<main>
    <header>
        <h1>Mensagens</h1>
        <p>Converse com hóspedes e anfitriões</p>
    </header>

    <div class="vazio">
        <div class="icone-vazio">💬</div>
        <h2>Nenhuma conversa ainda</h2>
        <p>
            Quando você reservar ou receber uma reserva, as conversas com o
            anfitrião ou hóspede aparecem aqui.
        </p>
    </div>
</main>

<style>
    main {
        min-height: 100dvh;
        background-color: var(--cor-fundo);
        padding: 2rem 1.25rem calc(var(--altura-barra) + 1.5rem);
        font-family: var(--fonte-corpo);
    }

    header {
        margin-bottom: 1.5rem;
    }

    header h1 {
        font-size: 1.35rem;
        color: var(--cor-texto);
        margin: 0 0 0.25rem;
    }

    header p {
        margin: 0;
        font-size: 0.85rem;
        color: var(--cor-texto);
        opacity: 0.65;
    }

    .vazio {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 0.5rem;
        padding: 4rem 1rem;
    }

    .icone-vazio {
        font-size: 2.5rem;
        margin-bottom: 0.4rem;
    }

    .vazio h2 {
        margin: 0;
        font-size: 1.1rem;
        color: var(--cor-texto);
    }

    .vazio p {
        margin: 0;
        max-width: 320px;
        font-size: 0.85rem;
        line-height: 1.5;
        color: var(--cor-texto);
        opacity: 0.65;
    }

    @media (min-width: 960px) {
        main {
            max-width: 700px;
            margin: 0 auto;
            padding-top: 2.5rem;
        }

        header h1 {
            font-size: 1.6rem;
        }

        .vazio {
            padding: 6rem 1rem;
        }
    }
</style>
