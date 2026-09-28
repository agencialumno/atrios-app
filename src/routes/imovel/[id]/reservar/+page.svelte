<script lang="ts">
    import { page } from "$app/stores";
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { api } from "$lib/api/client";
    import { abrirLinkExterno } from "$lib/externo";
    import { diferencaDias, formatarCurta, formatarReais } from "$lib/datas";
    import Calendario from "$lib/components/Calendario.svelte";
    import Preloader from "$lib/components/Preloader.svelte";
    import "../../../../lib/styles/theme.css";

    interface Imovel {
        id: string;
        nome: string;
        cidade: string;
        capacidade_hospedes: number;
        preco_base_noite: number;
    }

    interface Bloqueio {
        data_inicio: string;
        data_fim: string;
    }

    interface Reserva {
        id: string;
        data_checkin: string;
        data_checkout: string;
        num_hospedes: number;
        valor_total: number;
    }

    interface RespostaReserva extends Reserva {
        checkout_url: string | null;
    }

    let imovel = $state<Imovel | null>(null);
    let bloqueios = $state<Bloqueio[]>([]);
    let carregando = $state(true);
    let erro = $state("");

    let checkin = $state<string | null>(null);
    let checkout = $state<string | null>(null);
    let hospedes = $state(1);

    let reservando = $state(false);
    let erroReserva = $state("");
    let reservaConcluida = $state<Reserva | null>(null);

    let idImovel = $derived($page.params.id);

    let noites = $derived(
        checkin && checkout ? diferencaDias(checkin, checkout) : 0,
    );
    let total = $derived(imovel ? noites * imovel.preco_base_noite : 0);
    let podeConfirmar = $derived(noites > 0 && !reservando);

    async function carregarCalendario() {
        bloqueios = await api<Bloqueio[]>(`/imoveis/${idImovel}/calendario`);
    }

    onMount(async () => {
        try {
            imovel = await api<Imovel>(`/imoveis/${idImovel}`);
            await carregarCalendario();
        } catch (e) {
            erro = e instanceof Error ? e.message : "Erro ao carregar o imóvel";
        } finally {
            carregando = false;
        }
    });

    function alterarHospedes(delta: number) {
        if (!imovel) return;
        const novo = hospedes + delta;
        if (novo >= 1 && novo <= imovel.capacidade_hospedes) {
            hospedes = novo;
        }
    }

    async function confirmar() {
        if (!imovel || !checkin || !checkout) return;

        erroReserva = "";
        reservando = true;

        try {
            const resposta = await api<RespostaReserva>("/reservas", {
                method: "POST",
                autenticado: true,
                body: {
                    imovel_id: imovel.id,
                    data_checkin: checkin,
                    data_checkout: checkout,
                    num_hospedes: hospedes,
                },
            });

            // Com pagamento online: abre a página do Stripe e acompanha a confirmação
            if (resposta.checkout_url) {
                await abrirLinkExterno(resposta.checkout_url);
                goto(`/reservas/${resposta.id}/pagamento`);
                return;
            }

            reservaConcluida = resposta;
        } catch (e) {
            erroReserva =
                e instanceof Error
                    ? e.message
                    : "Não foi possível concluir a reserva";
            // Se alguém reservou antes, atualiza o calendário e limpa a seleção
            if (erroReserva.includes("indisponível")) {
                await carregarCalendario().catch(() => {});
                checkin = null;
                checkout = null;
            }
        } finally {
            reservando = false;
        }
    }
</script>

