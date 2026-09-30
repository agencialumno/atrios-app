<script lang="ts">
    import { onMount } from "svelte";
    import { api } from "$lib/api/client";
    import CabecalhoSite from "./CabecalhoSite.svelte";
    import RodapeSite from "./RodapeSite.svelte";
    import BadgesLoja from "./BadgesLoja.svelte";

    interface Imovel {
        id: string;
        nome: string;
        cidade: string;
        preco_base_noite: number;
        capacidade_hospedes: number;
        fotos: string | null;
        categoria: string | null;
    }

    const beneficios = [
        {
            icone: "seguranca",
            titulo: "Segurança",
            texto: "Processos seguros e contratos confiáveis para sua tranquilidade.",
        },
        {
            icone: "atendimento",
            titulo: "Atendimento Personalizado",
            texto: "Entendemos suas necessidades e oferecemos as melhores soluções.",
        },
        {
            icone: "gestao",
            titulo: "Gestão Eficiente",
            texto: "Administração completa do seu imóvel com transparência e agilidade.",
        },
        {
            icone: "oportunidades",
            titulo: "Melhores Oportunidades",
            texto: "Imóveis selecionados nos melhores locais para viver ou investir.",
        },
    ];

    const passos = [
        {
            numero: "01",
            titulo: "Você anuncia",
            texto: "Cadastre seu imóvel com fotos, vídeo e a área comum do condomínio.",
        },
        {
            numero: "02",
            titulo: "A Átrios cuida de tudo",
            texto: "Hóspedes, limpeza, manutenção e prestação de contas — como uma coanfitriã de verdade.",
        },
        {
            numero: "03",
            titulo: "Você recebe",
            texto: "Acompanhe reservas, ocupação e repasses direto pelo app, em tempo real.",
        },
    ];

    let imoveis = $state<Imovel[]>([]);

    function lerPrimeiraFoto(json: string | null): string | null {
        try {
            const lista = JSON.parse(json ?? "[]");
            return Array.isArray(lista) && lista.length > 0 ? lista[0] : null;
        } catch {
            return null;
        }
    }

    onMount(async () => {
        try {
            const todos = await api<Imovel[]>("/imoveis");
            imoveis = todos.slice(0, 3);
        } catch {
            imoveis = [];
        }
    });
</script>

<CabecalhoSite />

