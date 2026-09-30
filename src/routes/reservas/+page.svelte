<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { api } from "$lib/api/client";
    import {
        diferencaDias,
        formatarCurta,
        formatarReais,
        hojeISO,
    } from "$lib/datas";
    import Preloader from "$lib/components/Preloader.svelte";
    import "../../lib/styles/theme.css";

    interface ReservaDetalhada {
        id: string;
        imovel_id: string;
        data_checkin: string;
        data_checkout: string;
        num_hospedes: number;
        valor_total: number;
        status: string;
        expira_em: string | null;
        motivo_cancelamento: string | null;
        pago: boolean;
        reembolsada: boolean;
        imovel_nome: string;
        imovel_cidade: string;
        imovel_foto: string | null;
    }

    type Aba = "proximas" | "anteriores";
    type Tom = "ativa" | "neutra" | "cancelada" | "aguardando";

    const hoje = hojeISO();

    let reservas = $state<ReservaDetalhada[]>([]);
    let carregando = $state(true);
    let erro = $state("");
    let aba = $state<Aba>("proximas");

    let paraCancelar = $state<ReservaDetalhada | null>(null);
    let cancelando = $state(false);
    let erroCancelamento = $state("");

    function segundosRestantes(r: ReservaDetalhada): number {
        if (!r.expira_em) return 0;
        const fim = new Date(r.expira_em.replace(" ", "T") + "Z").getTime();
        return Math.floor((fim - Date.now()) / 1000);
    }

    function aguardandoPagamento(r: ReservaDetalhada): boolean {
        return (
            r.status === "pendente" && !!r.expira_em && segundosRestantes(r) > 0
        );
    }

    function ehProxima(r: ReservaDetalhada): boolean {
        return r.status !== "cancelada" && r.data_checkout >= hoje;
    }

    let proximas = $derived(
        reservas
            .filter(ehProxima)
            .sort((a, b) => a.data_checkin.localeCompare(b.data_checkin)),
    );

    let anteriores = $derived(
        reservas
            .filter((r) => !ehProxima(r))
            .sort((a, b) => b.data_checkin.localeCompare(a.data_checkin)),
    );

    let lista = $derived(aba === "proximas" ? proximas : anteriores);

    function situacao(r: ReservaDetalhada): { rotulo: string; tom: Tom } {
        if (r.status === "cancelada") {
            return {
                rotulo:
                    r.motivo_cancelamento === "expirada"
                        ? "Expirada"
                        : "Cancelada",
                tom: "cancelada",
            };
        }
        if (aguardandoPagamento(r))
            return { rotulo: "Aguardando pagamento", tom: "aguardando" };
        if (r.data_checkout < hoje)
            return { rotulo: "Concluída", tom: "neutra" };
        if (r.data_checkin <= hoje)
            return { rotulo: "Em andamento", tom: "ativa" };
        if (r.status === "pendente")
            return { rotulo: "Pendente", tom: "neutra" };
        return { rotulo: "Confirmada", tom: "ativa" };
    }

    function podeCancelar(r: ReservaDetalhada): boolean {
        return (
            (r.status === "confirmada" || r.status === "pendente") &&
            r.data_checkin > hoje
        );
    }

    function foto(r: ReservaDetalhada): string {
        return r.imovel_foto || "/atrios-simbolo.png";
    }

    async function carregar() {
        try {
            reservas = await api<ReservaDetalhada[]>("/reservas", {
                autenticado: true,
            });
            erro = "";
        } catch (e) {
            erro =
                e instanceof Error
                    ? e.message
                    : "Erro ao carregar suas reservas";
        } finally {
            carregando = false;
        }
    }

    onMount(carregar);

    function abrirImovel(id: string) {
        goto(`/imovel/${id}`);
    }

    function irParaPagamento(r: ReservaDetalhada) {
        goto(`/reservas/${r.id}/pagamento`);
    }

    function pedirCancelamento(r: ReservaDetalhada) {
        erroCancelamento = "";
        paraCancelar = r;
    }

    function fecharConfirmacao() {
        if (!cancelando) paraCancelar = null;
    }

    async function confirmarCancelamento() {
        if (!paraCancelar) return;

        cancelando = true;
        erroCancelamento = "";

        try {
            await api(`/reservas/${paraCancelar.id}/cancelar`, {
                method: "POST",
                autenticado: true,
            });
            paraCancelar = null;
            await carregar();
        } catch (e) {
            erroCancelamento =
                e instanceof Error
                    ? e.message
                    : "Não foi possível cancelar a reserva";
        } finally {
            cancelando = false;
        }
    }
</script>

