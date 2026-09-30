<script lang="ts">
    import {
        deISO,
        diferencaDias,
        hojeISO,
        paraISO,
        somarDias,
    } from "$lib/datas";

    interface Bloqueio {
        data_inicio: string;
        data_fim: string;
        origem?: string; // 'atrios_reserva' | 'airbnb' | 'booking'
    }

    let {
        bloqueios,
        checkin = $bindable(null),
        checkout = $bindable(null),
    }: {
        bloqueios: Bloqueio[];
        checkin?: string | null;
        checkout?: string | null;
    } = $props();

    const hoje = hojeISO();
    const dataHoje = deISO(hoje);

    let ano = $state(dataHoje.getFullYear());
    let mes = $state(dataHoje.getMonth());

    const diasSemana = ["D", "S", "T", "Q", "Q", "S", "S"];

    // Todas as noites ocupadas (o dia de saída de uma reserva NÃO conta como ocupado)
    let noitesOcupadas = $derived.by(() => {
        const conjunto = new Set<string>();
        for (const b of bloqueios) {
            let dia = b.data_inicio;
            while (dia < b.data_fim) {
                conjunto.add(dia);
                dia = somarDias(dia, 1);
            }
        }
        return conjunto;
    });

    // Qual origem ocupa cada noite (para colorir e sinalizar de onde veio o bloqueio)
    let origemPorDia = $derived.by(() => {
        const mapa = new Map<string, string>();
        for (const b of bloqueios) {
            const origem = b.origem ?? "atrios_reserva";
            let dia = b.data_inicio;
            while (dia < b.data_fim) {
                if (!mapa.has(dia)) mapa.set(dia, origem);
                dia = somarDias(dia, 1);
            }
        }
        return mapa;
    });

    // Quais origens aparecem neste conjunto de bloqueios (para montar a legenda só com o que existe)
    let origensPresentes = $derived.by(() => {
        const conjunto = new Set<string>();
        for (const origem of origemPorDia.values()) conjunto.add(origem);
        return conjunto;
    });

    function rotuloOrigem(origem: string): string {
        if (origem === "airbnb") return "Airbnb";
        if (origem === "booking") return "Booking";
        return "Reserva Átrios";
    }

    function classeOrigem(origem: string | undefined): string {
        if (origem === "airbnb") return "origem-airbnb";
        if (origem === "booking") return "origem-booking";
        return "origem-atrios";
    }

    let tituloMes = $derived(
        new Date(ano, mes, 1).toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric",
        }),
    );

    let podeVoltar = $derived(
        ano > dataHoje.getFullYear() ||
            (ano === dataHoje.getFullYear() && mes > dataHoje.getMonth()),
    );

    let celulas = $derived.by(() => {
        const vazios = new Date(ano, mes, 1).getDay();
        const total = new Date(ano, mes + 1, 0).getDate();
        const lista: (string | null)[] = Array(vazios).fill(null);
        for (let d = 1; d <= total; d++) {
            lista.push(paraISO(new Date(ano, mes, d)));
        }
        return lista;
    });

    function noiteLivre(iso: string): boolean {
        return !noitesOcupadas.has(iso);
    }

    function periodoLivre(inicio: string, fim: string): boolean {
        let dia = inicio;
        while (dia < fim) {
            if (noitesOcupadas.has(dia)) return false;
            dia = somarDias(dia, 1);
        }
        return true;
    }

    function fechaPeriodo(iso: string): boolean {
        return (
            !!checkin &&
            !checkout &&
            iso > checkin &&
            periodoLivre(checkin, iso)
        );
    }

    function clicavel(iso: string): boolean {
        if (iso < hoje) return false;
        return fechaPeriodo(iso) || noiteLivre(iso);
    }

    function selecionar(iso: string) {
        if (!clicavel(iso)) return;
        if (fechaPeriodo(iso)) {
            checkout = iso;
            return;
        }
        checkin = iso;
        checkout = null;
    }

    function mesAnterior() {
        if (!podeVoltar) return;
        if (mes === 0) {
            mes = 11;
            ano--;
        } else {
            mes--;
        }
    }

    function proximoMes() {
        if (mes === 11) {
            mes = 0;
            ano++;
        } else {
            mes++;
        }
    }

    function noPeriodo(iso: string): boolean {
        return !!checkin && !!checkout && iso > checkin && iso < checkout;
    }
</script>