<main class="pagina">
    <section class="hero">
        <div class="hero-fundo">
            <img src="/hero-institucional.jpg" alt="" />
            <div class="hero-degrade"></div>
        </div>

        <div class="hero-container">
            <div class="hero-conteudo">
                <h1>
                    Excelência em <span class="dourado">Gestão e Locação</span> de
                    Imóveis
                </h1>
                <p>
                    Conectamos pessoas aos melhores imóveis com confiança,
                    transparência e atendimento personalizado.
                </p>
                <div class="hero-botoes">
                    <a href="/imoveis-site" class="botao-principal"
                        >Nossos Imóveis</a
                    >
                    <a href="/sobre" class="botao-secundario">Saiba Mais</a>
                </div>
            </div>

            <div class="busca-flutuante">
                <div class="campo">
                    <span class="rotulo">Tipo de imóvel</span>
                    <select>
                        <option>Selecione</option>
                        <option>Apartamento</option>
                        <option>Cobertura</option>
                        <option>Casa</option>
                        <option>Studio</option>
                    </select>
                </div>
                <div class="campo">
                    <span class="rotulo">Cidade</span>
                    <select>
                        <option>Selecione</option>
                        <option>Rio de Janeiro</option>
                    </select>
                </div>
                <div class="campo">
                    <span class="rotulo">Bairro</span>
                    <select>
                        <option>Selecione</option>
                        <option>Barra Olímpica</option>
                    </select>
                </div>
                <div class="campo">
                    <span class="rotulo">Finalidade</span>
                    <select>
                        <option>Selecione</option>
                        <option>Temporada</option>
                    </select>
                </div>
                <a href="/imoveis-site" class="botao-busca">
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <circle cx="11" cy="11" r="7" />
                        <path d="m21 21-4.3-4.3" />
                    </svg>
                    Buscar Imóveis
                </a>
            </div>
        </div>
    </section>

    <section class="beneficios">
        {#each beneficios as b (b.titulo)}
            <div class="beneficio">
                <span class="beneficio-icone">
                    {#if b.icone === "seguranca"}
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.6"
                            ><path
                                d="M12 3 4 6v6c0 5 3.4 8.7 8 9 4.6-.3 8-4 8-9V6l-8-3Z"
                            /><path d="m9 12 2 2 4-4" /></svg
                        >
                    {:else if b.icone === "atendimento"}
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.6"
                            ><circle cx="12" cy="8" r="4" /><path
                                d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"
                            /></svg
                        >
                    {:else if b.icone === "gestao"}
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.6"
                            ><path d="M4 20V10M10 20V4M16 20v-7M4 20h16" /></svg
                        >
                    {:else}
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.6"
                            ><path d="m3 11 9-8 9 8" /><path
                                d="M5 10v10h14V10"
                            /></svg
                        >
                    {/if}
                </span>
                <h3>{b.titulo}</h3>
                <p>{b.texto}</p>
            </div>
        {/each}
    </section>

    <section class="como-funciona">
        <div class="cabecalho-secao">
            <span class="etiqueta">Como funciona</span>
            <h2>Do anúncio ao repasse, sem complicação</h2>
        </div>
        <div class="passos">
            {#each passos as p (p.numero)}
                <div class="passo">
                    <span class="passo-numero">{p.numero}</span>
                    <h3>{p.titulo}</h3>
                    <p>{p.texto}</p>
                </div>
            {/each}
        </div>
    </section>

    {#if imoveis.length > 0}
        <section class="destaques">
            <div class="cabecalho-secao">
                <span class="etiqueta">Em destaque</span>
                <h2>Imóveis prontos para receber você</h2>
            </div>

            <div class="grade-imoveis">
                {#each imoveis as im (im.id)}
                    {@const foto = lerPrimeiraFoto(im.fotos)}
                    <a href="/imoveis-site/{im.id}" class="card-imovel">
                        <div class="card-foto">
                            {#if foto}
                                <img src={foto} alt={im.nome} loading="lazy" />
                            {:else}
                                <img
                                    src="/atrios-simbolo.png"
                                    alt=""
                                    class="sem-foto"
                                />
                            {/if}
                            {#if im.categoria}
                                <span class="chip-categoria"
                                    >{im.categoria}</span
                                >
                            {/if}
                        </div>
                        <div class="card-info">
                            <h3>{im.nome}</h3>
                            <p>
                                {im.cidade} · até {im.capacidade_hospedes} hóspedes
                            </p>
                            <strong
                                >R$ {im.preco_base_noite.toFixed(0)}
                                <span>/noite</span></strong
                            >
                        </div>
                    </a>
                {/each}
            </div>
        </section>
    {/if}

    <section class="baixe-app">
        <div class="baixe-conteudo">
            <span class="etiqueta claro">O app Átrios</span>
            <h2>Reserve, hospede e acompanhe tudo direto do seu celular</h2>
            <p>
                Hóspedes encontram e reservam imóveis com poucos toques.
                Anfitriões acompanham reservas, ocupação e repasses em tempo
                real. Baixe o app Átrios e leve a gestão do seu imóvel com você.
            </p>
            <BadgesLoja />
        </div>
    </section>

    <section class="cta-final">
        <h2>Pronto para começar?</h2>
        <p>
            Fale com a nossa equipe e descubra como a Átrios pode cuidar do seu
            imóvel.
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
        overflow-x: hidden;
    }

    .dourado {
        color: var(--atrios-dourado);
    }

    .etiqueta {
        display: inline-block;
        margin-bottom: 0.6rem;
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--atrios-dourado);
    }

    .etiqueta.claro {
        color: var(--atrios-creme);
        opacity: 0.85;
    }

    .cabecalho-secao {
        max-width: 640px;
        margin: 0 auto 3rem;
        text-align: center;
    }

    .cabecalho-secao h2 {
        font-family: var(--fonte-titulo);
        font-size: clamp(1.5rem, 3vw, 2.1rem);
        margin: 0;
        color: var(--cor-texto);
    }

    .botao-principal,
    .botao-secundario {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.9rem 1.9rem;
        border-radius: var(--raio-sm);
        font-family: var(--fonte-corpo);
        font-weight: 700;
        font-size: 0.9rem;
        text-decoration: none;
        letter-spacing: 0.02em;
    }

    .botao-principal {
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
    }

    .botao-secundario {
        background: none;
        border: 1.5px solid var(--cor-texto);
        color: var(--cor-texto);
    }

    /* Hero */
    .hero {
        position: relative;
        min-height: 92vh;
        display: flex;
        align-items: flex-end;
        padding: 12rem 0 9rem;
    }

    .hero-fundo {
        position: absolute;
        inset: 0;
        z-index: 0;
    }

    .hero-fundo img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center 65%;
    }

    .hero-degrade {
        position: absolute;
        inset: 0;
        background: linear-gradient(
            100deg,
            rgba(245, 241, 234, 0.97) 0%,
            rgba(245, 241, 234, 0.75) 35%,
            rgba(31, 42, 38, 0.15) 100%
        );
    }

    /* Único container que define a margem esquerda compartilhada pelo texto
       e pela caixa de busca — os dois ficam alinhados um embaixo do outro */
    .hero-container {
        position: relative;
        z-index: 1;
        width: 100%;
        max-width: 1280px;
        margin: 0 auto;
        padding: 0 2.5rem;
    }

    .hero-conteudo {
        max-width: 620px;
        margin-bottom: 8rem;
    }

    .hero-conteudo h1 {
        font-family: var(--fonte-titulo);
        font-size: clamp(2.2rem, 4.2vw, 3.4rem);
        line-height: 1.15;
        margin: 0 0 1.2rem;
        color: var(--cor-texto);
    }

    .hero-conteudo p {
        font-size: 1.05rem;
        line-height: 1.6;
        max-width: 460px;
        opacity: 0.8;
        margin: 0 0 2rem;
    }

    .hero-botoes {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
    }

    .busca-flutuante {
        position: absolute;
        left: 2.5rem;
        right: 2.5rem;
        bottom: -1rem;
        background-color: var(--atrios-branco);
        border-radius: var(--raio-lg);
        box-shadow: 0 20px 50px rgba(31, 42, 38, 0.18);
        padding: 1.6rem 2rem;
        display: grid;
        grid-template-columns: repeat(4, 1fr) auto;
        gap: 1.2rem;
        align-items: end;
    }

    .campo {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        min-width: 0;
    }

    .rotulo {
        font-size: 0.78rem;
        font-weight: 600;
        color: var(--cor-texto);
        opacity: 0.65;
    }

    .campo select {
        padding: 0.6rem 0.7rem;
        border: 1px solid var(--cor-borda);
        border-radius: var(--raio-sm);
        background-color: var(--atrios-creme);
        color: var(--cor-texto);
        font-family: var(--fonte-corpo);
        font-size: 0.88rem;
    }

    .botao-busca {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.75rem 1.5rem;
        border-radius: var(--raio-sm);
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        font-weight: 700;
        font-size: 0.88rem;
        text-decoration: none;
        white-space: nowrap;
    }

    .botao-busca svg {
        width: 18px;
        height: 18px;
    }

    /* Benefícios */
    .beneficios {
        max-width: 1280px;
        margin: 0 auto;
        padding: 8rem 2.5rem 5rem;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 2.5rem;
    }

    .beneficio-icone {
        display: flex;
        width: 46px;
        height: 46px;
        color: var(--atrios-dourado);
        margin-bottom: 1rem;
    }

    .beneficio-icone svg {
        width: 100%;
        height: 100%;
    }

    .beneficio h3 {
        font-family: var(--fonte-titulo);
        font-size: 0.95rem;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        color: var(--atrios-dourado);
        margin: 0 0 0.5rem;
    }

    .beneficio p {
        font-size: 0.88rem;
        line-height: 1.55;
        opacity: 0.75;
        margin: 0;
    }

    /* Como funciona */
    .como-funciona {
        padding: 5rem 2.5rem;
        background-color: var(--atrios-branco);
    }

    .passos {
        max-width: 1100px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 3rem;
    }

    .passo-numero {
        display: block;
        font-family: var(--fonte-titulo);
        font-size: 2.2rem;
        font-weight: 800;
        color: var(--atrios-dourado);
        opacity: 0.5;
        margin-bottom: 0.5rem;
    }

    .passo h3 {
        font-family: var(--fonte-titulo);
        font-size: 1.1rem;
        margin: 0 0 0.5rem;
    }

    .passo p {
        font-size: 0.9rem;
        line-height: 1.6;
        opacity: 0.75;
        margin: 0;
    }

    /* Destaques */
    .destaques {
        max-width: 1280px;
        margin: 0 auto;
        padding: 6rem 2.5rem;
    }

    .grade-imoveis {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 2rem;
    }

    .card-imovel {
        display: block;
        text-decoration: none;
        color: var(--cor-texto);
        border-radius: var(--raio-lg);
        overflow: hidden;
        background-color: var(--atrios-branco);
        box-shadow: 0 8px 24px rgba(31, 42, 38, 0.08);
        transition: transform 0.25s;
    }

    .card-imovel:hover {
        transform: translateY(-4px);
    }

    .card-foto {
        position: relative;
        aspect-ratio: 4 / 3;
        background-color: var(--atrios-creme);
    }

    .card-foto img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .card-foto img.sem-foto {
        object-fit: contain;
        padding: 2.5rem;
        opacity: 0.4;
    }

    .chip-categoria {
        position: absolute;
        top: 0.8rem;
        left: 0.8rem;
        padding: 0.25rem 0.7rem;
        border-radius: var(--raio-pill);
        background-color: var(--atrios-branco);
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: capitalize;
    }

    .card-info {
        padding: 1.1rem 1.3rem 1.4rem;
    }

    .card-info h3 {
        font-family: var(--fonte-titulo);
        font-size: 1rem;
        margin: 0 0 0.3rem;
    }

    .card-info p {
        font-size: 0.82rem;
        opacity: 0.65;
        margin: 0 0 0.6rem;
    }

    .card-info strong {
        font-family: var(--fonte-titulo);
        font-size: 1.05rem;
    }

    .card-info strong span {
        font-family: var(--fonte-corpo);
        font-weight: 400;
        font-size: 0.75rem;
        opacity: 0.6;
    }

    /* Baixe o app */
    .baixe-app {
        background-color: var(--atrios-verde-escuro);
        padding: 6rem 2.5rem;
    }

    .baixe-conteudo {
        max-width: 620px;
        margin: 0 auto;
        text-align: center;
        color: var(--atrios-creme);
    }

    .baixe-conteudo h2 {
        font-family: var(--fonte-titulo);
        font-size: clamp(1.6rem, 3vw, 2.2rem);
        margin: 0 0 1rem;
    }

    .baixe-conteudo p {
        font-size: 0.95rem;
        line-height: 1.65;
        opacity: 0.8;
        margin: 0 0 2rem;
    }

    .baixe-conteudo :global(.badges) {
        justify-content: center;
    }

    /* CTA final */
    .cta-final {
        max-width: 640px;
        margin: 0 auto;
        padding: 6rem 2.5rem;
        text-align: center;
    }

    .cta-final h2 {
        font-family: var(--fonte-titulo);
        font-size: clamp(1.5rem, 3vw, 2rem);
        margin: 0 0 0.8rem;
    }

    .cta-final p {
        font-size: 0.92rem;
        opacity: 0.75;
        margin: 0 0 1.8rem;
    }

    /* Responsivo */
    @media (max-width: 960px) {
        .beneficios {
            grid-template-columns: repeat(2, 1fr);
        }

        .passos,
        .grade-imoveis {
            grid-template-columns: 1fr;
            gap: 2rem;
        }

        .busca-flutuante {
            position: static;
            grid-template-columns: 1fr 1fr;
            margin-top: -3rem;
        }

        .botao-busca {
            grid-column: 1 / -1;
        }

        .hero {
            padding-bottom: 8rem;
        }
    }

    @media (max-width: 620px) {
        .beneficios {
            grid-template-columns: 1fr;
        }

        .busca-flutuante {
            grid-template-columns: 1fr;
        }

        .hero-container {
            padding: 0 1.5rem;
        }

        .hero {
            padding: 6rem 0 10rem;
            text-align: left;
        }
    }
</style>
