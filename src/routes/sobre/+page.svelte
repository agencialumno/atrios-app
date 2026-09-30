<script lang="ts">
    import CabecalhoSite from "$lib/components/site/CabecalhoSite.svelte";
    import RodapeSite from "$lib/components/site/RodapeSite.svelte";
    import "$lib/styles/theme.css";
    import "$lib/styles/site.css";

    const valores = [
        {
            titulo: "Confiança",
            texto: "Contratos claros e prestação de contas transparente, para o proprietário acompanhar cada reserva.",
        },
        {
            titulo: "Cuidado",
            texto: "Cada imóvel é tratado como se fosse nosso: limpeza, manutenção e atenção aos detalhes que fazem a diferença.",
        },
        {
            titulo: "Proximidade",
            texto: "Atendimento humano, direto, sem burocracia — para hóspedes e proprietários.",
        },
        {
            titulo: "Tecnologia a favor",
            texto: "Um app próprio para reservar, gerenciar e acompanhar tudo em tempo real, sem depender só de planilhas.",
        },
    ];
</script>

<svelte:head>
    <title>Sobre Nós — Átrios Gestão & Locação</title>
</svelte:head>

<CabecalhoSite />

<main class="pagina">
    <section class="hero-pagina">
        <span class="etiqueta">Sobre nós</span>
        <h1>Uma coanfitriã de verdade para o seu imóvel</h1>
        <p>
            A Átrios nasceu no Rio de Janeiro para resolver um problema simples:
            gerir um imóvel de temporada bem dá trabalho, e a maioria dos
            proprietários não tem tempo, nem estrutura, pra fazer isso sozinho.
        </p>
    </section>

    <section class="secao-pagina historia">
        <div class="historia-texto">
            <span class="etiqueta">Nossa história</span>
            <h2>Gestão de verdade, não só um anúncio no ar</h2>
            <p>
                Muita gente anuncia o próprio imóvel em plataformas como Airbnb
                e Booking, mas descobre rápido que o trabalho não termina na
                publicação: são mensagens a qualquer hora, check-in e check-out,
                limpeza entre uma reserva e outra, manutenção, e a preocupação
                constante de saber se está tudo em ordem.
            </p>
            <p>
                A Átrios existe pra tirar esse peso das costas do proprietário.
                Cuidamos da operação inteira — do anúncio ao repasse — com uma
                equipe própria e um app que dá visão completa de tudo, em tempo
                real, para hóspede, proprietário e equipe.
            </p>
        </div>
        <div class="historia-marca">
            <img
                src="/atrios-logo-horizontal.png"
                alt="Átrios Gestão & Locação"
            />
        </div>
    </section>

    <section class="secao-pagina">
        <div class="cabecalho-secao">
            <span class="etiqueta">Nossos valores</span>
            <h2>O que guia cada decisão que tomamos</h2>
        </div>

        <div class="grade-valores">
            {#each valores as v (v.titulo)}
                <div class="valor">
                    <h3>{v.titulo}</h3>
                    <p>{v.texto}</p>
                </div>
            {/each}
        </div>
    </section>

    <section class="cta-final">
        <h2>Quer que a Átrios cuide do seu imóvel?</h2>
        <p>Fale com a nossa equipe e entenda como funciona, sem compromisso.</p>
        <a href="/contato" class="botao-principal">Fale Conosco</a>
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

    .historia {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 3.5rem;
        align-items: center;
    }

    .historia-texto h2 {
        font-family: var(--fonte-titulo);
        font-size: clamp(1.4rem, 2.8vw, 1.9rem);
        margin: 0 0 1.2rem;
    }

    .historia-texto p {
        font-size: 0.94rem;
        line-height: 1.7;
        opacity: 0.8;
        margin: 0 0 1rem;
    }

    .historia-marca {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
    }

    .historia-marca img {
        width: 100%;
        max-width: 340px;
        height: auto;
    }

    .grade-valores {
        max-width: 1000px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 2.5rem;
    }

    .valor {
        padding: 1.8rem;
        border-radius: var(--raio-md);
        background-color: var(--atrios-branco);
        box-shadow: 0 4px 16px rgba(31, 42, 38, 0.06);
    }

    .valor h3 {
        font-family: var(--fonte-titulo);
        font-size: 1.05rem;
        margin: 0 0 0.5rem;
        color: var(--atrios-dourado);
    }

    .valor p {
        font-size: 0.88rem;
        line-height: 1.6;
        opacity: 0.75;
        margin: 0;
    }

    @media (max-width: 860px) {
        .historia {
            grid-template-columns: 1fr;
        }

        .historia-marca {
            order: -1;
        }

        .grade-valores {
            grid-template-columns: 1fr;
        }
    }
</style>
