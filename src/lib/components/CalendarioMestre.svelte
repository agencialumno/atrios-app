<script lang="ts">
    import { untrack } from "svelte";
    import { goto } from "$app/navigation";
    import { api } from "$lib/api/client";
    import {
        deISO,
        diaSemanaCurto,
        diferencaDias,
        formatarCurta,
        hojeISO,
        somarDias,
    } from "$lib/datas";
    import Preloader from "./Preloader.svelte";

    interface ImovelCalendario {
        id: string;
        nome: string;
        cidade: string;
        endereco: string;
        status: string;
    }

    interface BloqueioMestre {
        imovel_id: string;
        data_inicio: string;
        data_fim: string;
        origem: string;
        reserva_id?: string | null;
        hospede_nome?: string | null;
        num_hospedes?: number | null;
    }

    interface DadosCalendario {
        imoveis: ImovelCalendario[];
        bloqueios: BloqueioMestre[];
    }

    interface Segmento {
        chave: string;
        bloqueio: BloqueioMestre;
        de: number; // coluna da grade (14 colunas: 2 por dia) onde a barra começa
        ate: number; // coluna da grade onde a barra termina
        corteEsq: boolean;
        corteDir: boolean;
        faixa: number; // linha da barra dentro do imóvel (sobe quando há sobreposição)
        conflito: boolean;
    }

    const DIAS = 7;
    const LIMITE_MS = 15000;
    const FORMATO_ISO = /^\d{4}-\d{2}-\d{2}$/;
    const hoje = hojeISO();

    let inicio = $state(hoje); // semana pedida (título e setas)
    let base = $state(hoje); // semana a que os dados carregados pertencem
    let dados = $state<DadosCalendario | null>(null);
    let carregando = $state(false);
    let erro = $state("");
    let escolhido = $state<{
        bloqueio: BloqueioMestre;
        imovel: ImovelCalendario;
        conflito: boolean;
    } | null>(null);

    let requisicao = 0;

    function comTempoLimite<T>(promessa: Promise<T>, ms: number): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const relogio = setTimeout(
                () =>
                    reject(
                        new Error(
                            "O servidor demorou demais para responder. Confira se o backend está rodando.",
                        ),
                    ),
                ms,
            );
            promessa.then(
                (valor) => {
                    clearTimeout(relogio);
                    resolve(valor);
                },
                (falha) => {
                    clearTimeout(relogio);
                    reject(falha);
                },
            );
        });
    }

    async function carregar(de: string) {
        const minha = ++requisicao;
        carregando = true;
        erro = "";

        try {
            const resposta = await comTempoLimite(
                api<DadosCalendario>(
                    `/equipe/calendario?de=${de}&ate=${somarDias(de, DIAS)}`,
                    {
                        autenticado: true,
                    },
                ),
                LIMITE_MS,
            );
            if (minha !== requisicao) return;

            dados = {
                imoveis: Array.isArray(resposta?.imoveis)
                    ? resposta.imoveis
                    : [],
                bloqueios: Array.isArray(resposta?.bloqueios)
                    ? resposta.bloqueios
                    : [],
            };
            base = de;
        } catch (e) {
            if (minha !== requisicao) return;
            console.error("[calendario]", e);
            dados = null;
            erro =
                e instanceof Error
                    ? e.message
                    : "Erro ao carregar o calendário";
        } finally {
            if (minha === requisicao) carregando = false;
        }
    }

    // Carrega ao abrir e a cada mudança de semana
    $effect(() => {
        const de = inicio;
        untrack(() => {
            void carregar(de);
        });
    });

    // Duas origens diferentes na mesma noite é reserva dupla (bloqueio manual não conta)
    function emConflito(a: string, b: string): boolean {
        return a !== b && a !== "manual" && b !== "manual";
    }

    // ----- Derivados (sempre em cima da semana dos dados, para não desalinhar) -----

    let dias = $derived(
        Array.from({ length: DIAS }, (_, i) => somarDias(base, i)),
    );
    let fimJanela = $derived(somarDias(base, DIAS));
    let ativos = $derived(
        (dados?.imoveis ?? []).filter((i) => i.status === "ativo"),
    );

    let segmentos = $derived.by(() => {
        const mapa = new Map<string, Segmento[]>();
        if (!dados) return mapa;

        dados.bloqueios.forEach((b, indice) => {
            // Ignora dado fora do formato em vez de deixar a tela travar
            if (
                !FORMATO_ISO.test(b.data_inicio) ||
                !FORMATO_ISO.test(b.data_fim)
            )
                return;
            if (b.data_fim < b.data_inicio) return;
            if (b.data_fim < base || b.data_inicio >= fimJanela) return;

            const i = diferencaDias(base, b.data_inicio);
            const j = diferencaDias(base, b.data_fim);
            const corteEsq = i < 0;
            const corteDir = j >= DIAS;

            const de = corteEsq ? 1 : 2 * i + 2;
            const ate = corteDir ? DIAS * 2 + 1 : 2 * j + 2;
            if (ate <= de) return;

            const lista = mapa.get(b.imovel_id) ?? [];
            lista.push({
                chave: `${b.imovel_id}-${b.data_inicio}-${b.data_fim}-${b.origem}-${indice}`,
                bloqueio: b,
                de,
                ate,
                corteEsq,
                corteDir,
                faixa: 0,
                conflito: false,
            });
            mapa.set(b.imovel_id, lista);
        });

        for (const lista of mapa.values()) {
            lista.sort((x, y) => x.de - y.de || x.ate - y.ate);

            // Barras que se sobrepõem vão para linhas diferentes
            const fins: number[] = [];
            for (const s of lista) {
                let f = fins.findIndex((fim) => fim <= s.de);
                if (f === -1) {
                    f = fins.length;
                    fins.push(s.ate);
                } else {
                    fins[f] = s.ate;
                }
                s.faixa = f;
            }

            // Sobreposição entre origens diferentes marca conflito
            for (let a = 0; a < lista.length; a++) {
                for (let b = a + 1; b < lista.length; b++) {
                    const x = lista[a];
                    const y = lista[b];
                    if (
                        x.de < y.ate &&
                        y.de < x.ate &&
                        emConflito(x.bloqueio.origem, y.bloqueio.origem)
                    ) {
                        x.conflito = true;
                        y.conflito = true;
                    }
                }
            }
        }

        return mapa;
    });

    let imoveisComConflito = $derived.by(() => {
        const ids = new Set<string>();
        for (const [id, lista] of segmentos) {
            if (lista.some((s) => s.conflito)) ids.add(id);
        }
        return ids;
    });

    // imóvel -> noites ocupadas dentro da semana
    let noites = $derived.by(() => {
        const mapa = new Map<string, Set<string>>();

        for (const [id, lista] of segmentos) {
            const conjunto = new Set<string>();

            for (const s of lista) {
                let dia =
                    s.bloqueio.data_inicio < base
                        ? base
                        : s.bloqueio.data_inicio;
                const limite =
                    s.bloqueio.data_fim > fimJanela
                        ? fimJanela
                        : s.bloqueio.data_fim;

                // Teto de iterações: nunca passa dos dias da semana
                for (let n = 0; n <= DIAS && dia < limite; n++) {
                    conjunto.add(dia);
                    dia = somarDias(dia, 1);
                }
            }

            mapa.set(id, conjunto);
        }

        return mapa;
    });

    let livresPorDia = $derived(
        dias.map((d) => ativos.filter((i) => !noites.get(i.id)?.has(d)).length),
    );
    let noitesOcupadas = $derived(
        ativos.reduce((total, i) => total + (noites.get(i.id)?.size ?? 0), 0),
    );
    let noitesLivres = $derived(ativos.length * DIAS - noitesOcupadas);
    let ocupacao = $derived(
        ativos.length > 0
            ? Math.round((noitesOcupadas / (ativos.length * DIAS)) * 100)
            : 0,
    );

    let titulo = $derived(
        `${formatarCurta(inicio)} – ${formatarCurta(somarDias(inicio, DIAS - 1))}`,
    );

    // ----- Formatação -----

    function faixasDe(lista: Segmento[]): number {
        return Math.max(1, ...lista.map((s) => s.faixa + 1));
    }

    function ehFimDeSemana(iso: string): boolean {
        const d = deISO(iso).getDay();
        return d === 0 || d === 6;
    }

    /** "Rua Tal, 302" -> "302" */
    function unidade(endereco: string): string {
        const partes = (endereco ?? "").split(",");
        return partes.length > 1 ? partes[partes.length - 1].trim() : "";
    }

    function primeiroNome(nome: string | null | undefined): string {
        return nome?.trim().split(/\s+/)[0] ?? "";
    }

    function rotuloOrigem(origem: string): string {
        switch (origem) {
            case "atrios_reserva":
                return "Reserva Átrios";
            case "airbnb":
                return "Airbnb";
            case "booking":
                return "Booking";
            case "manual":
                return "Bloqueio manual";
            default:
                return origem;
        }
    }

    function textoBloco(b: BloqueioMestre): string {
        if (b.origem === "atrios_reserva")
            return primeiroNome(b.hospede_nome) || "Reserva";
        if (b.origem === "manual") return "Bloqueio";
        return rotuloOrigem(b.origem);
    }

    function situacao(b: BloqueioMestre): string {
        if (b.data_inicio === hoje) return "Chega hoje";
        if (b.data_fim === hoje) return "Sai hoje";
        if (b.data_inicio < hoje && b.data_fim > hoje) return "Em estadia";
        return "";
    }

    function fechar() {
        escolhido = null;
    }

    function verAnuncio(id: string) {
        goto(`/imovel/${id}`);
    }