<div class="calendario">
    <div class="cabecalho">
        <button
            class="seta"
            onclick={mesAnterior}
            disabled={!podeVoltar}
            aria-label="Mês anterior"
        >
            ‹
        </button>
        <span class="titulo">{tituloMes}</span>
        <button class="seta" onclick={proximoMes} aria-label="Próximo mês"
            >›</button
        >
    </div>

    <div class="grade semana">
        {#each diasSemana as d, i (i)}
            <span>{d}</span>
        {/each}
    </div>

    <div class="grade">
        {#each celulas as iso, i (i)}
            {#if iso}
                <button
                    class="dia"
                    class:indisponivel={!clicavel(iso)}
                    class:extremo={iso === checkin || iso === checkout}
                    class:periodo={noPeriodo(iso)}
                    class:hoje={iso === hoje}
                    class={!clicavel(iso) && origemPorDia.has(iso)
                        ? classeOrigem(origemPorDia.get(iso))
                        : ""}
                    disabled={!clicavel(iso)}
                    onclick={() => selecionar(iso)}
                    title={!clicavel(iso) && origemPorDia.has(iso)
                        ? rotuloOrigem(origemPorDia.get(iso) ?? "")
                        : undefined}
                >
                    {Number(iso.slice(8))}
                </button>
            {:else}
                <span></span>
            {/if}
        {/each}
    </div>

    {#if checkin && checkout}
        <p class="dica">
            {diferencaDias(checkin, checkout)}
            {diferencaDias(checkin, checkout) === 1
                ? "noite selecionada"
                : "noites selecionadas"}
        </p>
    {:else if checkin}
        <p class="dica">Agora toque no dia de saída.</p>
    {:else}
        <p class="dica">Toque no dia de entrada e depois no dia de saída.</p>
    {/if}

    {#if origensPresentes.size > 0}
        <div class="legenda">
            {#each [...origensPresentes] as origem (origem)}
                <span class="legenda-item">
                    <span class="legenda-bolinha {classeOrigem(origem)}"></span>
                    {rotuloOrigem(origem)}
                </span>
            {/each}
        </div>
    {/if}
</div>

<style>
    .calendario {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
        font-family: var(--fonte-corpo);
    }

    .cabecalho {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.3rem;
    }

    .titulo {
        font-family: var(--fonte-titulo);
        font-weight: 700;
        font-size: 0.95rem;
        text-transform: capitalize;
        color: var(--cor-texto);
    }

    .seta {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: none;
        background-color: var(--atrios-creme);
        color: var(--cor-texto);
        font-size: 1.2rem;
        line-height: 1;
        cursor: pointer;
    }

    .seta:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }

    .grade {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 4px 0;
    }

    .semana span {
        text-align: center;
        font-size: 0.7rem;
        font-weight: 600;
        color: var(--cor-texto);
        opacity: 0.5;
        padding-bottom: 0.2rem;
    }

    .dia {
        height: 40px;
        border: none;
        background: none;
        font-family: var(--fonte-corpo);
        font-size: 0.85rem;
        color: var(--cor-texto);
        cursor: pointer;
        border-radius: var(--raio-pill);
    }

    .dia.hoje {
        font-weight: 700;
        box-shadow: inset 0 0 0 1.5px var(--cor-borda);
    }

    .dia.periodo {
        background-color: rgba(201, 169, 107, 0.28);
        border-radius: 0;
    }

    .dia.extremo {
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        font-weight: 700;
    }

    .dia.indisponivel {
        opacity: 0.3;
        text-decoration: line-through;
        cursor: not-allowed;
    }

    .dica {
        margin: 0.4rem 0 0;
        text-align: center;
        font-size: 0.78rem;
        color: var(--cor-texto);
        opacity: 0.7;
    }

    .legenda {
        display: none; /* só aparece no desktop, definido abaixo */
    }

    .legenda-bolinha {
        display: inline-block;
        width: 9px;
        height: 9px;
        border-radius: 50%;
    }

    /* ===== Desktop: cores por origem + legenda visível ===== */
    @media (min-width: 960px) {
        .dia.indisponivel {
            opacity: 1;
            text-decoration: none;
            color: var(--atrios-branco);
            font-weight: 600;
        }

        .dia.indisponivel.origem-atrios {
            background-color: #8a8580;
        }

        .dia.indisponivel.origem-airbnb {
            background-color: #c2483a;
        }

        .dia.indisponivel.origem-booking {
            background-color: #1a3f73;
        }

        .legenda {
            display: flex;
            flex-wrap: wrap;
            gap: 0.9rem;
            margin-top: 0.3rem;
            padding-top: 0.6rem;
            border-top: 1px solid var(--cor-borda);
        }

        .legenda-item {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            font-size: 0.75rem;
            color: var(--cor-texto);
            opacity: 0.75;
        }

        .legenda-bolinha.origem-atrios {
            background-color: #8a8580;
        }

        .legenda-bolinha.origem-airbnb {
            background-color: #c2483a;
        }

        .legenda-bolinha.origem-booking {
            background-color: #1a3f73;
        }
    }
</style>
