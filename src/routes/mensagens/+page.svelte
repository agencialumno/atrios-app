<script lang="ts">
    import { onMount, tick } from "svelte";
    import { page } from "$app/stores";
    import { api } from "$lib/api/client";
    import { auth } from "$lib/stores/auth";
    import Avatar from "$lib/components/Avatar.svelte";
    import Preloader from "$lib/components/Preloader.svelte";
    import ModalErro from "$lib/components/ModalErro.svelte";
    import "../../lib/styles/theme.css";

    // "id" é a chave da conversa: id da reserva, "suporte", ou "suporte-<usuário>" (visão da equipe)
    interface Conversa {
        id: string;
        tipo: "reserva" | "suporte";
        imovel_nome: string | null;
        outro_id: string | null;
        outro_nome: string;
        outro_foto: string | null;
        ultima_mensagem: string | null;
        ultima_mensagem_em: string | null;
        ultima_mensagem_de: string | null;
        nao_lidas: number;
    }

    interface Mensagem {
        id: string;
        remetente_id: string;
        remetente_nome: string;
        remetente_foto: string | null;
        texto: string;
        criado_em: string;
        lida: boolean;
    }

    const INTERVALO_THREAD_MS = 4000;
    const INTERVALO_LISTA_MS = 15000;

    let conversas = $state<Conversa[]>([]);
    let carregandoLista = $state(true);
    let erro = $state("");
    let erroEnvio = $state("");

    let selecionada = $state<string | null>(null);
    let cabecalho = $state<Conversa | null>(null);
    let mensagens = $state<Mensagem[]>([]);
    let carregandoThread = $state(false);
    let textoNovo = $state("");
    let enviando = $state(false);
    let listaEl = $state<HTMLDivElement | null>(null);

    const meuId = $derived($auth.usuario?.id);

    async function carregarConversas() {
        try {
            conversas = await api<Conversa[]>("/conversas", {
                autenticado: true,
            });
            erro = "";
        } catch (e) {
            if (conversas.length === 0) {
                erro =
                    e instanceof Error
                        ? e.message
                        : "Erro ao carregar conversas";
            }
        } finally {
            carregandoLista = false;
        }
    }

    async function rolarParaOFim() {
        await tick();
        if (listaEl) listaEl.scrollTop = listaEl.scrollHeight;
    }

    async function abrirConversa(chave: string) {
        selecionada = chave;
        carregandoThread = true;
        mensagens = [];
        cabecalho = conversas.find((c) => c.id === chave) ?? null;
        try {
            if (!cabecalho) {
                // conversa ainda sem mensagens (aberta por um botão de "Conversar")
                cabecalho = await api<Conversa>(`/conversas/${chave}`, {
                    autenticado: true,
                });
            }
            mensagens = await api<Mensagem[]>(`/conversas/${chave}/mensagens`, {
                autenticado: true,
            });
            // O backend marcou como lidas; zera o contador localmente
            conversas = conversas.map((c) =>
                c.id === chave ? { ...c, nao_lidas: 0 } : c,
            );
        } catch (e) {
            erro = e instanceof Error ? e.message : "Erro ao abrir conversa";
            selecionada = null;
        } finally {
            carregandoThread = false;
        }
        await rolarParaOFim();
    }

    // Polling simples: busca só o que chegou depois da última mensagem conhecida
    async function buscarNovas() {
        const chave = selecionada;
        if (!chave || carregandoThread || enviando) return;
        const ultima = mensagens[mensagens.length - 1];
        try {
            const sufixo = ultima
                ? `?depois_de=${encodeURIComponent(ultima.criado_em)}`
                : "";
            const novas = await api<Mensagem[]>(
                `/conversas/${chave}/mensagens${sufixo}`,
                { autenticado: true },
            );
            if (chave !== selecionada) return;
            const conhecidas = new Set(mensagens.map((m) => m.id));
            const inedidas = novas.filter((m) => !conhecidas.has(m.id));
            if (inedidas.length > 0) {
                mensagens = [...mensagens, ...inedidas];
                await rolarParaOFim();
            }
        } catch {
            // falha momentânea de rede: tenta de novo no próximo ciclo
        }
    }

    async function enviar() {
        if (!textoNovo.trim() || !selecionada) return;
        enviando = true;
        const texto = textoNovo.trim();
        try {
            const nova = await api<Mensagem>(
                `/conversas/${selecionada}/mensagens`,
                { method: "POST", autenticado: true, body: { texto } },
            );
            mensagens = [...mensagens, nova];
            textoNovo = "";
            await rolarParaOFim();
            await carregarConversas();
        } catch (e) {
            erroEnvio =
                e instanceof Error ? e.message : "Não foi possível enviar";
        } finally {
            enviando = false;
        }
    }

    function rotuloData(iso: string | null): string {
        if (!iso) return "";
        const data = new Date(iso);
        const hoje = new Date();
        if (data.toDateString() === hoje.toDateString()) {
            return data.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
            });
        }
        return data.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
        });
    }

    onMount(() => {
        carregarConversas().then(() => {
            // Vindo de um botão "Conversar": /mensagens?reserva=<id> ou /mensagens?suporte=1
            const params = $page.url.searchParams;
            const reserva = params.get("reserva");
            if (reserva) abrirConversa(reserva);
            else if (params.get("suporte")) abrirConversa("suporte");
        });

        const thread = setInterval(buscarNovas, INTERVALO_THREAD_MS);
        const lista = setInterval(() => {
            if (document.visibilityState === "visible") carregarConversas();
        }, INTERVALO_LISTA_MS);

        return () => {
            clearInterval(thread);
            clearInterval(lista);
        };
    });