</script>

<svelte:window onkeydown={(e) => e.key === "Escape" && fechar()} />

<div class="calendario">
    {#if dados}
        <div class="resumo">
            <div class="resumo-card">
                <span class="resumo-valor">{ocupacao}%</span>
                <span class="resumo-rotulo">ocupação no período</span>
            </div>
            <div class="resumo-card">
                <span class="resumo-valor">{noitesLivres}</span>
                <span class="resumo-rotulo"
                    >{noitesLivres === 1
                        ? "noite livre"
                        : "noites livres"}</span
                >
            </div>
        </div>
    {/if}

    <div class="nav">
        <button
            class="seta"
            onclick={() => (inicio = somarDias(inicio, -DIAS))}
            aria-label="Semana anterior"
        >
            ‹
        </button>
        <div class="titulo">
            <span>{titulo}</span>
            {#if inicio !== hoje}
                <button class="link" onclick={() => (inicio = hoje)}
                    >Ir para hoje</button
                >
            {/if}
        </div>
        <button
            class="seta"
            onclick={() => (inicio = somarDias(inicio, DIAS))}
            aria-label="Próxima semana"
        >
            ›
        </button>
    </div>

    {#if dados && imoveisComConflito.size > 0}
        <div class="alerta-conflito" role="alert">
            <strong>
                Conflito de datas em {imoveisComConflito.size}
                {imoveisComConflito.size === 1 ? "imóvel" : "imóveis"} nesta semana
            </strong>
            <p>
                Há noites ocupadas por duas reservas ao mesmo tempo (Átrios e
                outro canal, ou Airbnb e Booking). O app não cancela nada
                sozinho: a equipe precisa resolver antes da chegada.
            </p>
        </div>
    {/if}

    {#if erro}
        <div class="erro-caixa">
            <p>{erro}</p>
            <button class="link" onclick={() => carregar(inicio)}
                >Tentar de novo</button
            >
        </div>
    {:else if !dados}
        <div class="carregando-wrapper">
            <Preloader />
            <p>Carregando o calendário...</p>
        </div>
    {:else if dados.imoveis.length === 0}
        <p class="vazio-texto">Nenhum imóvel cadastrado ainda.</p>
    {:else}
        <div class="quadro" class:recarregando={carregando}>
            <div class="dias">
                {#each dias as dia (dia)}
                    <div class="dia-topo" class:hoje={dia === hoje}>
                        <span class="dia-sem">{diaSemanaCurto(dia)}</span>
                        <span class="dia-num">{deISO(dia).getDate()}</span>
                    </div>
                {/each}
            </div>

            {#each dados.imoveis as i (i.id)}
                {@const lista = segmentos.get(i.id) ?? []}
                {@const apto = unidade(i.endereco)}
                {@const faixas = faixasDe(lista)}
                {@const temConflito = imoveisComConflito.has(i.id)}
                <div class="imovel" class:pausado={i.status !== "ativo"}>
                    <div class="imovel-topo">
                        <span class="imovel-nome"
                            >{i.nome}{apto ? ` · Apto ${apto}` : ""}</span
                        >
                        {#if temConflito}
                            <span class="selo-conflito">Conflito</span>
                        {:else}
                            <span class="imovel-sub">
                                {i.status !== "ativo"
                                    ? "Pausado · "
                                    : ""}{i.cidade}
                            </span>
                        {/if}
                    </div>

                    <div
                        class="faixa"
                        style="grid-template-rows: repeat({faixas}, 34px)"
                    >
                        {#each dias as dia, k (dia)}
                            <div
                                class="celula"
                                class:fds={ehFimDeSemana(dia)}
                                class:hoje={dia === hoje}
                                style="grid-column: {2 * k +
                                    1} / span 2; grid-row: 1 / span {faixas}"
                            ></div>
                        {/each}

                        {#each lista as s (s.chave)}
                            <button
                                class="bloco {s.bloqueio.origem}"
                                class:corte-esq={s.corteEsq}
                                class:corte-dir={s.corteDir}
                                class:conflito={s.conflito}
                                style="grid-column: {s.de} / {s.ate}; grid-row: {s.faixa +
                                    1}"
                                onclick={() =>
                                    (escolhido = {
                                        bloqueio: s.bloqueio,
                                        imovel: i,
                                        conflito: s.conflito,
                                    })}
                            >
                                {textoBloco(s.bloqueio)}
                            </button>
                        {/each}
                    </div>
                </div>
            {/each}

            <div class="livres">
                <p class="livres-titulo">Imóveis livres por noite</p>
                <div class="livres-grade">
                    {#each livresPorDia as n, k (k)}
                        <div
                            class="livre"
                            class:cheio={n === 0}
                            class:hoje={dias[k] === hoje}
                        >
                            {n}
                        </div>
                    {/each}
                </div>
            </div>
        </div>

        <div class="legenda">
            <span><i class="amostra atrios_reserva"></i> Reserva Átrios</span>
            <span><i class="amostra airbnb"></i> Airbnb / Booking</span>
            <span><i class="amostra manual"></i> Bloqueio manual</span>
            <span><i class="amostra conflito"></i> Conflito de datas</span>
        </div>

        <p class="nota">
            Cada barra vai do meio do dia da chegada ao meio do dia da saída.
            Duas barras que se encontram no meio do dia são uma virada. Zero em
            "livres" significa noite lotada. Barras uma sobre a outra, com
            contorno vermelho, são reservas duplas. Toque numa barra para ver os
            detalhes.
        </p>
    {/if}
</div>

{#if escolhido}
    {@const b = escolhido.bloqueio}
    {@const im = escolhido.imovel}
    {@const apto = unidade(im.endereco)}
    {@const noitesBloco = diferencaDias(b.data_inicio, b.data_fim)}
    {@const sit = situacao(b)}
    <div class="fundo" onclick={fechar} role="presentation">
        <div
            class="folha"
            onclick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Detalhes da ocupação"
            tabindex="-1"
            onkeydown={(e) => e.key === "Escape" && fechar()}
        >
            <div class="folha-topo">
                <h3>
                    {b.origem === "atrios_reserva"
                        ? (b.hospede_nome ?? "Reserva Átrios")
                        : rotuloOrigem(b.origem)}
                </h3>
                {#if sit}<span class="chip">{sit}</span>{/if}
            </div>

            {#if escolhido.conflito}
                <p class="aviso-conflito">
                    Este período se sobrepõe a outra reserva do mesmo imóvel.
                    Confira as barras vizinhas e resolva com o hóspede ou com o
                    canal.
                </p>
            {/if}

            <div class="detalhes">
                <div class="detalhe">
                    <span class="detalhe-rotulo">Imóvel</span>
                    <span class="detalhe-valor"
                        >{im.nome}{apto ? ` · Apto ${apto}` : ""}</span
                    >
                </div>
                <div class="detalhe">
                    <span class="detalhe-rotulo">Período</span>
                    <span class="detalhe-valor">
                        {formatarCurta(b.data_inicio)} → {formatarCurta(
                            b.data_fim,
                        )} · {noitesBloco}
                        {noitesBloco === 1 ? "noite" : "noites"}
                    </span>
                </div>
                {#if b.num_hospedes}
                    <div class="detalhe">
                        <span class="detalhe-rotulo">Hóspedes</span>
                        <span class="detalhe-valor">{b.num_hospedes}</span>
                    </div>
                {/if}
                <div class="detalhe">
                    <span class="detalhe-rotulo">Origem</span>
                    <span class="detalhe-valor">{rotuloOrigem(b.origem)}</span>
                </div>
            </div>

            <button class="botao-principal" onclick={() => verAnuncio(im.id)}
                >Ver anúncio</button
            >
            <button class="link centro" onclick={fechar}>Fechar</button>
        </div>
    </div>
{/if}

<style>
    .calendario {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        font-family: var(--fonte-corpo);
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

    .erro-caixa {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
        padding: 0.8rem 0.95rem;
        border-radius: var(--raio-sm);
        background-color: #f4dedb;
    }

    .erro-caixa p {
        margin: 0;
        font-size: 0.82rem;
        color: #b23a2f;
    }

    .alerta-conflito {
        padding: 0.85rem 1rem;
        border-radius: var(--raio-md);
        background-color: #f4dedb;
        border-left: 5px solid #b23a2f;
    }

    .alerta-conflito strong {
        font-size: 0.85rem;
        color: #b23a2f;
    }

    .alerta-conflito p {
        margin: 0.3rem 0 0;
        font-size: 0.75rem;
        line-height: 1.45;
        color: var(--cor-texto);
    }

    .vazio-texto {
        margin: 0;
        font-size: 0.85rem;
        color: var(--cor-texto);
        opacity: 0.65;
    }

    .link {
        padding: 0;
        border: none;
        background: none;
        font-family: var(--fonte-corpo);
        font-size: 0.78rem;
        font-weight: 700;
        color: var(--cor-texto);
        text-decoration: underline;
        cursor: pointer;
    }

    .link.centro {
        align-self: center;
    }

    /* Resumo */
    .resumo {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.6rem;
    }

    .resumo-card {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        padding: 0.9rem 0.95rem;
        background-color: var(--atrios-branco);
        border-radius: var(--raio-md);
        box-shadow: 0 2px 10px rgba(31, 42, 38, 0.06);
    }

    .resumo-valor {
        font-family: var(--fonte-titulo);
        font-size: 1.5rem;
        font-weight: 800;
        color: var(--cor-texto);
    }

    .resumo-rotulo {
        font-size: 0.72rem;
        color: var(--cor-texto);
        opacity: 0.65;
    }

    /* Navegação de semana */
    .nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.8rem;
    }

    .seta {
        width: 40px;
        height: 40px;
        flex-shrink: 0;
        border: none;
        border-radius: 50%;
        background-color: var(--atrios-branco);
        box-shadow: 0 2px 10px rgba(31, 42, 38, 0.08);
        color: var(--cor-texto);
        font-size: 1.3rem;
        line-height: 1;
        cursor: pointer;
    }

    .titulo {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.2rem;
        font-family: var(--fonte-titulo);
        font-weight: 700;
        font-size: 0.95rem;
        color: var(--cor-texto);
    }

    /* Quadro */
    .quadro {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 0.9rem 0.8rem 1rem;
        background-color: var(--atrios-branco);
        border-radius: var(--raio-lg);
        box-shadow: 0 4px 16px rgba(31, 42, 38, 0.08);
        transition: opacity 0.2s;
    }

    .quadro.recarregando {
        opacity: 0.55;
    }

    .dias {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
    }

    .dia-topo {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.05rem;
        margin: 0 2px;
        padding: 0.35rem 0;
        border-radius: 10px;
    }

    .dia-topo.hoje {
        background-color: var(--atrios-dourado);
    }

    .dia-sem {
        font-size: 0.62rem;
        font-weight: 600;
        color: var(--cor-texto);
        opacity: 0.6;
    }

    .dia-topo.hoje .dia-sem {
        opacity: 0.85;
    }

    .dia-num {
        font-family: var(--fonte-titulo);
        font-size: 0.9rem;
        font-weight: 800;
        color: var(--cor-texto);
    }

    /* Um imóvel */
    .imovel {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }

    .imovel.pausado {
        opacity: 0.5;
    }

    .imovel-topo {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 0.6rem;
        padding: 0 2px;
    }

    .imovel-nome {
        min-width: 0;
        font-size: 0.82rem;
        font-weight: 700;
        color: var(--cor-texto);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .imovel-sub {
        flex-shrink: 0;
        font-size: 0.68rem;
        color: var(--cor-texto);
        opacity: 0.6;
    }

    .selo-conflito {
        flex-shrink: 0;
        padding: 0.15rem 0.6rem;
        border-radius: var(--raio-pill);
        background-color: #b23a2f;
        color: #fff;
        font-size: 0.64rem;
        font-weight: 800;
    }

    /* Faixa da semana: 14 colunas (2 por dia) para as barras começarem e terminarem no meio do dia.
       As linhas são definidas por imóvel: mais de uma quando há barras sobrepostas. */
    .faixa {
        display: grid;
        grid-template-columns: repeat(14, 1fr);
        row-gap: 4px;
    }

    .celula {
        margin: 0 2px;
        border-radius: 9px;
        background-color: var(--atrios-creme);
    }

    .celula.fds {
        background-color: #ece5d8;
    }

    .celula.hoje {
        box-shadow: inset 0 0 0 1.5px var(--atrios-dourado);
    }

    .bloco {
        z-index: 1;
        min-width: 0;
        margin: 0 1px;
        padding: 0 0.55rem;
        border: none;
        border-radius: var(--raio-pill);
        font-family: var(--fonte-corpo);
        font-size: 0.68rem;
        font-weight: 700;
        text-align: left;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        cursor: pointer;
    }

    .bloco.corte-esq {
        border-top-left-radius: 4px;
        border-bottom-left-radius: 4px;
    }

    .bloco.corte-dir {
        border-top-right-radius: 4px;
        border-bottom-right-radius: 4px;
    }

    .bloco.conflito {
        outline: 2px solid #b23a2f;
        outline-offset: -2px;
    }

    .bloco.atrios_reserva {
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
    }

    .bloco.airbnb,
    .bloco.booking {
        background-color: var(--atrios-verde-escuro);
        color: var(--atrios-creme);
    }

    .bloco.manual {
        background-color: #b9b1a3;
        color: var(--atrios-verde-escuro);
    }

    /* Livres por noite */
    .livres {
        padding-top: 0.9rem;
        border-top: 1px solid var(--atrios-creme);
    }

    .livres-titulo {
        margin: 0 0 0.5rem;
        padding: 0 2px;
        font-size: 0.72rem;
        font-weight: 600;
        color: var(--cor-texto);
        opacity: 0.7;
    }

    .livres-grade {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
    }

    .livre {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 32px;
        margin: 0 2px;
        border-radius: 9px;
        background-color: rgba(201, 169, 107, 0.22);
        font-family: var(--fonte-titulo);
        font-size: 0.85rem;
        font-weight: 800;
        color: var(--cor-texto);
    }

    .livre.cheio {
        background-color: var(--atrios-verde-escuro);
        color: var(--atrios-creme);
    }

    .livre.hoje {
        box-shadow: inset 0 0 0 1.5px var(--atrios-dourado);
    }

    /* Legenda e nota */
    .legenda {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem 1rem;
        font-size: 0.72rem;
        color: var(--cor-texto);
    }

    .legenda span {
        display: flex;
        align-items: center;
        gap: 0.35rem;
    }

    .amostra {
        display: inline-block;
        width: 14px;
        height: 14px;
        border-radius: 4px;
    }

    .amostra.atrios_reserva {
        background-color: var(--atrios-dourado);
    }

    .amostra.airbnb {
        background-color: var(--atrios-verde-escuro);
    }

    .amostra.manual {
        background-color: #b9b1a3;
    }

    .amostra.conflito {
        background-color: var(--atrios-branco);
        outline: 2px solid #b23a2f;
        outline-offset: -2px;
    }

    .nota {
        margin: 0;
        font-size: 0.72rem;
        line-height: 1.5;
        color: var(--cor-texto);
        opacity: 0.6;
        text-align: center;
    }

    /* Detalhes (folha inferior) */
    .fundo {
        position: fixed;
        inset: 0;
        z-index: 70;
        display: flex;
        align-items: flex-end;
        background-color: rgba(31, 42, 38, 0.45);
    }

    .folha {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
        padding: 1.6rem 1.4rem calc(env(safe-area-inset-bottom, 0px) + 1.6rem);
        background-color: var(--atrios-branco);
        border-radius: var(--raio-lg) var(--raio-lg) 0 0;
        font-family: var(--fonte-corpo);
    }

    .folha-topo {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.8rem;
    }

    .folha-topo h3 {
        margin: 0;
        font-size: 1.1rem;
        color: var(--cor-texto);
    }

    .chip {
        flex-shrink: 0;
        padding: 0.25rem 0.7rem;
        border-radius: var(--raio-pill);
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        font-size: 0.68rem;
        font-weight: 700;
    }

    .aviso-conflito {
        margin: 0;
        padding: 0.7rem 0.9rem;
        border-radius: var(--raio-sm);
        background-color: #f4dedb;
        font-size: 0.78rem;
        line-height: 1.45;
        color: #b23a2f;
    }

    .detalhes {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding: 1rem;
        border-radius: var(--raio-md);
        background-color: var(--atrios-creme);
    }

    .detalhe {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
    }

    .detalhe-rotulo {
        font-size: 0.68rem;
        color: var(--cor-texto);
        opacity: 0.6;
        text-transform: uppercase;
        letter-spacing: 0.03em;
    }

    .detalhe-valor {
        font-size: 0.9rem;
        font-weight: 500;
        color: var(--cor-texto);
    }

    .botao-principal {
        width: 100%;
        padding: 0.85rem;
        border: none;
        border-radius: var(--raio-pill);
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        font-family: var(--fonte-corpo);
        font-weight: 600;
        font-size: 0.9rem;
        cursor: pointer;
    }
</style>