<main>
    {#if carregando}
        <div class="carregando-wrapper">
            <Preloader />
            <p>Carregando disponibilidade...</p>
        </div>
    {:else if erro}
        <div class="topo">
            <a href="/home" class="voltar">←</a>
        </div>
        <p class="estado erro">{erro}</p>
    {:else if reservaConcluida && imovel}
        <div class="sucesso">
            <div class="check">✓</div>
            <h1>Reserva confirmada!</h1>
            <p class="ajuda">
                Sua estadia está garantida. A Átrios já foi avisada.
            </p>

            <div class="resumo">
                <div class="resumo-item">
                    <span class="resumo-label">Imóvel</span>
                    <span class="resumo-valor">{imovel.nome}</span>
                </div>
                <div class="resumo-item">
                    <span class="resumo-label">Período</span>
                    <span class="resumo-valor">
                        {formatarCurta(reservaConcluida.data_checkin)} a {formatarCurta(
                            reservaConcluida.data_checkout,
                        )}
                    </span>
                </div>
                <div class="resumo-item">
                    <span class="resumo-label">Hóspedes</span>
                    <span class="resumo-valor"
                        >{reservaConcluida.num_hospedes}</span
                    >
                </div>
                <div class="resumo-item">
                    <span class="resumo-label">Total</span>
                    <span class="resumo-valor"
                        >{formatarReais(reservaConcluida.valor_total)}</span
                    >
                </div>
            </div>

            <button class="botao-principal" onclick={() => goto("/home")}
                >Voltar ao início</button
            >
        </div>
    {:else if imovel}
        <div class="topo">
            <a href="/imovel/{imovel.id}" class="voltar">←</a>
            <h1>Escolha as datas</h1>
        </div>

        <div class="conteudo">
            <div class="cartao identificacao">
                <div>
                    <p class="nome-imovel">{imovel.nome}</p>
                    <p class="cidade-imovel">{imovel.cidade}</p>
                </div>
                <p class="preco-noite">
                    {formatarReais(imovel.preco_base_noite)} <span>/noite</span>
                </p>
            </div>

            <div class="cartao">
                <Calendario {bloqueios} bind:checkin bind:checkout />
            </div>

            <div class="cartao linha-hospedes">
                <div>
                    <p class="rotulo">Hóspedes</p>
                    <p class="detalhe">
                        Máximo de {imovel.capacidade_hospedes}
                    </p>
                </div>
                <div class="contador">
                    <button
                        onclick={() => alterarHospedes(-1)}
                        disabled={hospedes <= 1}
                        aria-label="Menos"
                    >
                        −
                    </button>
                    <span>{hospedes}</span>
                    <button
                        onclick={() => alterarHospedes(1)}
                        disabled={hospedes >= imovel.capacidade_hospedes}
                        aria-label="Mais"
                    >
                        +
                    </button>
                </div>
            </div>

            {#if noites > 0 && checkin && checkout}
                <div class="cartao resumo-valores">
                    <div class="linha-valor">
                        <span
                            >{formatarCurta(checkin)} → {formatarCurta(
                                checkout,
                            )}</span
                        >
                        <span>{noites} {noites === 1 ? "noite" : "noites"}</span
                        >
                    </div>
                    <div class="linha-valor">
                        <span
                            >{formatarReais(imovel.preco_base_noite)} × {noites}</span
                        >
                        <span>{formatarReais(total)}</span>
                    </div>
                </div>
            {/if}

            {#if erroReserva}
                <p class="erro">{erroReserva}</p>
            {/if}
        </div>

        <div class="rodape-fixo">
            <div class="total">
                <span class="total-valor"
                    >{noites > 0 ? formatarReais(total) : "—"}</span
                >
                <span class="total-legenda">
                    {noites > 0
                        ? `total por ${noites} ${noites === 1 ? "noite" : "noites"}`
                        : "escolha as datas"}
                </span>
            </div>
            <button
                class="botao-confirmar"
                onclick={confirmar}
                disabled={!podeConfirmar}
            >
                {reservando ? "Reservando..." : "Confirmar reserva"}
            </button>
        </div>
    {/if}
</main>

<style>
    main {
        min-height: 100dvh;
        background-color: var(--cor-fundo);
        font-family: var(--fonte-corpo);
        padding-bottom: 130px;
    }

    .carregando-wrapper {
        min-height: 60vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        color: var(--cor-texto);
        opacity: 0.75;
        font-size: 0.85rem;
    }

    .carregando-wrapper p {
        margin: 0;
    }

    .topo {
        display: flex;
        align-items: center;
        gap: 0.9rem;
        padding: 1.25rem 1.1rem 0.75rem;
    }

    .topo h1 {
        font-size: 1.15rem;
        color: var(--cor-texto);
        margin: 0;
    }

    .voltar {
        width: 38px;
        height: 38px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background-color: var(--atrios-branco);
        box-shadow: 0 2px 10px rgba(31, 42, 38, 0.08);
        color: var(--cor-texto);
        text-decoration: none;
        font-size: 1.05rem;
    }

    .estado {
        padding: 1rem 1.25rem;
        font-size: 0.85rem;
        color: var(--cor-texto);
    }

    .estado.erro,
    .erro {
        color: #b23a2f;
        font-size: 0.82rem;
        margin: 0;
    }

    .conteudo {
        padding: 0.5rem 1.1rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
    }

    .cartao {
        background-color: var(--atrios-branco);
        border-radius: var(--raio-lg);
        box-shadow: 0 4px 16px rgba(31, 42, 38, 0.08);
        padding: 1.1rem;
    }

    .identificacao {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
    }

    .nome-imovel {
        margin: 0 0 0.15rem;
        font-family: var(--fonte-titulo);
        font-weight: 700;
        font-size: 0.95rem;
        color: var(--cor-texto);
    }

    .cidade-imovel {
        margin: 0;
        font-size: 0.78rem;
        color: var(--cor-texto);
        opacity: 0.65;
    }

    .preco-noite {
        margin: 0;
        font-family: var(--fonte-titulo);
        font-weight: 700;
        font-size: 0.9rem;
        color: var(--atrios-dourado);
        white-space: nowrap;
    }

    .preco-noite span {
        font-family: var(--fonte-corpo);
        font-weight: 400;
        font-size: 0.7rem;
        color: var(--cor-texto);
        opacity: 0.6;
    }

    .linha-hospedes {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .rotulo {
        margin: 0 0 0.15rem;
        font-weight: 600;
        font-size: 0.9rem;
        color: var(--cor-texto);
    }

    .detalhe {
        margin: 0;
        font-size: 0.75rem;
        color: var(--cor-texto);
        opacity: 0.6;
    }

    .contador {
        display: flex;
        align-items: center;
        gap: 0.9rem;
    }

    .contador button {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        border: none;
        background-color: var(--atrios-creme);
        color: var(--cor-texto);
        font-size: 1.2rem;
        cursor: pointer;
    }

    .contador button:disabled {
        opacity: 0.35;
        cursor: not-allowed;
    }

    .contador span {
        min-width: 1.2rem;
        text-align: center;
        font-weight: 700;
        color: var(--cor-texto);
    }

    .resumo-valores {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
    }

    .linha-valor {
        display: flex;
        justify-content: space-between;
        font-size: 0.85rem;
        color: var(--cor-texto);
    }

    .linha-valor:first-child {
        opacity: 0.7;
    }

    .rodape-fixo {
        position: fixed;
        left: 0.75rem;
        right: 0.75rem;
        bottom: 0.75rem;
        background-color: var(--atrios-branco);
        border-radius: var(--raio-lg);
        box-shadow: 0 6px 24px rgba(31, 42, 38, 0.16);
        padding: 0.8rem 0.8rem 0.8rem 1.25rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        z-index: 40;
    }

    .total {
        display: flex;
        flex-direction: column;
    }

    .total-valor {
        font-family: var(--fonte-titulo);
        font-weight: 700;
        font-size: 1.1rem;
        color: var(--cor-texto);
    }

    .total-legenda {
        font-size: 0.7rem;
        color: var(--cor-texto);
        opacity: 0.6;
    }

    .botao-confirmar,
    .botao-principal {
        border: none;
        border-radius: var(--raio-pill);
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        font-weight: 600;
        font-size: 0.9rem;
        cursor: pointer;
    }

    .botao-confirmar {
        padding: 0.8rem 1.4rem;
    }

    .botao-principal {
        width: 100%;
        max-width: 280px;
        padding: 0.85rem;
        margin-top: 0.5rem;
    }

    .botao-confirmar:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }

    .sucesso {
        min-height: 100dvh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        padding: 2rem 1.5rem;
        text-align: center;
    }

    .sucesso h1 {
        font-size: 1.3rem;
        color: var(--cor-texto);
        margin: 0;
    }

    .ajuda {
        margin: 0 0 0.5rem;
        font-size: 0.85rem;
        color: var(--cor-texto);
        opacity: 0.65;
    }

    .check {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.8rem;
        margin-bottom: 0.5rem;
    }

    .resumo {
        width: 100%;
        max-width: 320px;
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
        background-color: var(--atrios-branco);
        border-radius: var(--raio-md);
        box-shadow: 0 4px 16px rgba(31, 42, 38, 0.08);
        padding: 1.1rem;
        text-align: left;
    }

    .resumo-item {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
    }

    .resumo-label {
        font-size: 0.72rem;
        color: var(--cor-texto);
        opacity: 0.6;
        text-transform: uppercase;
        letter-spacing: 0.03em;
    }

    .resumo-valor {
        font-size: 0.9rem;
        color: var(--cor-texto);
        font-weight: 500;
    }
</style>
