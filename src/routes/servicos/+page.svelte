<script lang="ts">
    import CabecalhoSite from "$lib/components/site/CabecalhoSite.svelte";
    import RodapeSite from "$lib/components/site/RodapeSite.svelte";
    import "$lib/styles/theme.css";
    import "$lib/styles/site.css";

    const servicosProprietario = [
        {
            titulo: "Publicação e otimização do anúncio",
            texto: "Fotos, vídeo do imóvel e da área comum, descrição e preço definidos para atrair reservas.",
        },
        {
            titulo: "Recepção e atendimento aos hóspedes",
            texto: "Check-in, check-out e suporte durante toda a estadia, sem o proprietário precisar responder mensagem.",
        },
        {
            titulo: "Limpeza e manutenção",
            texto: "Equipe própria cuida da limpeza entre uma reserva e outra, e da manutenção do imóvel.",
        },
        {
            titulo: "Sincronização com outros canais",
            texto: "O calendário conversa com Airbnb e Booking, evitando reserva duplicada na mesma data.",
        },
        {
            titulo: "Prestação de contas transparente",
            texto: "Extrato de cada reserva, valor bruto, comissão e o que entra na conta do proprietário — tudo no app.",
        },
        {
            titulo: "Acesso ao seu próprio imóvel",
            texto: "Combine com a Átrios a antecedência mínima e use o seu imóvel quando quiser, fora dos períodos reservados.",
        },
    ];

    const servicosHospede = [
        {
            titulo: "Reserva direta, sem intermediário",
            texto: "Você reserva direto com a Átrios, com o mesmo cuidado que teria em qualquer plataforma conhecida.",
        },
        {
            titulo: "Fotos e vídeo reais do imóvel",
            texto: "Tour em vídeo do apartamento e da área comum do condomínio, para você saber exatamente onde vai ficar.",
        },
        {
            titulo: "Pagamento seguro",
            texto: "Pagamento processado com segurança, direto pelo app.",
        },
        {
            titulo: "Suporte durante a estadia",
            texto: "Equipe disponível para resolver qualquer imprevisto durante a sua estadia.",
        },
    ];
</script>

<svelte:head>
    <title>Serviços — Átrios Gestão & Locação</title>
</svelte:head>

<CabecalhoSite />

<main class="pagina">
    <section class="hero-pagina">
        <span class="etiqueta">Serviços</span>
        <h1>Gestão completa, de um lado. Reserva direta, do outro.</h1>
        <p>
            A Átrios cuida da operação inteira do imóvel para quem é
            proprietário, e oferece reserva direta e transparente para quem
            procura onde ficar.
        </p>
    </section>

    <section class="secao-pagina">
        <div class="cabecalho-secao">
            <span class="etiqueta">Para proprietários</span>
            <h2>O que a Átrios faz pelo seu imóvel</h2>
        </div>

        <div class="grade-servicos">
            {#each servicosProprietario as s (s.titulo)}
                <div class="servico">
                    <h3>{s.titulo}</h3>
                    <p>{s.texto}</p>
                </div>
            {/each}
        </div>
    </section>

    <section class="secao-pagina destaque">
        <div class="destaque-conteudo">
            <span class="etiqueta claro">Para hóspedes</span>
            <h2>Um jeito mais direto de reservar</h2>

            <div class="grade-hospede">
                {#each servicosHospede as s (s.titulo)}
                    <div class="servico-hospede">
                        <h3>{s.titulo}</h3>
                        <p>{s.texto}</p>
                    </div>
                {/each}
            </div>
        </div>
    </section>

    <section class="cta-final">
        <h2>Quer anunciar o seu imóvel com a Átrios?</h2>
        <p>
            Fale com a nossa equipe e entenda como funciona a gestão completa.
        </p>
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

    .grade-servicos {
        max-width: 1100px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 2rem;
    }

    .servico {
        padding: 1.8rem;
        border-radius: var(--raio-md);
        background-color: var(--atrios-branco);
        box-shadow: 0 4px 16px rgba(31, 42, 38, 0.06);
    }

    .servico h3 {
        font-family: var(--fonte-titulo);
        font-size: 0.98rem;
        margin: 0 0 0.5rem;
        color: var(--cor-texto);
    }

    .servico p {
        font-size: 0.86rem;
        line-height: 1.6;
        opacity: 0.72;
        margin: 0;
    }

    .destaque {
        background-color: var(--atrios-verde-escuro);
        max-width: none;
        padding-top: 5rem;
        padding-bottom: 5rem;
    }

    .destaque-conteudo {
        max-width: 1100px;
        margin: 0 auto;
        text-align: center;
    }

    .destaque-conteudo h2 {
        font-family: var(--fonte-titulo);
        font-size: clamp(1.5rem, 3vw, 2.1rem);
        color: var(--atrios-creme);
        margin: 0 0 3rem;
    }

    .grade-hospede {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 2rem;
        text-align: left;
    }

    .servico-hospede h3 {
        font-family: var(--fonte-titulo);
        font-size: 0.92rem;
        color: var(--atrios-dourado);
        margin: 0 0 0.5rem;
    }

    .servico-hospede p {
        font-size: 0.84rem;
        line-height: 1.6;
        color: var(--atrios-creme);
        opacity: 0.75;
        margin: 0;
    }

    @media (max-width: 960px) {
        .grade-servicos {
            grid-template-columns: repeat(2, 1fr);
        }

        .grade-hospede {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (max-width: 620px) {
        .grade-servicos,
        .grade-hospede {
            grid-template-columns: 1fr;
        }
    }
</style>
