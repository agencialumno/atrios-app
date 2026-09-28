<script lang="ts">
    import { onMount, untrack } from "svelte";
    import { goto } from "$app/navigation";
    import { api } from "$lib/api/client";
    import { auth } from "$lib/stores/auth";
    import Preloader from "$lib/components/Preloader.svelte";
    import "$lib/styles/theme.css";

    type Origem = "airbnb" | "booking";

    interface ImovelLista {
        id: string;
        proprietario_id: string;
        nome: string;
        endereco: string;
    }

    interface CalendarioExterno {
        id: string;
        origem: Origem;
        url: string;
        ultima_sincronizacao: string | null;
        ultimo_erro: string | null;
        eventos_importados: number;
    }

    interface Resposta {
        exportacao: { airbnb: string; booking: string };
        demo: { airbnb: string; airbnb_conflito: string };
        calendarios: CalendarioExterno[];
    }

    const origens: { id: Origem; nome: string }[] = [
        { id: "airbnb", nome: "Airbnb" },
        { id: "booking", nome: "Booking" },
    ];

    let imoveis = $state<ImovelLista[]>([]);
    let escolhido = $state("");
    let dados = $state<Resposta | null>(null);
    let carregandoLista = $state(true);
    let carregando = $state(false);
    let erro = $state("");
    let aviso = $state("");
    let ocupado = $state<string | null>(null);
    let confirmando = $state<Origem | null>(null);
    let copiado = $state("");
    let campos = $state<Record<Origem, string>>({ airbnb: "", booking: "" });

    let requisicao = 0;

    /** "Rua Tal, 302" -> "302" */
    function unidade(endereco: string): string {
        const partes = (endereco ?? "").split(",");
        return partes.length > 1 ? partes[partes.length - 1].trim() : "";
    }

    function rotulo(i: ImovelLista): string {
        const apto = unidade(i.endereco);
        return `${i.nome}${apto ? ` · Apto ${apto}` : ""}`;
    }

    function hostDe(url: string): string {
        try {
            return new URL(url).host;
        } catch {
            return "";
        }
    }

    function quando(carimbo: string | null): string {
        if (!carimbo) return "ainda não sincronizado";
        const data = new Date(carimbo.replace(" ", "T") + "Z");
        if (isNaN(data.getTime())) return carimbo;
        return data.toLocaleString("pt-BR", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function calendarioDe(origem: Origem): CalendarioExterno | undefined {
        return dados?.calendarios.find((c) => c.origem === origem);
    }

    onMount(async () => {
        try {
            const todos = await api<ImovelLista[]>("/imoveis");
            const usuario = $auth.usuario;

            imoveis = todos
                .filter(
                    (i) =>
                        usuario?.papel === "equipe" ||
                        i.proprietario_id === usuario?.id,
                )
                .sort((a, b) =>
                    rotulo(a).localeCompare(rotulo(b), "pt-BR", {
                        numeric: true,
                    }),
                );

            if (imoveis.length > 0) escolhido = imoveis[0].id;
        } catch (e) {
            erro =
                e instanceof Error ? e.message : "Erro ao carregar os imóveis";
        } finally {
            carregandoLista = false;
        }
    });

    async function carregarDados(id: string, silencioso = false) {
        const minha = ++requisicao;

        if (!silencioso) {
            carregando = true;
            dados = null;
        }

        try {
            const resposta = await api<Resposta>(`/imoveis/${id}/calendarios`, {
                autenticado: true,
            });
            if (minha !== requisicao) return;
            dados = resposta;
        } catch (e) {
            if (minha !== requisicao) return;
            erro =
                e instanceof Error
                    ? e.message
                    : "Erro ao carregar os calendários";
        } finally {
            if (minha === requisicao) carregando = false;
        }
    }

    // Recarrega ao trocar de imóvel
    $effect(() => {
        const id = escolhido;
        if (!id) return;

        untrack(() => {
            erro = "";
            aviso = "";
            confirmando = null;
            void carregarDados(id);
        });
    });

    async function conectar(origem: Origem, url: string) {
        if (!url.trim()) {
            erro = "Cole o endereço do calendário (.ics).";
            return;
        }

        ocupado = `${origem}-conectar`;
        erro = "";
        aviso = "";

        try {
            dados = await api<Resposta>(`/imoveis/${escolhido}/calendarios`, {
                method: "POST",
                autenticado: true,
                body: { origem, url: url.trim() },
            });
            campos[origem] = "";
            aviso =
                "Calendário conectado. As datas ocupadas já bloqueiam reservas aqui.";
        } catch (e) {
            erro = e instanceof Error ? e.message : "Não foi possível conectar";
        } finally {
            ocupado = null;
        }
    }

    async function sincronizar(origem: Origem) {
        ocupado = `${origem}-sincronizar`;
        erro = "";
        aviso = "";

        try {
            dados = await api<Resposta>(
                `/imoveis/${escolhido}/calendarios/${origem}/sincronizar`,
                {
                    method: "POST",
                    autenticado: true,
                },
            );
            aviso = "Calendário atualizado.";
        } catch (e) {
            erro =
                e instanceof Error ? e.message : "Não foi possível sincronizar";
            await carregarDados(escolhido, true);
        } finally {
            ocupado = null;
        }
    }

    async function desconectar(origem: Origem) {
        ocupado = `${origem}-desconectar`;
        erro = "";
        aviso = "";

        try {
            dados = await api<Resposta>(
                `/imoveis/${escolhido}/calendarios/${origem}`,
                {
                    method: "DELETE",
                    autenticado: true,
                },
            );
            confirmando = null;
            aviso = "Calendário desconectado e bloqueios removidos.";
        } catch (e) {
            erro =
                e instanceof Error ? e.message : "Não foi possível desconectar";
        } finally {
            ocupado = null;
        }
    }

    async function copiar(texto: string, chave: string) {
        try {
            await navigator.clipboard.writeText(texto);
            copiado = chave;
            setTimeout(() => {
                if (copiado === chave) copiado = "";
            }, 2000);
        } catch {
            erro =
                "Não consegui copiar sozinho. Toque no endereço, selecione e copie.";
        }
    }
</script>

<main>
    <div class="topo">
        <a href="/perfil" class="voltar">←</a>
        <h1>Calendários</h1>
    </div>

    <div class="conteudo">
        {#if carregandoLista}
            <div class="carregando-wrapper">
                <Preloader />
                <p>Carregando...</p>
            </div>
        {:else if imoveis.length === 0}
            <div class="vazio">
                <img src="/atrios-simbolo.png" alt="" class="vazio-icone" />
                <h2>Você ainda não tem anúncios ativos</h2>
                <p>
                    Crie um anúncio para conectar o calendário dele ao Airbnb e
                    ao Booking.
                </p>
                <button
                    class="botao-principal"
                    onclick={() => goto("/anunciar")}>Criar anúncio</button
                >
            </div>
        {:else}
            <p class="intro">
                Conecte o Airbnb e o Booking para que uma noite reservada em um
                lugar deixe de estar disponível nos outros. Assim você evita
                vender a mesma noite duas vezes.
            </p>

            <label class="seletor">
                Imóvel
                <select bind:value={escolhido}>
                    {#each imoveis as i (i.id)}
                        <option value={i.id}>{rotulo(i)}</option>
                    {/each}
                </select>
            </label>

            {#if erro}<p class="caixa erro">{erro}</p>{/if}
            {#if aviso}<p class="caixa ok">{aviso}</p>{/if}

            {#if carregando}
                <div class="carregando-wrapper">
                    <Preloader />
                    <p>Carregando os calendários...</p>
                </div>
            {:else if dados}
                <h2>Receber reservas de outros canais</h2>
                <p class="ajuda">
                    Cole o endereço (.ics) do calendário do anúncio. Atualizamos
                    sozinhos a cada 15 minutos.
                </p>

                {#each origens as o (o.id)}
                    {@const cal = calendarioDe(o.id)}
                    <section class="cartao">
                        <div class="cartao-topo">
                            <h3>{o.nome}</h3>
                            {#if cal}
                                <span
                                    class="chip"
                                    class:falha={!!cal.ultimo_erro}
                                >
                                    {cal.ultimo_erro ? "Com erro" : "Conectado"}
                                </span>
                            {/if}
                        </div>

                        {#if cal}
                            <p class="detalhe">Endereço: {hostDe(cal.url)}</p>
                            <p class="detalhe">
                                Última sincronização: {quando(
                                    cal.ultima_sincronizacao,
                                )}
                            </p>
                            <p class="detalhe">
                                {cal.eventos_importados}
                                {cal.eventos_importados === 1
                                    ? "período ocupado importado"
                                    : "períodos ocupados importados"}
                            </p>

                            {#if cal.ultimo_erro}
                                <p class="caixa erro">
                                    A última sincronização falhou: {cal.ultimo_erro}
                                </p>
                            {/if}

                            {#if confirmando === o.id}
                                <p class="ajuda">
                                    Isso remove os bloqueios importados do {o.nome}.
                                    As datas voltam a ficar livres para reserva
                                    aqui.
                                </p>
                                <div class="acoes">
                                    <button
                                        class="acao"
                                        onclick={() => (confirmando = null)}
                                        >Cancelar</button
                                    >
                                    <button
                                        class="acao perigo"
                                        onclick={() => desconectar(o.id)}
                                        disabled={ocupado !== null}
                                    >
                                        {ocupado === `${o.id}-desconectar`
                                            ? "Removendo..."
                                            : "Sim, desconectar"}
                                    </button>
                                </div>
                            {:else}
                                <div class="acoes">
                                    <button
                                        class="acao-principal"
                                        onclick={() => sincronizar(o.id)}
                                        disabled={ocupado !== null}
                                    >
                                        {ocupado === `${o.id}-sincronizar`
                                            ? "Sincronizando..."
                                            : "Sincronizar agora"}
                                    </button>
                                    <button
                                        class="acao"
                                        onclick={() => (confirmando = o.id)}
                                        disabled={ocupado !== null}
                                    >
                                        Desconectar
                                    </button>
                                </div>
                            {/if}
                        {:else}
                            <label>
                                Endereço do calendário (.ics)
                                <input
                                    type="url"
                                    bind:value={campos[o.id]}
                                    placeholder="Cole aqui o link do {o.nome}"
                                />
                            </label>

                            <button
                                class="acao-principal cheio"
                                onclick={() => conectar(o.id, campos[o.id])}
                                disabled={ocupado !== null}
                            >
                                {ocupado === `${o.id}-conectar`
                                    ? "Conectando..."
                                    : "Conectar"}
                            </button>

                            {#if o.id === "airbnb"}
                                <div class="demo">
                                    <p class="demo-titulo">
                                        Para a apresentação
                                    </p>
                                    <p class="ajuda">
                                        Conecta um calendário de exemplo do
                                        Airbnb, com reservas e um bloqueio.
                                    </p>
                                    <div class="acoes">
                                        <button
                                            class="acao"
                                            onclick={() =>
                                                conectar(
                                                    "airbnb",
                                                    dados?.demo.airbnb ?? "",
                                                )}
                                            disabled={ocupado !== null}
                                        >
                                            Usar demonstração
                                        </button>
                                        <button
                                            class="acao"
                                            onclick={() =>
                                                conectar(
                                                    "airbnb",
                                                    dados?.demo
                                                        .airbnb_conflito ?? "",
                                                )}
                                            disabled={ocupado !== null}
                                        >
                                            Com conflito
                                        </button>
                                    </div>
                                </div>
                            {/if}
                        {/if}
                    </section>
                {/each}

                <h2 class="titulo-secao">Enviar as reservas da Átrios</h2>
                <p class="ajuda">
                    Cole estes endereços no Airbnb e no Booking, na opção de
                    importar ou sincronizar calendário do anúncio deles. Cada
                    canal recebe as reservas da Átrios e as dos outros canais,
                    mas não as dele mesmo.
                </p>

                {#each origens as o (o.id)}
                    {@const link =
                        o.id === "airbnb"
                            ? dados.exportacao.airbnb
                            : dados.exportacao.booking}
                    <section class="cartao">
                        <h3>Para o {o.nome}</h3>
                        <input
                            class="link-campo"
                            type="text"
                            readonly
                            value={link}
                            onclick={(e) => e.currentTarget.select()}
                        />
                        <button class="acao" onclick={() => copiar(link, o.id)}>
                            {copiado === o.id ? "Copiado ✓" : "Copiar endereço"}
                        </button>
                    </section>
                {/each}

                <p class="nota">
                    Estes endereços têm um código secreto: cole só no Airbnb e
                    no Booking, e não compartilhe. Para o Airbnb e o Booking
                    conseguirem abrir, o servidor precisa estar acessível pela
                    internet. A atualização do lado deles não é instantânea,
                    então uma mesma noite ainda pode ser vendida duas vezes no
                    intervalo entre duas buscas.
                </p>
            {/if}
        {/if}
    </div>
</main>

<style>
    main {
        min-height: 100vh;
        background-color: var(--cor-fundo);
        font-family: var(--fonte-corpo);
        padding-bottom: calc(var(--altura-barra) + 1.5rem);
    }

    .topo {
        display: flex;
        align-items: center;
        gap: 0.9rem;
        padding: 1.25rem 1.1rem 0.75rem;
    }

    .topo h1 {
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

    .conteudo {
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
        padding: 0.5rem 1.25rem 1rem;
    }

    .carregando-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        padding: 2.5rem 1rem;
        color: var(--cor-texto);
        opacity: 0.75;
        font-size: 0.85rem;
    }

    .carregando-wrapper p {
        margin: 0;
    }

    h2 {
        margin: 0.4rem 0 0;
        font-size: 1rem;
        color: var(--cor-texto);
    }

    .titulo-secao {
        margin-top: 1.2rem;
    }

    h3 {
        margin: 0;
        font-size: 0.95rem;
        color: var(--cor-texto);
    }

    .intro,
    .ajuda {
        margin: 0;
        font-size: 0.8rem;
        line-height: 1.45;
        color: var(--cor-texto);
        opacity: 0.7;
    }

    .nota {
        margin: 0.4rem 0 0;
        font-size: 0.72rem;
        line-height: 1.5;
        color: var(--cor-texto);
        opacity: 0.6;
        text-align: center;
    }

    label {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        font-size: 0.78rem;
        font-weight: 500;
        color: var(--cor-texto);
    }

    select,
    input {
        width: 100%;
        min-width: 0;
        padding: 0.75rem 0.95rem;
        border: 1px solid var(--cor-borda);
        border-radius: var(--raio-sm);
        background-color: var(--atrios-branco);
        color: var(--cor-texto);
        font-family: var(--fonte-corpo);
        font-size: 0.85rem;
    }

    select:focus,
    input:focus {
        outline: none;
        border-color: var(--atrios-dourado);
    }

    .link-campo {
        background-color: var(--atrios-creme);
        font-size: 0.72rem;
    }

    .caixa {
        margin: 0;
        padding: 0.7rem 0.9rem;
        border-radius: var(--raio-sm);
        font-size: 0.8rem;
        line-height: 1.4;
    }

    .caixa.erro {
        background-color: #f4dedb;
        color: #b23a2f;
    }

    .caixa.ok {
        background-color: rgba(201, 169, 107, 0.22);
        color: var(--cor-texto);
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

    .cartao-topo {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.6rem;
    }

    .detalhe {
        margin: 0;
        font-size: 0.78rem;
        color: var(--cor-texto);
        opacity: 0.8;
    }

    .chip {
        padding: 0.2rem 0.65rem;
        border-radius: var(--raio-pill);
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        font-size: 0.66rem;
        font-weight: 700;
    }

    .chip.falha {
        background-color: #f4dedb;
        color: #b23a2f;
    }

    .acoes {
        display: flex;
        gap: 0.5rem;
    }

    .acao,
    .acao-principal {
        flex: 1;
        padding: 0.7rem 0.5rem;
        border-radius: var(--raio-pill);
        font-family: var(--fonte-corpo);
        font-size: 0.78rem;
        font-weight: 700;
        cursor: pointer;
    }

    .acao {
        border: 1.5px solid var(--atrios-dourado);
        background: none;
        color: var(--cor-texto);
    }

    .acao.perigo {
        border-color: #b23a2f;
        color: #b23a2f;
    }

    .acao-principal {
        border: none;
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
    }

    .acao-principal.cheio {
        width: 100%;
        flex: none;
    }

    .acao:disabled,
    .acao-principal:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .demo {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-top: 0.3rem;
        padding-top: 0.8rem;
        border-top: 1px dashed var(--cor-borda);
    }

    .demo-titulo {
        margin: 0;
        font-size: 0.74rem;
        font-weight: 700;
        color: var(--cor-texto);
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
</style>
