<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import { api } from "$lib/api/client";
    import { abrirMapa, abrirUber } from "$lib/externo";
    import { icones } from "$lib/icones";
    import { formatarDataLonga, somarDias } from "$lib/datas";
    import Preloader from "$lib/components/Preloader.svelte";
    import "../../../lib/styles/theme.css";

    interface Guia {
        acesso?: string;
        estacionamento?: { custo?: string; instrucoes?: string };
        piscina?: { horario?: string; regras?: string };
        academia?: { andar?: string; horario?: string; regras?: string };
        area_gourmet?: { preco?: string; como_reservar?: string };
        lavanderia?: { preco_lavar?: string; preco_secar?: string };
        restaurante?: { descricao?: string };
        bagagem?: {
            tem_maleiro?: boolean;
            lockers_disponiveis?: number | null;
            observacao?: string;
        };
    }

    interface Checkin {
        reserva: {
            numero: string;
            status: string;
            data_checkin: string;
            data_checkout: string | null;
            num_hospedes: number;
            hospedes: string[];
        };
        imovel: {
            id: string;
            nome: string;
            endereco: string;
            cidade: string;
            foto: string | null;
        };
        guia: Guia | null;
    }

    interface ItemCartao {
        rotulo: string;
        texto: string;
    }

    interface CartaoGuia {
        id: string;
        titulo: string;
        icone: string;
        itens: ItemCartao[];
    }

    let dados = $state<Checkin | null>(null);
    let carregando = $state(true);
    let erro = $state("");
    let abertos = $state<Record<string, boolean>>({});

    let token = $derived($page.params.token);

    onMount(async () => {
        try {
            dados = await api<Checkin>(`/checkin/${token}/dados`);
        } catch (e) {
            erro =
                e instanceof Error
                    ? e.message
                    : "Não foi possível abrir o seu check-in";
        } finally {
            carregando = false;
        }
    });

    function itens(pares: [string, string | undefined][]): ItemCartao[] {
        return pares
            .filter(([, texto]) => !!texto && texto.trim() !== "")
            .map(([rotulo, texto]) => ({ rotulo, texto: texto!.trim() }));
    }

    // Só entram os cartões com pelo menos um campo preenchido
    let cartoes = $derived.by((): CartaoGuia[] => {
        const g = dados?.guia;
        if (!g) return [];

        const bagagemItens: ItemCartao[] = [];
        if (g.bagagem) {
            const b = g.bagagem;
            if (b.tem_maleiro) {
                bagagemItens.push({
                    rotulo: "Maleiro",
                    texto: "O condomínio possui maleiro.",
                });
            } else if (b.lockers_disponiveis || b.observacao) {
                bagagemItens.push({
                    rotulo: "Maleiro",
                    texto: "Não possui maleiro.",
                });
            }
            if (b.lockers_disponiveis) {
                bagagemItens.push({
                    rotulo: "Lockers",
                    texto: `${b.lockers_disponiveis} unidades, sujeitas à disponibilidade, para armazenamento temporário de bagagem.`,
                });
            }
            if (b.observacao?.trim()) {
                bagagemItens.push({
                    rotulo: "Observação",
                    texto: b.observacao.trim(),
                });
            }
        }

        const todos: CartaoGuia[] = [
            {
                id: "estacionamento",
                titulo: "Estacionamento",
                icone: icones.garagem,
                itens: itens([
                    ["Custo", g.estacionamento?.custo],
                    ["Como entrar", g.estacionamento?.instrucoes],
                ]),
            },
            {
                id: "piscina",
                titulo: "Piscina",
                icone: icones.piscina,
                itens: itens([
                    ["Horário", g.piscina?.horario],
                    ["Regras", g.piscina?.regras],
                ]),
            },
            {
                id: "academia",
                titulo: "Academia",
                icone: icones.academia,
                itens: itens([
                    ["Andar", g.academia?.andar],
                    ["Horário", g.academia?.horario],
                    ["Regras", g.academia?.regras],
                ]),
            },
            {
                id: "area_gourmet",
                titulo: "Área gourmet",
                icone: icones.churrasqueira,
                itens: itens([
                    ["Valor", g.area_gourmet?.preco],
                    ["Como reservar", g.area_gourmet?.como_reservar],
                ]),
            },
            {
                id: "lavanderia",
                titulo: "Lavanderia",
                icone: icones.lavadora,
                itens: itens([
                    ["Lavar", g.lavanderia?.preco_lavar],
                    ["Secar", g.lavanderia?.preco_secar],
                ]),
            },
            {
                id: "restaurante",
                titulo: "Restaurante",
                icone: icones.cozinha,
                itens: itens([["Sobre", g.restaurante?.descricao]]),
            },
            {
                id: "bagagem",
                titulo: "Bagagem e lockers",
                icone: icones.mala,
                itens: bagagemItens,
            },
        ];
        return todos.filter((c) => c.itens.length > 0);
    });

    let acesso = $derived(dados?.guia?.acesso?.trim() ?? "");

    function alternar(id: string) {
        abertos[id] = !abertos[id];
    }

    const STATUS: Record<string, { rotulo: string; tom: string }> = {
        confirmada: { rotulo: "Confirmada", tom: "ok" },
        concluida: { rotulo: "Concluída", tom: "neutro" },
        pendente: { rotulo: "Aguardando pagamento", tom: "aviso" },
        cancelada: { rotulo: "Cancelada", tom: "ruim" },
    };

    let situacao = $derived(
        STATUS[dados?.reserva.status ?? ""] ?? {
            rotulo: dados?.reserva.status ?? "",
            tom: "neutro",
        },
    );

    let enderecoCompleto = $derived(
        dados ? `${dados.imovel.endereco}, ${dados.imovel.cidade}` : "",
    );

    // Datas do botão "Quer ficar mais dias?": começa no checkout atual e pede 1 noite a mais
    let linkEstender = $derived.by(() => {
        if (!dados?.reserva.data_checkout) return "";
        const inicio = dados.reserva.data_checkout;
        return `/imovel/${dados.imovel.id}/reservar?checkin=${inicio}&checkout=${somarDias(inicio, 1)}`;
    });

    let podeEstender = $derived(
        !!dados && dados.reserva.status === "confirmada",
    );
