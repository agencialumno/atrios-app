<script lang="ts">
    import { untrack } from "svelte";
    import { goto } from "$app/navigation";
    import { api } from "$lib/api/client";
    import { publicacao } from "$lib/stores/publicacao";
    import {
        deISO,
        formatarCurta,
        formatarMes,
        formatarMesCurto,
        formatarReais,
        hojeISO,
        mesAbreviado,
    } from "$lib/datas";
    import Preloader from "$lib/components/Preloader.svelte";
    import "../../lib/styles/theme.css";

    interface ReservaRecebida {
        id: string;
        imovel_id: string;
        imovel_nome: string;
        hospede_nome: string;
        data_checkin: string;
        data_checkout: string;
        noites: number;
        num_hospedes: number;
        status: string;
        valor_bruto: number;
        comissao: number;
        valor_liquido: number;
    }

    interface ImovelAnfitriao {
        id: string;
        nome: string;
        cidade: string;
        categoria: string | null;
        status: string;
        preco_base_noite: number;
        foto: string | null;
        ocupacao_30_dias: number;
        proxima_checkin: string | null;
        proxima_checkout: string | null;
        proximo_hospede: string | null;
    }

    interface Resumo {
        mes_referencia: string;
        receita_mes: number;
        reservas_mes: number;
        ocupacao_30_dias: number;
        imoveis_ativos: number;
        proximas_chegadas: ReservaRecebida[];
    }

    interface Painel {
        comissao_percentual: number;
        resumo: Resumo;
        imoveis: ImovelAnfitriao[];
        reservas: ReservaRecebida[];
    }

    type Aba = "resumo" | "imoveis" | "reservas" | "extrato";
    type Tom = "ativa" | "neutra" | "cancelada";

    const abas: { id: Aba; nome: string }[] = [
        { id: "resumo", nome: "Resumo" },
        { id: "imoveis", nome: "Imóveis" },
        { id: "reservas", nome: "Reservas" },
        { id: "extrato", nome: "Extrato" },
    ];

    const hoje = hojeISO();
    const mesAtual = hoje.slice(0, 7);

    let painel = $state<Painel | null>(null);
    let carregando = $state(true);
    let erro = $state("");
    let aba = $state<Aba>("resumo");
    let mesEscolhido = $state<string | null>(null);

    async function carregar() {
        try {
            painel = await api<Painel>("/anfitriao/painel", {
                autenticado: true,
            });
            erro = "";
        } catch (e) {
            erro = e instanceof Error ? e.message : "Erro ao carregar o painel";
        } finally {
            carregando = false;
        }
    }

    // Carrega ao abrir e de novo sempre que uma publicação ou edição termina
    $effect(() => {
        void $publicacao.concluidas;
        untrack(() => carregar());
    });

    function contaComoReceita(r: ReservaRecebida): boolean {
        return r.status === "confirmada" || r.status === "concluida";
    }

    function ehProxima(r: ReservaRecebida): boolean {
        return r.status !== "cancelada" && r.data_checkout >= hoje;
    }

    function situacao(r: ReservaRecebida): { rotulo: string; tom: Tom } {
        if (r.status === "cancelada")
            return { rotulo: "Cancelada", tom: "cancelada" };
        if (r.data_checkout < hoje)
            return { rotulo: "Concluída", tom: "neutra" };
        if (r.data_checkin <= hoje)
            return { rotulo: "Em andamento", tom: "ativa" };
        if (r.status === "pendente")
            return { rotulo: "Pendente", tom: "neutra" };
        return { rotulo: "Confirmada", tom: "ativa" };
    }

    function somar(
        lista: ReservaRecebida[],
        campo: keyof ReservaRecebida,
    ): number {
        return lista.reduce((total, r) => total + Number(r[campo]), 0);
    }

    function foto(i: ImovelAnfitriao): string {
        return i.foto || "/atrios-simbolo.png";
    }

    function textoProxima(i: ImovelAnfitriao): string {
        if (i.status !== "ativo") return "Anúncio pausado";
        if (!i.proxima_checkin || !i.proxima_checkout)
            return "Sem reservas futuras";

        const hospede = i.proximo_hospede ?? "Hóspede";
        if (i.proxima_checkin <= hoje) {
            return `Hospedado agora: ${hospede} até ${formatarCurta(i.proxima_checkout)}`;
        }
        return `Próxima: ${formatarCurta(i.proxima_checkin)} → ${formatarCurta(i.proxima_checkout)} · ${hospede}`;
    }

    let todas = $derived(painel?.reservas ?? []);

    let proximas = $derived(
        todas
            .filter(ehProxima)
            .sort((a, b) => a.data_checkin.localeCompare(b.data_checkin)),
    );

    let anteriores = $derived(
        todas
            .filter((r) => !ehProxima(r))
            .sort((a, b) => b.data_checkin.localeCompare(a.data_checkin)),
    );

    let reservasExtrato = $derived(todas.filter(contaComoReceita));

    let meses = $derived(
        [...new Set(reservasExtrato.map((r) => r.data_checkin.slice(0, 7)))]
            .sort()
            .reverse(),
    );

    let mesAtivo = $derived(
        mesEscolhido ??
            (meses.includes(mesAtual) ? mesAtual : (meses[0] ?? null)),
    );

    let doMes = $derived(
        mesAtivo
            ? reservasExtrato
                  .filter((r) => r.data_checkin.startsWith(mesAtivo))
                  .sort((a, b) => a.data_checkin.localeCompare(b.data_checkin))
            : [],
    );

    let totais = $derived({
        bruto: somar(doMes, "valor_bruto"),
        comissao: somar(doMes, "comissao"),
        liquido: somar(doMes, "valor_liquido"),
    });