</script>

<main>
    <div class="coluna-lista" class:escondida={selecionada !== null}>
        <header>
            <h1>Mensagens</h1>
        </header>

        {#if carregandoLista}
            <div class="carregando-wrapper">
                <Preloader />
                <p>Carregando conversas...</p>
            </div>
        {:else if erro && conversas.length === 0}
            <p class="estado erro">{erro}</p>
        {:else}
            <div class="lista-conversas">
                {#each conversas as c (c.id)}
                    <button
                        class="item-conversa"
                        class:ativa={selecionada === c.id}
                        onclick={() => abrirConversa(c.id)}
                    >
                        <Avatar
                            nome={c.outro_nome}
                            semente={c.outro_id ?? c.id}
                            foto={c.outro_foto}
                            tamanho={46}
                        />
                        <div class="info-conversa">
                            <div class="linha-topo">
                                <span class="nome">{c.outro_nome}</span>
                                <span class="quando"
                                    >{rotuloData(c.ultima_mensagem_em)}</span
                                >
                            </div>
                            {#if c.imovel_nome}
                                <p class="imovel-nome">{c.imovel_nome}</p>
                            {/if}
                            <p class="previa" class:nao-lida={c.nao_lidas > 0}>
                                {#if c.ultima_mensagem}
                                    {c.ultima_mensagem_de === meuId
                                        ? "Você: "
                                        : ""}{c.ultima_mensagem}
                                {:else}
                                    Toque para falar com a equipe
                                {/if}
                            </p>
                        </div>
                        {#if c.nao_lidas > 0}
                            <span class="selo-nao-lida">{c.nao_lidas}</span>
                        {/if}
                    </button>
                {/each}
            </div>

            {#if conversas.filter((c) => c.tipo === "reserva").length === 0}
                <p class="dica-vazia">
                    As conversas com anfitriões e hóspedes aparecem aqui quando
                    você reserva ou recebe uma reserva.
                </p>
            {/if}
        {/if}
    </div>

    <div class="coluna-thread" class:visivel={selecionada !== null}>
        {#if selecionada}
            <div class="thread-topo">
                <button
                    class="voltar"
                    onclick={() => (selecionada = null)}
                    aria-label="Voltar">←</button
                >
                {#if cabecalho}
                    <Avatar
                        nome={cabecalho.outro_nome}
                        semente={cabecalho.outro_id ?? cabecalho.id}
                        foto={cabecalho.outro_foto}
                        tamanho={38}
                    />
                    <div class="thread-info">
                        <span class="thread-nome">{cabecalho.outro_nome}</span>
                        {#if cabecalho.imovel_nome}
                            <span class="thread-imovel"
                                >{cabecalho.imovel_nome}</span
                            >
                        {/if}
                    </div>
                {/if}
            </div>

            {#if carregandoThread}
                <div class="carregando-wrapper">
                    <Preloader />
                </div>
            {:else}
                <div class="mensagens-lista" bind:this={listaEl}>
                    {#if mensagens.length === 0}
                        <p class="sem-mensagens">
                            Nenhuma mensagem ainda. Diga olá!
                        </p>
                    {/if}
                    {#each mensagens as m (m.id)}
                        <div
                            class="bolha"
                            class:minha={m.remetente_id === meuId}
                        >
                            <p class="bolha-texto">{m.texto}</p>
                            <span class="bolha-hora"
                                >{rotuloData(m.criado_em)}</span
                            >
                        </div>
                    {/each}
                </div>
            {/if}

            <div class="caixa-envio">
                <textarea
                    placeholder="Escreva uma mensagem..."
                    bind:value={textoNovo}
                    rows="1"
                    onkeydown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            enviar();
                        }
                    }}></textarea>
                <button
                    class="botao-enviar"
                    onclick={enviar}
                    disabled={enviando || !textoNovo.trim()}
                >
                    Enviar
                </button>
            </div>
        {:else}
            <div class="sem-selecao">
                <p>Selecione uma conversa para ver as mensagens</p>
            </div>
        {/if}
    </div>
</main>

<ModalErro mensagem={erroEnvio} aoFechar={() => (erroEnvio = "")} />

<style>
    main {
        min-height: 100dvh;
        background-color: var(--cor-fundo);
        font-family: var(--fonte-corpo);
        display: flex;
    }

    header {
        padding: 1.25rem 1.1rem 0.75rem;
    }

    header h1 {
        margin: 0;
        font-size: 1.15rem;
        color: var(--cor-texto);
    }

    .coluna-lista {
        width: 100%;
        display: flex;
        flex-direction: column;
        padding-bottom: var(--altura-barra);
    }

    .coluna-lista.escondida {
        display: none;
    }

    .coluna-thread {
        display: none;
        flex-direction: column;
        width: 100%;
        height: 100dvh;
        position: fixed;
        inset: 0;
        background-color: var(--atrios-branco);
        z-index: 70;
    }

    .coluna-thread.visivel {
        display: flex;
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

    .estado.erro {
        margin: 1rem 1.25rem;
        color: #b23a2f;
        font-size: 0.85rem;
    }

    .vazio {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 0.5rem;
        padding: 4rem 1.5rem;
    }

    .icone-vazio {
        font-size: 2.5rem;
        margin-bottom: 0.4rem;
    }

    .vazio h2 {
        margin: 0;
        font-size: 1.1rem;
        color: var(--cor-texto);
    }

    .vazio p {
        margin: 0;
        max-width: 300px;
        font-size: 0.85rem;
        line-height: 1.5;
        color: var(--cor-texto);
        opacity: 0.65;
    }

    .lista-conversas {
        display: flex;
        flex-direction: column;
        padding: 0 0.5rem;
    }

    .item-conversa {
        display: flex;
        align-items: center;
        gap: 0.8rem;
        padding: 0.85rem 0.75rem;
        border: none;
        background: none;
        border-radius: var(--raio-md);
        cursor: pointer;
        text-align: left;
        font-family: var(--fonte-corpo);
    }

    .item-conversa.ativa {
        background-color: var(--atrios-creme);
    }

    .dica-vazia {
        margin: 1rem 1.25rem;
        font-size: 0.78rem;
        line-height: 1.5;
        color: var(--cor-texto);
        opacity: 0.6;
        text-align: center;
    }

    .sem-mensagens {
        margin: auto;
        font-size: 0.82rem;
        color: var(--cor-texto);
        opacity: 0.55;
    }

    .info-conversa {
        flex: 1;
        min-width: 0;
    }

    .linha-topo {
        display: flex;
        justify-content: space-between;
        gap: 0.5rem;
    }

    .nome {
        font-weight: 700;
        font-size: 0.88rem;
        color: var(--cor-texto);
    }

    .quando {
        flex-shrink: 0;
        font-size: 0.7rem;
        color: var(--cor-texto);
        opacity: 0.55;
    }

    .imovel-nome {
        margin: 0.1rem 0;
        font-size: 0.72rem;
        color: var(--atrios-dourado);
        font-weight: 600;
    }

    .previa {
        margin: 0;
        font-size: 0.78rem;
        color: var(--cor-texto);
        opacity: 0.65;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .previa.nao-lida {
        opacity: 1;
        font-weight: 700;
    }

    .selo-nao-lida {
        flex-shrink: 0;
        min-width: 1.2rem;
        height: 1.2rem;
        padding: 0 0.3rem;
        border-radius: 999px;
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        font-size: 0.65rem;
        font-weight: 800;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .thread-topo {
        display: flex;
        align-items: center;
        gap: 0.8rem;
        padding: calc(env(safe-area-inset-top, 0px) + 0.8rem) 1.1rem 0.8rem;
        border-bottom: 1px solid var(--cor-borda);
        flex-shrink: 0;
    }

    .voltar {
        border: none;
        background: none;
        font-size: 1.2rem;
        cursor: pointer;
        color: var(--cor-texto);
    }

    .thread-info {
        display: flex;
        flex-direction: column;
    }

    .thread-nome {
        font-weight: 700;
        font-size: 0.95rem;
        color: var(--cor-texto);
    }

    .thread-imovel {
        font-size: 0.72rem;
        color: var(--atrios-dourado);
    }

    .mensagens-lista {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
        padding: 1rem;
    }

    .bolha {
        max-width: 75%;
        padding: 0.6rem 0.85rem;
        border-radius: var(--raio-md);
        background-color: var(--atrios-creme);
        align-self: flex-start;
    }

    .bolha.minha {
        align-self: flex-end;
        background-color: var(--atrios-dourado);
    }

    .bolha-texto {
        margin: 0;
        font-size: 0.85rem;
        line-height: 1.4;
        color: var(--cor-texto);
        white-space: pre-wrap;
        word-break: break-word;
    }

    .bolha-hora {
        display: block;
        margin-top: 0.2rem;
        font-size: 0.62rem;
        opacity: 0.6;
        text-align: right;
    }

    .caixa-envio {
        display: flex;
        align-items: flex-end;
        gap: 0.6rem;
        padding: 0.75rem 1rem calc(env(safe-area-inset-bottom, 0px) + 0.75rem);
        border-top: 1px solid var(--cor-borda);
        flex-shrink: 0;
    }

    .caixa-envio textarea {
        flex: 1;
        resize: none;
        max-height: 100px;
        padding: 0.65rem 0.9rem;
        border: 1px solid var(--cor-borda);
        border-radius: var(--raio-md);
        font-family: var(--fonte-corpo);
        font-size: 0.85rem;
        color: var(--cor-texto);
    }

    .botao-enviar {
        padding: 0.65rem 1.1rem;
        border: none;
        border-radius: var(--raio-pill);
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        font-weight: 700;
        font-size: 0.82rem;
        cursor: pointer;
    }

    .botao-enviar:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .sem-selecao {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--cor-texto);
        opacity: 0.5;
        font-size: 0.85rem;
    }

    /* ===== Desktop: lista e thread lado a lado ===== */
    @media (min-width: 960px) {
        main {
            max-width: 1100px;
            margin: 0 auto;
            padding-top: 1.5rem;
            height: calc(100dvh - 64px - 1.5rem);
        }

        .coluna-lista {
            width: 360px;
            flex-shrink: 0;
            border-right: 1px solid var(--cor-borda);
            padding-bottom: 0;
        }

        .coluna-lista.escondida {
            display: flex;
        }

        .coluna-thread {
            position: static;
            flex: 1;
            display: flex;
            height: auto;
        }

        .voltar {
            display: none;
        }
    }
</style>