</script>

<svelte:head>
    <title>Check-in · Átrios</title>
    <meta name="robots" content="noindex" />
</svelte:head>

<main>
    {#if carregando}
        <div class="carregando-wrapper">
            <Preloader />
            <p>Abrindo o seu check-in...</p>
        </div>
    {:else if erro || !dados}
        <p class="estado-erro">{erro || "Check-in não encontrado."}</p>
    {:else}
        <header class="topo">
            <div
                class="foto"
                style:background-image={dados.imovel.foto
                    ? `url("${dados.imovel.foto}")`
                    : "none"}
            ></div>
            <div class="topo-textos">
                <span class="selo {situacao.tom}">{situacao.rotulo}</span>
                <h1>{dados.imovel.nome}</h1>
                <p class="endereco">{enderecoCompleto}</p>
                <p class="numero">Reserva nº {dados.reserva.numero}</p>
            </div>
        </header>

        <div class="grade">
            <aside class="lateral">
                <section class="cartao acoes">
                    <button
                        type="button"
                        class="botao-principal"
                        onclick={() => abrirUber(enderecoCompleto)}
                    >
                        <span class="icone">{@html icones.garagem}</span>
                        Chamar Uber
                    </button>
                    <button
                        type="button"
                        class="botao-secundario"
                        onclick={() => abrirMapa(enderecoCompleto)}
                    >
                        <span class="icone">{@html icones.mapa}</span>
                        Ver no mapa
                    </button>
                </section>

                <section class="cartao">
                    <h2>Sua estadia</h2>
                    <div class="item">
                        <span class="rotulo">Hóspedes</span>
                        <span class="valor"
                            >{dados.reserva.hospedes.join(", ")}</span
                        >
                    </div>
                    <div class="item">
                        <span class="rotulo">Check-in</span>
                        <span class="valor"
                            >{formatarDataLonga(dados.reserva.data_checkin)}</span
                        >
                    </div>
                    {#if dados.reserva.data_checkout}
                        <div class="item">
                            <span class="rotulo">Check-out</span>
                            <span class="valor"
                                >{formatarDataLonga(
                                    dados.reserva.data_checkout,
                                )}</span
                            >
                        </div>
                    {/if}
                </section>

                {#if podeEstender && linkEstender}
                    <section class="cartao estender">
                        <h2>Quer ficar mais dias?</h2>
                        <p>
                            Reserve noites extras direto por aqui, sem precisar
                            procurar outro aplicativo.
                        </p>
                        <a class="botao-principal" href={linkEstender}
                            >Estender minha estadia</a
                        >
                    </section>
                {/if}
            </aside>

            <div class="principal">
                {#if acesso}
                    <section class="cartao">
                        <h2>
                            <span class="icone-titulo">{@html icones.chave}</span>
                            Informações de acesso
                        </h2>
                        <p class="texto">{acesso}</p>
                    </section>
                {/if}

                {#if cartoes.length > 0}
                    <section class="guia">
                        <h2 class="titulo-guia">Guia do condomínio</h2>
                        {#each cartoes as c (c.id)}
                            <article class="cartao expansivel">
                                <button
                                    type="button"
                                    class="cabecalho"
                                    aria-expanded={!!abertos[c.id]}
                                    onclick={() => alternar(c.id)}
                                >
                                    <span class="icone-titulo">{@html c.icone}</span>
                                    <span class="nome">{c.titulo}</span>
                                    <span
                                        class="seta"
                                        class:aberta={abertos[c.id]}
                                        >{@html icones.chevron}</span
                                    >
                                </button>
                                {#if abertos[c.id]}
                                    <div class="corpo">
                                        {#each c.itens as item}
                                            <div class="item-guia">
                                                <span class="rotulo"
                                                    >{item.rotulo}</span
                                                >
                                                <span class="texto"
                                                    >{item.texto}</span
                                                >
                                            </div>
                                        {/each}
                                    </div>
                                {/if}
                            </article>
                        {/each}
                    </section>
                {:else if !acesso}
                    <p class="vazio">
                        O anfitrião ainda não preencheu o guia deste imóvel.
                    </p>
                {/if}
            </div>
        </div>
    {/if}
</main>

<style>
    main {
        min-height: 100dvh;
        background-color: var(--cor-fundo);
        font-family: var(--fonte-corpo);
        color: var(--cor-texto);
        padding-bottom: 2.5rem;
    }

    .carregando-wrapper {
        min-height: 60vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        font-size: 0.9rem;
    }

    .estado-erro {
        padding: 3rem 1.5rem;
        text-align: center;
        font-size: 0.9rem;
        color: #b23a2f;
    }

    .topo {
        display: flex;
        flex-direction: column;
    }

    .foto {
        width: 100%;
        height: 230px;
        background-color: var(--atrios-verde-escuro);
        background-size: cover;
        background-position: center;
    }

    .topo-textos {
        padding: 1.1rem 1.1rem 0.4rem;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        align-items: flex-start;
    }

    h1 {
        margin: 0;
        font-size: 1.4rem;
    }

    .endereco,
    .numero {
        margin: 0;
        font-size: 0.85rem;
        opacity: 0.75;
    }

    .numero {
        font-weight: 600;
        opacity: 1;
    }

    .selo {
        padding: 0.25rem 0.7rem;
        border-radius: var(--raio-pill);
        font-size: 0.72rem;
        font-weight: 700;
    }
    .selo.ok {
        background-color: #dcebdd;
        color: #2c6a39;
    }
    .selo.aviso {
        background-color: #f6ecd3;
        color: #8a6414;
    }
    .selo.ruim {
        background-color: #f4dedb;
        color: #b23a2f;
    }
    .selo.neutro {
        background-color: #e8e4dc;
        color: #5b5a54;
    }

    .grade,
    .lateral,
    .principal,
    .guia {
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
    }

    .grade {
        padding: 0.8rem 1.1rem 0;
    }

    .cartao {
        display: flex;
        flex-direction: column;
        gap: 0.7rem;
        padding: 1.1rem;
        background-color: var(--atrios-branco);
        border-radius: var(--raio-lg);
        box-shadow: 0 4px 16px rgba(31, 42, 38, 0.08);
    }

    .cartao h2,
    .titulo-guia {
        margin: 0;
        font-size: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .titulo-guia {
        padding: 0.2rem 0.2rem 0;
    }

    .acoes {
        flex-direction: row;
        gap: 0.6rem;
    }

    .botao-principal,
    .botao-secundario {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
        padding: 0.8rem;
        border-radius: var(--raio-pill);
        font-family: var(--fonte-corpo);
        font-weight: 600;
        font-size: 0.88rem;
        cursor: pointer;
        text-decoration: none;
    }

    .botao-principal {
        border: none;
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
    }

    .botao-secundario {
        border: 1.5px solid var(--cor-borda);
        background-color: transparent;
        color: var(--cor-texto);
    }

    .icone {
        display: flex;
        width: 18px;
        height: 18px;
    }

    .icone-titulo {
        display: flex;
        width: 20px;
        height: 20px;
        color: var(--atrios-dourado);
        flex-shrink: 0;
    }

    .item {
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
    }

    .rotulo {
        font-size: 0.72rem;
        font-weight: 600;
        opacity: 0.6;
    }

    .valor {
        font-size: 0.9rem;
    }

    .estender p {
        margin: 0;
        font-size: 0.85rem;
        line-height: 1.45;
    }

    .estender .botao-principal {
        flex: none;
    }

    .texto {
        margin: 0;
        font-size: 0.9rem;
        line-height: 1.5;
        white-space: pre-line;
    }

    .expansivel {
        padding: 0;
        gap: 0;
    }

    .cabecalho {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        width: 100%;
        padding: 1rem 1.1rem;
        border: none;
        background: none;
        font-family: var(--fonte-corpo);
        font-size: 0.95rem;
        font-weight: 600;
        color: var(--cor-texto);
        text-align: left;
        cursor: pointer;
    }

    .nome {
        flex: 1;
    }

    .seta {
        display: flex;
        width: 18px;
        height: 18px;
        transition: transform 0.2s;
    }

    .seta.aberta {
        transform: rotate(180deg);
    }

    .corpo {
        display: flex;
        flex-direction: column;
        gap: 0.7rem;
        padding: 0 1.1rem 1.1rem;
    }

    .item-guia {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
    }

    .vazio {
        text-align: center;
        font-size: 0.85rem;
        opacity: 0.7;
    }

    /* ===== Desktop: coluna lateral fixa (Uber, mapa, estadia) + guia na coluna principal ===== */
    @media (min-width: 960px) {
        .topo {
            max-width: 1100px;
            margin: 0 auto;
            flex-direction: row;
            gap: 1.6rem;
            align-items: stretch;
            padding: 2rem 0 0;
        }

        .foto {
            width: 380px;
            height: 240px;
            flex-shrink: 0;
            border-radius: var(--raio-lg);
        }

        .topo-textos {
            justify-content: center;
            padding: 0;
        }

        h1 {
            font-size: 1.9rem;
        }

        .grade {
            max-width: 1100px;
            margin: 0 auto;
            padding: 1.6rem 0 0;
            display: grid;
            grid-template-columns: 340px 1fr;
            gap: 1.6rem;
            align-items: start;
        }

        .lateral {
            position: sticky;
            top: 1.5rem;
            grid-column: 1;
            grid-row: 1;
        }

        .principal {
            grid-column: 2;
            grid-row: 1;
        }

        .acoes {
            flex-direction: column;
        }
    }
</style>