</script>

<main>
    <header>
        <h1>Painel do anfitrião</h1>
        <p>Seus imóveis, reservas e resultados</p>
    </header>

    {#if carregando}
        <div class="carregando-wrapper">
            <Preloader />
            <p>Carregando seu painel...</p>
        </div>
    {:else if erro || !painel}
        <div class="bloqueio">
            <p class="erro">{erro || "Não foi possível carregar o painel."}</p>
            {#if erro.includes("exclusivo")}
                <button
                    class="botao-principal"
                    onclick={() => goto("/anunciar")}
                >
                    Criar meu primeiro anúncio
                </button>
            {/if}
        </div>
    {:else}
        <div class="abas" role="tablist">
            {#each abas as a (a.id)}
                <button
                    class="aba"
                    class:ativa={aba === a.id}
                    role="tab"
                    aria-selected={aba === a.id}
                    onclick={() => (aba = a.id)}
                >
                    {a.nome}
                </button>
            {/each}
        </div>

        {#if aba === "resumo"}
            <section class="cartao-destaque">
                <p class="destaque-rotulo">
                    Receita líquida · {formatarMes(
                        painel.resumo.mes_referencia,
                    )}
                </p>
                <p class="destaque-valor">
                    {formatarReais(painel.resumo.receita_mes)}
                </p>
                <p class="destaque-nota">
                    Depois da comissão de {painel.comissao_percentual.toFixed(
                        0,
                    )}% da Átrios
                </p>
            </section>

            <div class="numeros">
                <div class="numero">
                    <span class="numero-valor"
                        >{painel.resumo.reservas_mes}</span
                    >
                    <span class="numero-rotulo">
                        {painel.resumo.reservas_mes === 1
                            ? "reserva no mês"
                            : "reservas no mês"}
                    </span>
                </div>
                <div class="numero">
                    <span class="numero-valor"
                        >{painel.resumo.ocupacao_30_dias.toFixed(0)}%</span
                    >
                    <span class="numero-rotulo">ocupação, 30 dias</span>
                </div>
                <div class="numero">
                    <span class="numero-valor"
                        >{painel.resumo.imoveis_ativos}</span
                    >
                    <span class="numero-rotulo">
                        {painel.resumo.imoveis_ativos === 1
                            ? "imóvel ativo"
                            : "imóveis ativos"}
                    </span>
                </div>
            </div>

            <section>
                <h2>Próximas chegadas</h2>

                {#if painel.resumo.proximas_chegadas.length === 0}
                    <p class="vazio-texto">
                        Nenhuma chegada agendada por enquanto.
                    </p>
                {:else}
                    <div class="lista">
                        {#each painel.resumo.proximas_chegadas as r (r.id)}
                            <div class="chegada">
                                <div class="data-caixa">
                                    <span class="data-dia"
                                        >{deISO(r.data_checkin).getDate()}</span
                                    >
                                    <span class="data-mes"
                                        >{mesAbreviado(r.data_checkin)}</span
                                    >
                                </div>
                                <div class="chegada-info">
                                    <p class="chegada-imovel">
                                        {r.imovel_nome}
                                    </p>
                                    <p class="chegada-detalhe">
                                        {r.hospede_nome} · {r.num_hospedes}
                                        {r.num_hospedes === 1
                                            ? "hóspede"
                                            : "hóspedes"} · {r.noites}
                                        {r.noites === 1 ? "noite" : "noites"}
                                    </p>
                                </div>
                                <span class="chegada-valor"
                                    >{formatarReais(r.valor_liquido)}</span
                                >
                            </div>
                        {/each}
                    </div>
                {/if}
            </section>
        {/if}

        {#if aba === "imoveis"}
            {#if painel.imoveis.length === 0}
                <div class="vazio">
                    <img src="/atrios-simbolo.png" alt="" class="vazio-icone" />
                    <h2>Você ainda não tem anúncios</h2>
                    <p>Crie o primeiro e deixe a Átrios cuidar dos hóspedes.</p>
                    <button
                        class="botao-principal"
                        onclick={() => goto("/anunciar")}
                    >
                        Criar anúncio
                    </button>
                </div>
            {:else}
                <div class="lista">
                    {#each painel.imoveis as i (i.id)}
                        <article
                            class="card-imovel"
                            class:pausado={i.status !== "ativo"}
                        >
                            <button
                                class="card-corpo"
                                onclick={() => goto(`/imovel/${i.id}`)}
                            >
                                <img
                                    class="imovel-foto"
                                    src={foto(i)}
                                    alt={i.nome}
                                />
                                <div class="imovel-info">
                                    <div class="linha-topo">
                                        <h3>{i.nome}</h3>
                                        <span
                                            class="chip {i.status === 'ativo'
                                                ? 'ativa'
                                                : 'neutra'}"
                                        >
                                            {i.status === "ativo"
                                                ? "Ativo"
                                                : "Pausado"}
                                        </span>
                                    </div>
                                    <p class="imovel-cidade">
                                        {i.cidade} · {formatarReais(
                                            i.preco_base_noite,
                                        )}/noite
                                    </p>

                                    <div class="ocupacao">
                                        <div class="ocupacao-trilho">
                                            <div
                                                class="ocupacao-preenchido"
                                                style="width: {i.ocupacao_30_dias}%"
                                            ></div>
                                        </div>
                                        <span class="ocupacao-texto"
                                            >{i.ocupacao_30_dias.toFixed(
                                                0,
                                            )}%</span
                                        >
                                    </div>

                                    <p class="imovel-proxima">
                                        {textoProxima(i)}
                                    </p>
                                </div>
                            </button>

                            <div class="card-acoes">
                                <button
                                    class="acao"
                                    onclick={() =>
                                        goto(`/anfitriao/editar/${i.id}`)}
                                >
                                    Editar anúncio
                                </button>
                            </div>
                        </article>
                    {/each}
                </div>
            {/if}
        {/if}

        {#if aba === "reservas"}
            {#if todas.length === 0}
                <div class="vazio">
                    <img src="/atrios-simbolo.png" alt="" class="vazio-icone" />
                    <h2>Nenhuma reserva ainda</h2>
                    <p>
                        Quando um hóspede reservar um dos seus imóveis, ela
                        aparece aqui.
                    </p>
                </div>
            {:else}
                {#if proximas.length > 0}
                    <h2>Próximas</h2>
                    <div class="lista">
                        {#each proximas as r (r.id)}
                            {@const sit = situacao(r)}
                            <article class="card-reserva">
                                <div class="reserva-topo">
                                    <div class="reserva-textos">
                                        <p class="reserva-imovel">
                                            {r.imovel_nome}
                                        </p>
                                        <p class="reserva-hospede">
                                            {r.hospede_nome} · {r.num_hospedes}
                                            {r.num_hospedes === 1
                                                ? "hóspede"
                                                : "hóspedes"}
                                        </p>
                                    </div>
                                    <span class="chip {sit.tom}"
                                        >{sit.rotulo}</span
                                    >
                                </div>
                                <div class="reserva-base">
                                    <p class="reserva-datas">
                                        {formatarCurta(r.data_checkin)} → {formatarCurta(
                                            r.data_checkout,
                                        )}
                                        · {r.noites}
                                        {r.noites === 1 ? "noite" : "noites"}
                                    </p>
                                    <div class="reserva-valor">
                                        <strong
                                            >{formatarReais(
                                                r.valor_liquido,
                                            )}</strong
                                        >
                                        <span>a receber</span>
                                    </div>
                                </div>
                            </article>
                        {/each}
                    </div>
                {/if}

                {#if anteriores.length > 0}
                    <h2 class="titulo-secao">Anteriores</h2>
                    <div class="lista">
                        {#each anteriores as r (r.id)}
                            {@const sit = situacao(r)}
                            <article
                                class="card-reserva"
                                class:cancelada={sit.tom === "cancelada"}
                            >
                                <div class="reserva-topo">
                                    <div class="reserva-textos">
                                        <p class="reserva-imovel">
                                            {r.imovel_nome}
                                        </p>
                                        <p class="reserva-hospede">
                                            {r.hospede_nome} · {r.num_hospedes}
                                            {r.num_hospedes === 1
                                                ? "hóspede"
                                                : "hóspedes"}
                                        </p>
                                    </div>
                                    <span class="chip {sit.tom}"
                                        >{sit.rotulo}</span
                                    >
                                </div>
                                <div class="reserva-base">
                                    <p class="reserva-datas">
                                        {formatarCurta(r.data_checkin)} → {formatarCurta(
                                            r.data_checkout,
                                        )}
                                        · {r.noites}
                                        {r.noites === 1 ? "noite" : "noites"}
                                    </p>
                                    <div class="reserva-valor">
                                        <strong
                                            >{formatarReais(
                                                r.valor_liquido,
                                            )}</strong
                                        >
                                        <span
                                            >{sit.tom === "cancelada"
                                                ? "não recebido"
                                                : "líquido"}</span
                                        >
                                    </div>
                                </div>
                            </article>
                        {/each}
                    </div>
                {/if}
            {/if}
        {/if}

        {#if aba === "extrato"}
            {#if meses.length === 0}
                <div class="vazio">
                    <img src="/atrios-simbolo.png" alt="" class="vazio-icone" />
                    <h2>Seu extrato aparece aqui</h2>
                    <p>
                        Assim que houver uma reserva confirmada, você vê o que
                        entrou, a comissão e o que fica com você.
                    </p>
                </div>
            {:else}
                <div class="meses">
                    {#each meses as m (m)}
                        <button
                            class="mes"
                            class:ativo={mesAtivo === m}
                            onclick={() => (mesEscolhido = m)}
                        >
                            {formatarMesCurto(m)}
                        </button>
                    {/each}
                </div>

                {#if mesAtivo}
                    <section class="cartao-extrato">
                        <p class="extrato-titulo">{formatarMes(mesAtivo)}</p>

                        <div class="extrato-linha">
                            <span>Valor das reservas</span>
                            <span>{formatarReais(totais.bruto)}</span>
                        </div>
                        <div class="extrato-linha">
                            <span
                                >Comissão Átrios ({painel.comissao_percentual.toFixed(
                                    0,
                                )}%)</span
                            >
                            <span class="negativo"
                                >− {formatarReais(totais.comissao)}</span
                            >
                        </div>
                        <div class="extrato-linha total">
                            <span>Você recebe</span>
                            <span>{formatarReais(totais.liquido)}</span>
                        </div>
                    </section>

                    <h2>Reservas do mês</h2>
                    <div class="lista">
                        {#each doMes as r (r.id)}
                            <div class="linha-extrato">
                                <div class="linha-extrato-textos">
                                    <p class="reserva-imovel">
                                        {r.imovel_nome}
                                    </p>
                                    <p class="reserva-hospede">
                                        {r.hospede_nome} · {formatarCurta(
                                            r.data_checkin,
                                        )} → {formatarCurta(r.data_checkout)}
                                    </p>
                                </div>
                                <div class="linha-extrato-valores">
                                    <strong
                                        >{formatarReais(
                                            r.valor_liquido,
                                        )}</strong
                                    >
                                    <span
                                        >bruto {formatarReais(
                                            r.valor_bruto,
                                        )}</span
                                    >
                                </div>
                            </div>
                        {/each}
                    </div>

                    <p class="rodape-nota">
                        Só entram reservas confirmadas ou concluídas. Canceladas
                        não contam.
                    </p>
                {/if}
            {/if}
        {/if}
    {/if}
</main>

<style>
    main {
        min-height: 100dvh;
        background-color: var(--cor-fundo);
        padding: 2rem 1.25rem calc(var(--altura-barra) + 1.5rem);
        font-family: var(--fonte-corpo);
    }

    header {
        margin-bottom: 1.25rem;
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

    h2 {
        font-size: 1rem;
        color: var(--cor-texto);
        margin: 0 0 0.8rem;
    }

    .titulo-secao {
        margin-top: 1.5rem;
    }

    section {
        margin-bottom: 1.5rem;
    }

    .carregando-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        padding: 3rem 1rem;
        color: var(--cor-texto);
        opacity: 0.75;
        font-size: 0.85rem;
    }

    .carregando-wrapper p {
        margin: 0;
    }

    .bloqueio {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding: 2rem 0;
        text-align: center;
    }

    .erro {
        color: #b23a2f;
        font-size: 0.85rem;
        margin: 0;
    }

    .botao-principal {
        width: 100%;
        max-width: 260px;
        padding: 0.85rem;
        border: none;
        border-radius: var(--raio-pill);
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        font-weight: 600;
        font-size: 0.9rem;
        cursor: pointer;
    }

    /* Abas */
    .abas {
        display: flex;
        gap: 0.2rem;
        padding: 0.25rem;
        margin-bottom: 1.25rem;
        background-color: var(--atrios-branco);
        border-radius: var(--raio-pill);
        box-shadow: 0 2px 10px rgba(31, 42, 38, 0.08);
    }

    .aba {
        flex: 1;
        padding: 0.65rem 0.2rem;
        border: none;
        border-radius: var(--raio-pill);
        background: none;
        font-family: var(--fonte-corpo);
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--cor-texto);
        opacity: 0.6;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .aba.ativa {
        background-color: var(--atrios-dourado);
        font-weight: 700;
        opacity: 1;
    }

    /* Resumo */
    .cartao-destaque {
        padding: 1.4rem 1.3rem;
        border-radius: var(--raio-lg);
        background-color: var(--atrios-verde-escuro);
        box-shadow: 0 6px 20px rgba(31, 42, 38, 0.2);
    }

    .destaque-rotulo {
        margin: 0 0 0.5rem;
        font-size: 0.78rem;
        color: var(--atrios-creme);
        opacity: 0.8;
    }

    .destaque-valor {
        margin: 0 0 0.4rem;
        font-family: var(--fonte-titulo);
        font-size: 2rem;
        font-weight: 800;
        color: var(--atrios-dourado);
    }

    .destaque-nota {
        margin: 0;
        font-size: 0.75rem;
        color: var(--atrios-creme);
        opacity: 0.7;
    }

    .numeros {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.6rem;
        margin-bottom: 1.5rem;
    }

    .numero {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        padding: 0.9rem 0.6rem;
        background-color: var(--atrios-branco);
        border-radius: var(--raio-md);
        box-shadow: 0 2px 10px rgba(31, 42, 38, 0.06);
        text-align: center;
    }

    .numero-valor {
        font-family: var(--fonte-titulo);
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--cor-texto);
    }

    .numero-rotulo {
        font-size: 0.68rem;
        color: var(--cor-texto);
        opacity: 0.65;
    }

    .lista {
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
    }

    .vazio-texto {
        margin: 0;
        font-size: 0.85rem;
        color: var(--cor-texto);
        opacity: 0.65;
    }

    .chegada {
        display: flex;
        align-items: center;
        gap: 0.85rem;
        padding: 0.85rem;
        background-color: var(--atrios-branco);
        border-radius: var(--raio-md);
        box-shadow: 0 2px 10px rgba(31, 42, 38, 0.06);
    }

    .data-caixa {
        flex-shrink: 0;
        width: 48px;
        height: 52px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border-radius: var(--raio-sm);
        background-color: var(--atrios-creme);
    }

    .data-dia {
        font-family: var(--fonte-titulo);
        font-size: 1.1rem;
        font-weight: 800;
        color: var(--cor-texto);
        line-height: 1;
    }

    .data-mes {
        margin-top: 0.15rem;
        font-size: 0.65rem;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--atrios-dourado);
    }

    .chegada-info {
        flex: 1;
        min-width: 0;
    }

    .chegada-imovel {
        margin: 0 0 0.15rem;
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--cor-texto);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .chegada-detalhe {
        margin: 0;
        font-size: 0.72rem;
        color: var(--cor-texto);
        opacity: 0.65;
    }

    .chegada-valor {
        flex-shrink: 0;
        font-family: var(--fonte-titulo);
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--cor-texto);
    }

    /* Imóveis */
    .card-imovel {
        display: flex;
        flex-direction: column;
        background-color: var(--atrios-branco);
        border-radius: var(--raio-lg);
        box-shadow: 0 4px 16px rgba(31, 42, 38, 0.08);
        overflow: hidden;
    }

    .card-corpo {
        display: flex;
        gap: 0.9rem;
        padding: 0.9rem;
        border: none;
        background: none;
        text-align: left;
        font-family: var(--fonte-corpo);
        cursor: pointer;
    }

    .card-imovel.pausado .imovel-foto {
        filter: grayscale(0.7);
        opacity: 0.75;
    }

    .imovel-foto {
        width: 84px;
        height: 84px;
        flex-shrink: 0;
        border-radius: var(--raio-md);
        object-fit: cover;
        background-color: var(--atrios-creme);
    }

    .imovel-info {
        flex: 1;
        min-width: 0;
    }

    .linha-topo {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.5rem;
    }

    .linha-topo h3 {
        margin: 0;
        font-size: 0.92rem;
        color: var(--cor-texto);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .imovel-cidade {
        margin: 0.15rem 0 0.6rem;
        font-size: 0.73rem;
        color: var(--cor-texto);
        opacity: 0.65;
    }

    .ocupacao {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.45rem;
    }

    .ocupacao-trilho {
        flex: 1;
        height: 6px;
        border-radius: var(--raio-pill);
        background-color: var(--cor-borda);
        overflow: hidden;
    }

    .ocupacao-preenchido {
        height: 100%;
        border-radius: var(--raio-pill);
        background-color: var(--atrios-dourado);
    }

    .ocupacao-texto {
        font-size: 0.7rem;
        font-weight: 700;
        color: var(--cor-texto);
    }

    .imovel-proxima {
        margin: 0;
        font-size: 0.72rem;
        color: var(--cor-texto);
        opacity: 0.75;
    }

    .card-acoes {
        padding: 0.65rem 0.9rem;
        border-top: 1px solid var(--atrios-creme);
    }

    .acao {
        padding: 0.5rem 1.1rem;
        border: 1.5px solid var(--atrios-dourado);
        border-radius: var(--raio-pill);
        background: none;
        color: var(--cor-texto);
        font-family: var(--fonte-corpo);
        font-size: 0.78rem;
        font-weight: 600;
        cursor: pointer;
    }

    .chip {
        flex-shrink: 0;
        padding: 0.2rem 0.6rem;
        border-radius: var(--raio-pill);
        font-size: 0.65rem;
        font-weight: 700;
    }

    .chip.ativa {
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
    }

    .chip.neutra {
        background-color: var(--atrios-creme);
        color: var(--cor-texto);
    }

    .chip.cancelada {
        background-color: #f4dedb;
        color: #b23a2f;
    }

    /* Reservas */
    .card-reserva {
        display: flex;
        flex-direction: column;
        gap: 0.7rem;
        padding: 1rem;
        background-color: var(--atrios-branco);
        border-radius: var(--raio-lg);
        box-shadow: 0 4px 16px rgba(31, 42, 38, 0.08);
    }

    .card-reserva.cancelada {
        opacity: 0.6;
    }

    .card-reserva.cancelada strong {
        text-decoration: line-through;
    }

    .reserva-topo {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.6rem;
    }

    .reserva-textos {
        min-width: 0;
    }

    .reserva-imovel {
        margin: 0 0 0.15rem;
        font-size: 0.88rem;
        font-weight: 700;
        color: var(--cor-texto);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .reserva-hospede {
        margin: 0;
        font-size: 0.75rem;
        color: var(--cor-texto);
        opacity: 0.65;
    }

    .reserva-base {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 0.8rem;
        padding-top: 0.7rem;
        border-top: 1px solid var(--atrios-creme);
    }

    .reserva-datas {
        margin: 0;
        font-size: 0.78rem;
        font-weight: 600;
        color: var(--cor-texto);
    }

    .reserva-valor {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
    }

    .reserva-valor strong {
        font-family: var(--fonte-titulo);
        font-size: 0.95rem;
        color: var(--cor-texto);
    }

    .reserva-valor span {
        font-size: 0.65rem;
        color: var(--cor-texto);
        opacity: 0.6;
    }

    /* Extrato */
    .meses {
        display: flex;
        gap: 0.5rem;
        margin: 0 -1.25rem 1.1rem;
        padding: 0.1rem 1.25rem 0.4rem;
        overflow-x: auto;
        scrollbar-width: none;
    }

    .meses::-webkit-scrollbar {
        display: none;
    }

    .mes {
        flex: 0 0 auto;
        padding: 0.5rem 1rem;
        border: none;
        border-radius: var(--raio-pill);
        background-color: var(--atrios-branco);
        box-shadow: 0 2px 10px rgba(31, 42, 38, 0.06);
        font-family: var(--fonte-corpo);
        font-size: 0.78rem;
        font-weight: 500;
        color: var(--cor-texto);
        cursor: pointer;
    }

    .mes.ativo {
        background-color: var(--atrios-dourado);
        font-weight: 700;
    }

    .cartao-extrato {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding: 1.2rem;
        background-color: var(--atrios-branco);
        border-radius: var(--raio-lg);
        box-shadow: 0 4px 16px rgba(31, 42, 38, 0.08);
    }

    .extrato-titulo {
        margin: 0 0 0.2rem;
        font-family: var(--fonte-titulo);
        font-size: 1rem;
        font-weight: 700;
        color: var(--cor-texto);
    }

    .extrato-linha {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        font-size: 0.85rem;
        color: var(--cor-texto);
    }

    .extrato-linha .negativo {
        color: #b23a2f;
    }

    .extrato-linha.total {
        margin-top: 0.3rem;
        padding-top: 0.85rem;
        border-top: 1px solid var(--cor-borda);
        font-family: var(--fonte-titulo);
        font-size: 1rem;
        font-weight: 800;
    }

    .linha-extrato {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.8rem;
        padding: 0.85rem 1rem;
        background-color: var(--atrios-branco);
        border-radius: var(--raio-md);
        box-shadow: 0 2px 10px rgba(31, 42, 38, 0.06);
    }

    .linha-extrato-textos {
        min-width: 0;
    }

    .linha-extrato-valores {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        flex-shrink: 0;
    }

    .linha-extrato-valores strong {
        font-family: var(--fonte-titulo);
        font-size: 0.9rem;
        color: var(--cor-texto);
    }

    .linha-extrato-valores span {
        font-size: 0.66rem;
        color: var(--cor-texto);
        opacity: 0.6;
    }

    .rodape-nota {
        margin: 1rem 0 0;
        font-size: 0.72rem;
        line-height: 1.45;
        color: var(--cor-texto);
        opacity: 0.6;
        text-align: center;
    }

    /* Estados vazios */
    .vazio {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 0.5rem;
        padding: 2.5rem 1rem;
    }

    .vazio-icone {
        width: 56px;
        height: auto;
        opacity: 0.85;
        margin-bottom: 0.4rem;
    }

    .vazio h2 {
        margin: 0;
    }

    .vazio p {
        margin: 0 0 0.8rem;
        max-width: 290px;
        font-size: 0.85rem;
        line-height: 1.45;
        color: var(--cor-texto);
        opacity: 0.65;
    }
</style>
