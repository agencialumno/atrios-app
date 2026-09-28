<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { api } from "$lib/api/client";
    import { abrirLinkExterno } from "$lib/externo";
    import { diferencaDias, formatarCurta, formatarReais } from "$lib/datas";
    import Preloader from "$lib/components/Preloader.svelte";
    import "../../../../lib/styles/theme.css";

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
    }

    let reserva = $state<ReservaDetalhada | null>(null);
    let carregando = $state(true);
    let erro = $state("");
    let erroAcao = $state("");
    let abrindo = $state(false);
    let verificando = $state(false);
    let confirmandoCancelamento = $state(false);
    let cancelando = $state(false);
    let agora = $state(Date.now());

    let idReserva = $derived($page.params.id);

    let restante = $derived(
        reserva?.expira_em
            ? Math.floor((paraMs(reserva.expira_em) - agora) / 1000)
            : 0,
    );
    let noites = $derived(
        reserva
            ? diferencaDias(reserva.data_checkin, reserva.data_checkout)
            : 0,
    );

    let consultando = false;

    function paraMs(carimbo: string): number {
        return new Date(carimbo.replace(" ", "T") + "Z").getTime();
    }

    function formatarRelogio(segundos: number): string {
        const total = Math.max(0, segundos);
        const minutos = Math.floor(total / 60);
        const resto = total % 60;
        return `${String(minutos).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
    }

    async function carregar(silencioso = false) {
        if (consultando) return;
        consultando = true;

        try {
            reserva = await api<ReservaDetalhada>(`/reservas/${idReserva}`, {
                autenticado: true,
            });
            erro = "";
        } catch (e) {
            if (!silencioso || !reserva) {
                erro =
                    e instanceof Error
                        ? e.message
                        : "Erro ao carregar a reserva";
            }
        } finally {
            consultando = false;
            carregando = false;
        }
    }

    onMount(() => {
        carregar();

        // Relógio da contagem regressiva
        const relogio = setInterval(() => {
            agora = Date.now();
        }, 1000);

        // Enquanto aguarda o pagamento, confere a reserva de tempos em tempos
        const consulta = setInterval(() => {
            if (reserva?.status === "pendente") carregar(true);
        }, 3000);

        // Ao voltar do navegador para o app, confere na hora
        const aoVoltar = () => {
            if (document.visibilityState === "visible") carregar(true);
        };
        document.addEventListener("visibilitychange", aoVoltar);

        return () => {
            clearInterval(relogio);
            clearInterval(consulta);
            document.removeEventListener("visibilitychange", aoVoltar);
        };
    });

    async function pagar() {
        abrindo = true;
        erroAcao = "";

        try {
            const resposta = await api<{
                status: string;
                checkout_url: string | null;
            }>(`/reservas/${idReserva}/pagar`, {
                method: "POST",
                autenticado: true,
            });

            if (resposta.checkout_url) {
                await abrirLinkExterno(resposta.checkout_url);
            } else {
                await carregar(true);
            }
        } catch (e) {
            erroAcao =
                e instanceof Error
                    ? e.message
                    : "Não foi possível abrir o pagamento";
            await carregar(true);
        } finally {
            abrindo = false;
        }
    }

    async function verificar() {
        verificando = true;
        erroAcao = "";
        await carregar(true);
        verificando = false;
    }

    async function cancelar() {
        cancelando = true;
        erroAcao = "";

        try {
            await api(`/reservas/${idReserva}/cancelar`, {
                method: "POST",
                autenticado: true,
            });
            confirmandoCancelamento = false;
            await carregar(true);
        } catch (e) {
            erroAcao =
                e instanceof Error ? e.message : "Não foi possível cancelar";
        } finally {
            cancelando = false;
        }
    }
</script>

<main>
    {#if carregando}
        <div class="carregando-wrapper">
            <Preloader />
            <p>Carregando sua reserva...</p>
        </div>
    {:else if erro || !reserva}
        <div class="topo">
            <a href="/reservas" class="voltar">←</a>
        </div>
        <p class="estado-erro">{erro || "Reserva não encontrada."}</p>
    {:else if reserva.status === "confirmada" || reserva.status === "concluida"}
        <div class="centro">
            <div class="marca">✓</div>
            <h1>Reserva confirmada!</h1>
            <p class="ajuda">
                Pagamento recebido. Sua estadia está garantida e a Átrios já foi
                avisada.
            </p>

            <div class="resumo">
                <div class="item">
                    <span class="rotulo">Imóvel</span>
                    <span class="valor">{reserva.imovel_nome}</span>
                </div>
                <div class="item">
                    <span class="rotulo">Período</span>
                    <span class="valor">
                        {formatarCurta(reserva.data_checkin)} a {formatarCurta(
                            reserva.data_checkout,
                        )} · {noites}
                        {noites === 1 ? "noite" : "noites"}
                    </span>
                </div>
                <div class="item">
                    <span class="rotulo">Hóspedes</span>
                    <span class="valor">{reserva.num_hospedes}</span>
                </div>
                <div class="item">
                    <span class="rotulo">Total pago</span>
                    <span class="valor"
                        >{formatarReais(reserva.valor_total)}</span
                    >
                </div>
            </div>

            <button class="botao-principal" onclick={() => goto("/reservas")}
                >Ver minhas reservas</button
            >
            <button class="link" onclick={() => goto("/home")}
                >Voltar ao início</button
            >
        </div>
    {:else if reserva.status === "pendente"}
        <div class="topo">
            <a href="/reservas" class="voltar">←</a>
            <h1 class="titulo-topo">Pagamento</h1>
        </div>

        <div class="conteudo">
            <section class="cartao aviso">
                <p class="aviso-titulo">Finalize o pagamento</p>
                <p class="aviso-texto">
                    {#if restante > 0}
                        Reservamos as datas para você por
                        <strong class="relogio"
                            >{formatarRelogio(restante)}</strong
                        >.
                    {:else}
                        O prazo está acabando. Confirmando com o pagamento...
                    {/if}
                </p>
            </section>

            <section class="cartao">
                <div class="item">
                    <span class="rotulo">Imóvel</span>
                    <span class="valor"
                        >{reserva.imovel_nome} · {reserva.imovel_cidade}</span
                    >
                </div>
                <div class="item">
                    <span class="rotulo">Período</span>
                    <span class="valor">
                        {formatarCurta(reserva.data_checkin)} a {formatarCurta(
                            reserva.data_checkout,
                        )} · {noites}
                        {noites === 1 ? "noite" : "noites"}
                    </span>
                </div>
                <div class="item">
                    <span class="rotulo">Hóspedes</span>
                    <span class="valor">{reserva.num_hospedes}</span>
                </div>
                <div class="item total">
                    <span class="rotulo">Total</span>
                    <span class="valor grande"
                        >{formatarReais(reserva.valor_total)}</span
                    >
                </div>
            </section>

            {#if erroAcao}
                <p class="erro">{erroAcao}</p>
            {/if}

            <p class="nota">
                O pagamento é feito em uma página segura do Stripe, que abre no
                navegador do celular. Depois de pagar, volte ao app: a
                confirmação aparece sozinha.
            </p>
        </div>

        <div class="rodape">
            <button
                class="botao-principal cheio"
                onclick={pagar}
                disabled={abrindo || cancelando}
            >
                {abrindo ? "Abrindo..." : "Pagar agora"}
            </button>
            <button
                class="botao-secundario"
                onclick={verificar}
                disabled={verificando || cancelando}
            >
                {verificando ? "Conferindo..." : "Já paguei, atualizar"}
            </button>

            {#if confirmandoCancelamento}
                <div class="confirmar-cancelamento">
                    <p>
                        Cancelar esta reserva? As datas voltam a ficar livres.
                    </p>
                    <div class="linha-botoes">
                        <button
                            class="botao-secundario"
                            onclick={() => (confirmandoCancelamento = false)}
                            disabled={cancelando}
                        >
                            Manter
                        </button>
                        <button
                            class="botao-perigo"
                            onclick={cancelar}
                            disabled={cancelando}
                        >
                            {cancelando ? "Cancelando..." : "Sim, cancelar"}
                        </button>
                    </div>
                </div>
            {:else}
                <button
                    class="link perigo"
                    onclick={() => (confirmandoCancelamento = true)}
                >
                    Cancelar reserva
                </button>
            {/if}
        </div>
    {:else}
        <div class="centro">
            <div class="marca alerta">!</div>
            <h1>
                {reserva.motivo_cancelamento === "expirada"
                    ? "O prazo do pagamento acabou"
                    : "Reserva cancelada"}
            </h1>
            <p class="ajuda">
                {#if reserva.motivo_cancelamento === "expirada"}
                    Nenhuma cobrança foi feita e as datas voltaram a ficar
                    livres. Você pode escolher as datas de novo.
                {:else if reserva.reembolsada}
                    O valor de {formatarReais(reserva.valor_total)} será reembolsado
                    no seu cartão. O prazo para aparecer na fatura depende do banco.
                {:else}
                    Esta reserva foi cancelada e as datas voltaram a ficar
                    livres.
                {/if}
            </p>

            <button
                class="botao-principal"
                onclick={() => goto(`/imovel/${reserva?.imovel_id}/reservar`)}
            >
                Escolher as datas de novo
            </button>
            <button class="link" onclick={() => goto("/reservas")}
                >Ver minhas reservas</button
            >
        </div>
    {/if}
</main>

<style>
    main {
        min-height: 100dvh;
        background-color: var(--cor-fundo);
        font-family: var(--fonte-corpo);
        padding-bottom: calc(var(--altura-barra) + 260px);
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

    .titulo-topo {
        margin: 0;
        font-size: 1.15rem;
        color: var(--cor-texto);
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

    .estado-erro,
    .erro {
        margin: 0;
        padding: 1rem 1.25rem;
        font-size: 0.85rem;
        color: #b23a2f;
    }

    .erro {
        padding: 0;
        font-size: 0.82rem;
    }

    .conteudo {
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
        padding: 0.5rem 1.1rem 1rem;
    }

    .cartao {
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
        padding: 1.1rem;
        background-color: var(--atrios-branco);
        border-radius: var(--raio-lg);
        box-shadow: 0 4px 16px rgba(31, 42, 38, 0.08);
    }

    .cartao.aviso {
        gap: 0.35rem;
        border-left: 5px solid var(--atrios-dourado);
    }

    .aviso-titulo {
        margin: 0;
        font-family: var(--fonte-titulo);
        font-weight: 700;
        font-size: 1rem;
        color: var(--cor-texto);
    }

    .aviso-texto {
        margin: 0;
        font-size: 0.85rem;
        line-height: 1.45;
        color: var(--cor-texto);
        opacity: 0.8;
    }

    .relogio {
        font-family: var(--fonte-titulo);
        font-size: 1rem;
        color: var(--cor-texto);
        opacity: 1;
    }

    .item {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
    }

    .item.total {
        padding-top: 0.7rem;
        border-top: 1px solid var(--atrios-creme);
    }

    .rotulo {
        font-size: 0.7rem;
        color: var(--cor-texto);
        opacity: 0.6;
        text-transform: uppercase;
        letter-spacing: 0.03em;
    }

    .valor {
        font-size: 0.9rem;
        font-weight: 500;
        color: var(--cor-texto);
    }

    .valor.grande {
        font-family: var(--fonte-titulo);
        font-size: 1.15rem;
        font-weight: 800;
    }

    .nota {
        margin: 0;
        font-size: 0.75rem;
        line-height: 1.5;
        color: var(--cor-texto);
        opacity: 0.6;
        text-align: center;
    }

    /* Rodapé com as ações, acima da barra de navegação */
    .rodape {
        position: fixed;
        left: 0;
        right: 0;
        bottom: var(--altura-nav);
        z-index: 40;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 0.9rem 1.1rem 0.9rem;
        background-color: var(--atrios-branco);
        border-radius: var(--raio-lg) var(--raio-lg) 0 0;
        box-shadow: 0 -4px 16px rgba(31, 42, 38, 0.1);
    }

    .botao-principal,
    .botao-secundario,
    .botao-perigo {
        padding: 0.85rem;
        border-radius: var(--raio-pill);
        font-family: var(--fonte-corpo);
        font-weight: 600;
        font-size: 0.9rem;
        cursor: pointer;
    }

    .botao-principal {
        border: none;
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
    }

    .botao-principal.cheio {
        width: 100%;
    }

    .botao-secundario {
        width: 100%;
        border: 1.5px solid var(--atrios-dourado);
        background: none;
        color: var(--cor-texto);
    }

    .botao-perigo {
        width: 100%;
        border: none;
        background-color: #f4dedb;
        color: #b23a2f;
    }

    .botao-principal:disabled,
    .botao-secundario:disabled,
    .botao-perigo:disabled {
        opacity: 0.55;
        cursor: not-allowed;
    }

    .link {
        align-self: center;
        padding: 0.2rem 0;
        border: none;
        background: none;
        font-family: var(--fonte-corpo);
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--cor-texto);
        text-decoration: underline;
        cursor: pointer;
    }

    .link.perigo {
        color: #b23a2f;
    }

    .confirmar-cancelamento {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .confirmar-cancelamento p {
        margin: 0;
        font-size: 0.78rem;
        text-align: center;
        color: var(--cor-texto);
        opacity: 0.8;
    }

    .linha-botoes {
        display: flex;
        gap: 0.5rem;
    }

    /* Telas de resultado */
    .centro {
        min-height: 80vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        padding: 2rem 1.5rem;
        text-align: center;
    }

    .centro h1 {
        margin: 0;
        font-size: 1.3rem;
        color: var(--cor-texto);
    }

    .centro .botao-principal {
        width: 100%;
        max-width: 280px;
        margin-top: 0.5rem;
    }

    .ajuda {
        margin: 0 0 0.5rem;
        max-width: 320px;
        font-size: 0.85rem;
        line-height: 1.45;
        color: var(--cor-texto);
        opacity: 0.7;
    }

    .marca {
        width: 64px;
        height: 64px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        font-size: 1.8rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
    }

    .marca.alerta {
        background-color: #f4dedb;
        color: #b23a2f;
    }

    .resumo {
        width: 100%;
        max-width: 320px;
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
        padding: 1.1rem;
        background-color: var(--atrios-branco);
        border-radius: var(--raio-md);
        box-shadow: 0 4px 16px rgba(31, 42, 38, 0.08);
        text-align: left;
    }
</style>