<main>
    <header>
        <h1>Minhas reservas</h1>
        <p>Acompanhe suas estadias na Átrios</p>
    </header>

    <div class="abas">
        <button
            class="aba"
            class:ativa={aba === "proximas"}
            onclick={() => (aba = "proximas")}
        >
            Próximas ({proximas.length})
        </button>
        <button
            class="aba"
            class:ativa={aba === "anteriores"}
            onclick={() => (aba = "anteriores")}
        >
            Anteriores ({anteriores.length})
        </button>
    </div>

    {#if carregando}
        <div class="carregando-wrapper">
            <Preloader />
            <p>Carregando suas reservas...</p>
        </div>
    {:else if erro}
        <p class="estado erro">{erro}</p>
    {:else if lista.length === 0}
        <div class="vazio">
            <img src="/atrios-simbolo.png" alt="" class="vazio-icone" />
            <h2>
                {aba === "proximas"
                    ? "Nenhuma estadia à vista"
                    : "Nada por aqui ainda"}
            </h2>
            <p>
                {aba === "proximas"
                    ? "Que tal planejar a próxima viagem? Escolha um imóvel e reserve em poucos toques."
                    : "As estadias que você concluir ou cancelar aparecem aqui."}
            </p>
            {#if aba === "proximas"}
                <button class="botao-principal" onclick={() => goto("/home")}>
                    Explorar imóveis
                </button>
            {/if}
        </div>
    {:else}
        <div class="lista">
            {#each lista as r (r.id)}
                {@const sit = situacao(r)}
                {@const noites = diferencaDias(r.data_checkin, r.data_checkout)}
                <article class="card" class:cancelada={sit.tom === "cancelada"}>
                    <button
                        class="conteudo-card"
                        onclick={() => abrirImovel(r.imovel_id)}
                    >
                        <img class="foto" src={foto(r)} alt={r.imovel_nome} />
                        <div class="info">
                            <div class="linha-topo">
                                <h3>{r.imovel_nome}</h3>
                                <span class="chip {sit.tom}">{sit.rotulo}</span>
                            </div>
                            <p class="cidade">{r.imovel_cidade}</p>
                            <p class="datas">
                                {formatarCurta(r.data_checkin)} → {formatarCurta(
                                    r.data_checkout,
                                )}
                                · {noites}
                                {noites === 1 ? "noite" : "noites"}
                            </p>
                            <p class="detalhe">
                                {r.num_hospedes}
                                {r.num_hospedes === 1 ? "hóspede" : "hóspedes"} ·
                                <strong>{formatarReais(r.valor_total)}</strong>
                            </p>
                            {#if r.status === "cancelada" && r.reembolsada}
                                <p class="reembolso">
                                    Reembolso solicitado ao seu cartão
                                </p>
                            {/if}
                        </div>
                    </button>

                    {#if aguardandoPagamento(r) || podeCancelar(r)}
                        <div class="rodape-card">
                            {#if aguardandoPagamento(r)}
                                <button
                                    class="pagar"
                                    onclick={() => irParaPagamento(r)}
                                >
                                    Pagar agora
                                </button>
                            {/if}
                            {#if podeCancelar(r)}
                                <button
                                    class="cancelar"
                                    onclick={() => pedirCancelamento(r)}
                                >
                                    Cancelar reserva
                                </button>
                            {/if}
                        </div>
                    {/if}
                </article>
            {/each}
        </div>
    {/if}
</main>

{#if paraCancelar}
    <div class="fundo" onclick={fecharConfirmacao} role="presentation">
        <div
            class="folha"
            onclick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Cancelar reserva"
            tabindex="-1"
            onkeydown={(e) => e.key === "Escape" && fecharConfirmacao()}
        >
            <h2>Cancelar esta reserva?</h2>
            <p>
                {paraCancelar.imovel_nome}, de {formatarCurta(
                    paraCancelar.data_checkin,
                )} a
                {formatarCurta(paraCancelar.data_checkout)}. As datas voltam a
                ficar disponíveis para outros hóspedes.
                {#if paraCancelar.pago}
                    O valor de {formatarReais(paraCancelar.valor_total)} será reembolsado
                    no seu cartão. O prazo para aparecer na fatura depende do banco.
                {/if}
            </p>

            {#if erroCancelamento}
                <p class="erro">{erroCancelamento}</p>
            {/if}

            <button
                class="botao-principal"
                onclick={fecharConfirmacao}
                disabled={cancelando}
            >
                Manter reserva
            </button>
            <button
                class="confirmar-cancelamento"
                onclick={confirmarCancelamento}
                disabled={cancelando}
            >
                {cancelando ? "Cancelando..." : "Sim, cancelar"}
            </button>
        </div>
    </div>
{/if}

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

    .abas {
        display: flex;
        gap: 0.25rem;
        padding: 0.25rem;
        margin-bottom: 1.25rem;
        background-color: var(--atrios-branco);
        border-radius: var(--raio-pill);
        box-shadow: 0 2px 10px rgba(31, 42, 38, 0.08);
    }

    .aba {
        flex: 1;
        padding: 0.65rem 0.5rem;
        border: none;
        border-radius: var(--raio-pill);
        background: none;
        font-family: var(--fonte-corpo);
        font-size: 0.8rem;
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

    .estado {
        font-size: 0.85rem;
        color: var(--cor-texto);
    }

    .estado.erro,
    .erro {
        color: #b23a2f;
        font-size: 0.82rem;
        margin: 0;
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
        font-size: 1.05rem;
        color: var(--cor-texto);
        margin: 0;
    }

    .vazio p {
        margin: 0 0 0.8rem;
        max-width: 280px;
        font-size: 0.85rem;
        line-height: 1.45;
        color: var(--cor-texto);
        opacity: 0.65;
    }

    .lista {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .card {
        background-color: var(--atrios-branco);
        border-radius: var(--raio-lg);
        box-shadow: 0 4px 16px rgba(31, 42, 38, 0.08);
        overflow: hidden;
    }

    .conteudo-card {
        width: 100%;
        display: flex;
        gap: 0.9rem;
        padding: 0.9rem;
        border: none;
        background: none;
        text-align: left;
        font-family: var(--fonte-corpo);
        cursor: pointer;
    }

    .foto {
        width: 92px;
        height: 92px;
        flex-shrink: 0;
        border-radius: var(--raio-md);
        object-fit: cover;
        background-color: var(--atrios-creme);
    }

    .card.cancelada .foto {
        filter: grayscale(1);
        opacity: 0.6;
    }

    .info {
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
        font-size: 0.92rem;
        color: var(--cor-texto);
        margin: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
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

    .chip.aguardando {
        background-color: rgba(201, 169, 107, 0.3);
        color: var(--cor-texto);
    }

    .chip.cancelada {
        background-color: #f4dedb;
        color: #b23a2f;
    }

    .cidade {
        margin: 0.15rem 0 0.5rem;
        font-size: 0.75rem;
        color: var(--cor-texto);
        opacity: 0.65;
    }

    .datas {
        margin: 0 0 0.2rem;
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--cor-texto);
    }

    .detalhe {
        margin: 0;
        font-size: 0.75rem;
        color: var(--cor-texto);
        opacity: 0.75;
    }

    .reembolso {
        margin: 0.35rem 0 0;
        font-size: 0.72rem;
        color: var(--cor-texto);
        opacity: 0.7;
    }

    .rodape-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.8rem;
        padding: 0.7rem 0.9rem;
        border-top: 1px solid var(--atrios-creme);
    }

    .pagar {
        padding: 0.5rem 1.2rem;
        border: none;
        border-radius: var(--raio-pill);
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        font-family: var(--fonte-corpo);
        font-size: 0.8rem;
        font-weight: 700;
        cursor: pointer;
    }

    .cancelar {
        border: none;
        background: none;
        padding: 0.2rem 0;
        font-family: var(--fonte-corpo);
        font-size: 0.78rem;
        font-weight: 600;
        color: #b23a2f;
        cursor: pointer;
    }

    .botao-principal {
        width: 100%;
        padding: 0.85rem;
        border: none;
        border-radius: var(--raio-pill);
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        font-weight: 600;
        font-size: 0.9rem;
        cursor: pointer;
    }

    .vazio .botao-principal {
        max-width: 240px;
    }

    .botao-principal:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .fundo {
        position: fixed;
        inset: 0;
        background-color: rgba(31, 42, 38, 0.45);
        display: flex;
        align-items: flex-end;
        z-index: 70;
    }

    .folha {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 0.7rem;
        padding: 1.6rem 1.4rem 1.6rem;
        background-color: var(--atrios-branco);
        border-radius: var(--raio-lg) var(--raio-lg) 0 0;
        font-family: var(--fonte-corpo);
    }

    .folha h2 {
        font-size: 1.1rem;
        color: var(--cor-texto);
        margin: 0;
    }

    .folha p {
        margin: 0 0 0.5rem;
        font-size: 0.85rem;
        line-height: 1.5;
        color: var(--cor-texto);
        opacity: 0.75;
    }

    .folha .erro {
        opacity: 1;
        margin: 0;
    }

    .confirmar-cancelamento {
        padding: 0.85rem;
        border: none;
        border-radius: var(--raio-pill);
        background-color: #f4dedb;
        color: #b23a2f;
        font-weight: 600;
        font-size: 0.9rem;
        cursor: pointer;
    }

    .confirmar-cancelamento:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    /* ===== Desktop: centralizado, cards em grade, folha de confirmação vira modal central ===== */
    @media (min-width: 960px) {
        main {
            max-width: 900px;
            margin: 0 auto;
        }

        .lista {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1.25rem;
        }

        .fundo {
            align-items: center;
            justify-content: center;
        }

        .folha {
            width: 100%;
            max-width: 420px;
            border-radius: var(--raio-lg);
        }
    }
</style>
