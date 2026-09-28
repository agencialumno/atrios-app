<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { api } from "$lib/api/client";
    import {
        deISO,
        diaSemanaCurto,
        formatarCurta,
        formatarDataLonga,
        hojeISO,
        mesAbreviado,
        somarDias,
    } from "$lib/datas";
    import CalendarioMestre from "$lib/components/CalendarioMestre.svelte";
    import Preloader from "$lib/components/Preloader.svelte";
    import "../../lib/styles/theme.css";

    interface Movimento {
        reserva_id: string;
        imovel_id: string;
        imovel_nome: string;
        imovel_cidade: string;
        hospede_nome: string;
        num_hospedes: number;
        data_checkin: string;
        data_checkout: string;
        tipo: "checkin" | "checkout" | "estadia";
        virada: boolean;
    }

    interface ResumoHoje {
        chegadas: number;
        saidas: number;
        em_estadia: number;
        limpezas_pendentes: number;
        ocorrencias_abertas: number;
    }

    interface PainelHoje {
        hoje: string;
        resumo: ResumoHoje;
        chegadas: Movimento[];
        saidas: Movimento[];
        em_estadia: Movimento[];
        proximos: Movimento[];
    }

    interface Limpeza {
        id: string;
        imovel_id: string;
        imovel_nome: string;
        imovel_cidade: string;
        data: string;
        status: "pendente" | "em_andamento" | "concluida";
        hospede_nome: string | null;
        urgente: boolean;
        proximo_checkin: string | null;
        concluida_por_nome: string | null;
        concluida_em: string | null;
    }

    interface Ocorrencia {
        id: string;
        imovel_id: string;
        imovel_nome: string;
        tipo: string;
        titulo: string;
        descricao: string | null;
        status: "aberta" | "em_andamento" | "resolvida";
        criada_por_nome: string;
        criado_em: string;
        resolvida_em: string | null;
    }

    interface ImovelSimples {
        id: string;
        nome: string;
        cidade: string;
    }

    interface RespostaOcorrencias {
        imoveis: ImovelSimples[];
        ocorrencias: Ocorrencia[];
    }

    type Aba = "hoje" | "limpeza" | "ocorrencias" | "calendario";

    const abas: { id: Aba; nome: string }[] = [
        { id: "hoje", nome: "Hoje" },
        { id: "limpeza", nome: "Limpeza" },
        { id: "ocorrencias", nome: "Ocorrências" },
        { id: "calendario", nome: "Calendário" },
    ];

    const tiposOcorrencia = [
        { id: "manutencao", nome: "Manutenção" },
        { id: "dano", nome: "Dano" },
        { id: "reclamacao", nome: "Reclamação" },
        { id: "outro", nome: "Outro" },
    ];

    const hoje = hojeISO();

    let aba = $state<Aba>("hoje");
    let carregando = $state(true);
    let erro = $state("");
    let erroAcao = $state("");
    let atualizando = $state<string | null>(null);

    let painel = $state<PainelHoje | null>(null);
    let limpezas = $state<Limpeza[]>([]);
    let ocorrencias = $state<Ocorrencia[]>([]);
    let imoveisLista = $state<ImovelSimples[]>([]);

    // Ocorrências
    let filtroOco = $state<"abertas" | "resolvidas">("abertas");
    let formAberto = $state(false);
    let formImovel = $state("");
    let formTipo = $state("manutencao");
    let formTitulo = $state("");
    let formDescricao = $state("");
    let salvando = $state(false);
    let erroForm = $state("");

    async function carregarTudo(inicial = false) {
        try {
            const [p, l, o] = await Promise.all([
                api<PainelHoje>("/equipe/hoje", { autenticado: true }),
                api<Limpeza[]>("/equipe/limpezas", { autenticado: true }),
                api<RespostaOcorrencias>("/equipe/ocorrencias", {
                    autenticado: true,
                }),
            ]);
            painel = p;
            limpezas = l;
            ocorrencias = o.ocorrencias;
            imoveisLista = o.imoveis;
            erro = "";
        } catch (e) {
            const mensagem =
                e instanceof Error ? e.message : "Erro ao carregar o painel";
            if (inicial) erro = mensagem;
            else erroAcao = mensagem;
        } finally {
            carregando = false;
        }
    }

    onMount(() => carregarTudo(true));

    // ----- Ações -----

    async function mudarTarefa(t: Limpeza, status: string) {
        atualizando = t.id;
        erroAcao = "";
        try {
            await api(`/equipe/tarefas/${t.id}/status`, {
                method: "POST",
                autenticado: true,
                body: { status },
            });
            await carregarTudo();
        } catch (e) {
            erroAcao =
                e instanceof Error
                    ? e.message
                    : "Não foi possível atualizar a tarefa";
        } finally {
            atualizando = null;
        }
    }

    async function mudarOcorrencia(o: Ocorrencia, status: string) {
        atualizando = o.id;
        erroAcao = "";
        try {
            await api(`/equipe/ocorrencias/${o.id}/status`, {
                method: "POST",
                autenticado: true,
                body: { status },
            });
            await carregarTudo();
        } catch (e) {
            erroAcao =
                e instanceof Error
                    ? e.message
                    : "Não foi possível atualizar a ocorrência";
        } finally {
            atualizando = null;
        }
    }

    function abrirForm() {
        erroForm = "";
        formAberto = true;
    }

    function fecharForm() {
        if (!salvando) formAberto = false;
    }

    async function registrarOcorrencia() {
        erroForm = "";
        if (!formImovel) {
            erroForm = "Escolha o imóvel.";
            return;
        }
        if (!formTitulo.trim()) {
            erroForm = "Dê um título para a ocorrência.";
            return;
        }

        salvando = true;
        try {
            await api("/equipe/ocorrencias", {
                method: "POST",
                autenticado: true,
                body: {
                    imovel_id: formImovel,
                    tipo: formTipo,
                    titulo: formTitulo.trim(),
                    descricao: formDescricao.trim() || null,
                },
            });
            formAberto = false;
            formImovel = "";
            formTipo = "manutencao";
            formTitulo = "";
            formDescricao = "";
            filtroOco = "abertas";
            await carregarTudo();
        } catch (e) {
            erroForm =
                e instanceof Error ? e.message : "Não foi possível registrar";
        } finally {
            salvando = false;
        }
    }

    // ----- Formatação -----

    function rotuloData(iso: string): string {
        if (iso === hoje) return "Hoje";
        if (iso === somarDias(hoje, 1)) return "Amanhã";
        if (iso === somarDias(hoje, -1)) return "Ontem";
        return `${diaSemanaCurto(iso)}, ${formatarCurta(iso)}`;
    }

    function nomeTipo(id: string): string {
        return tiposOcorrencia.find((t) => t.id === id)?.nome ?? id;
    }

    function nomeStatusOco(s: string): string {
        if (s === "em_andamento") return "Em andamento";
        if (s === "resolvida") return "Resolvida";
        return "Aberta";
    }

    function dataDe(carimbo: string): string {
        return carimbo.slice(0, 10);
    }

    // ----- Derivados: limpeza -----

    let atrasadas = $derived(
        limpezas.filter((t) => t.status !== "concluida" && t.data < hoje),
    );
    let deHoje = $derived(
        limpezas.filter((t) => t.status !== "concluida" && t.data === hoje),
    );
    let proximasLimpezas = $derived(
        limpezas.filter((t) => t.status !== "concluida" && t.data > hoje),
    );
    let concluidas = $derived(
        limpezas
            .filter((t) => t.status === "concluida")
            .sort((a, b) =>
                (b.concluida_em ?? "").localeCompare(a.concluida_em ?? ""),
            ),
    );

    // ----- Derivados: ocorrências -----

    let abertas = $derived(ocorrencias.filter((o) => o.status !== "resolvida"));
    let resolvidas = $derived(
        ocorrencias.filter((o) => o.status === "resolvida"),
    );
    let listaOco = $derived(filtroOco === "abertas" ? abertas : resolvidas);

    let contagens = $derived<Record<Aba, number>>({
        hoje: 0,
        limpeza: atrasadas.length + deHoje.length,
        ocorrencias: abertas.length,
        calendario: 0,
    });
</script>

{#snippet cartaoMovimento(m: Movimento)}
    <div class="movimento">
        <div class="movimento-info">
            <p class="movimento-imovel">{m.imovel_nome}</p>
            <p class="movimento-detalhe">
                {m.hospede_nome} · {m.num_hospedes}
                {m.num_hospedes === 1 ? "hóspede" : "hóspedes"}
                {#if m.tipo === "estadia"}
                    · sai em {formatarCurta(m.data_checkout)}{/if}
            </p>
        </div>
        {#if m.virada}<span class="chip ativa">Virada</span>{/if}
    </div>
{/snippet}

{#snippet cartaoLimpeza(t: Limpeza)}
    {@const atrasada = t.status !== "concluida" && t.data < hoje}
    <article class="card-tarefa" class:concluida={t.status === "concluida"}>
        <div class="tarefa-topo">
            <div class="tarefa-textos">
                <p class="tarefa-imovel">{t.imovel_nome}</p>
                <p class="tarefa-detalhe">
                    {t.imovel_cidade} · {rotuloData(t.data)}
                </p>
            </div>
            <div class="chips">
                {#if t.urgente && t.status !== "concluida"}<span
                        class="chip ativa">Urgente</span
                    >{/if}
                {#if atrasada}<span class="chip alerta">Atrasada</span>{/if}
                {#if t.status === "em_andamento"}<span class="chip neutra"
                        >Em andamento</span
                    >{/if}
            </div>
        </div>

        <p class="tarefa-nota">
            {#if t.hospede_nome}Saída de {t.hospede_nome}.
            {/if}
            {#if t.proximo_checkin}
                Próxima chegada: {t.proximo_checkin === t.data
                    ? "no mesmo dia"
                    : rotuloData(t.proximo_checkin)}.
            {:else}
                Sem chegada agendada.
            {/if}
        </p>

        {#if t.status === "concluida"}
            <div class="tarefa-base">
                <span class="tarefa-feito">
                    Concluída{#if t.concluida_por_nome}
                        por {t.concluida_por_nome}{/if}
                </span>
                <button
                    class="link-acao"
                    onclick={() => mudarTarefa(t, "pendente")}
                    disabled={atualizando === t.id}
                >
                    Reabrir
                </button>
            </div>
        {:else}
            <div class="tarefa-acoes">
                {#if t.status === "pendente"}
                    <button
                        class="acao"
                        onclick={() => mudarTarefa(t, "em_andamento")}
                        disabled={atualizando === t.id}
                    >
                        Iniciar
                    </button>
                {:else}
                    <button
                        class="acao"
                        onclick={() => mudarTarefa(t, "pendente")}
                        disabled={atualizando === t.id}
                    >
                        Desfazer
                    </button>
                {/if}
                <button
                    class="acao-principal"
                    onclick={() => mudarTarefa(t, "concluida")}
                    disabled={atualizando === t.id}
                >
                    Concluir
                </button>
            </div>
        {/if}
    </article>
{/snippet}

{#snippet cartaoOcorrencia(o: Ocorrencia)}
    <article class="card-tarefa" class:concluida={o.status === "resolvida"}>
        <div class="tarefa-topo">
            <div class="tarefa-textos">
                <p class="tarefa-imovel">{o.titulo}</p>
                <p class="tarefa-detalhe">
                    {o.imovel_nome} · {nomeTipo(o.tipo)}
                </p>
            </div>
            <span
                class="chip"
                class:alerta={o.status === "aberta"}
                class:ativa={o.status === "em_andamento"}
                class:neutra={o.status === "resolvida"}
            >
                {nomeStatusOco(o.status)}
            </span>
        </div>

        {#if o.descricao}
            <p class="tarefa-nota">{o.descricao}</p>
        {/if}

        <p class="tarefa-autor">
            Registrada por {o.criada_por_nome} em {formatarCurta(
                dataDe(o.criado_em),
            )}
            {#if o.resolvida_em}
                · resolvida em {formatarCurta(dataDe(o.resolvida_em))}{/if}
        </p>

        <div class="tarefa-acoes">
            {#if o.status === "aberta"}
                <button
                    class="acao"
                    onclick={() => mudarOcorrencia(o, "em_andamento")}
                    disabled={atualizando === o.id}
                >
                    Em andamento
                </button>
                <button
                    class="acao-principal"
                    onclick={() => mudarOcorrencia(o, "resolvida")}
                    disabled={atualizando === o.id}
                >
                    Resolver
                </button>
            {:else if o.status === "em_andamento"}
                <button
                    class="acao"
                    onclick={() => mudarOcorrencia(o, "aberta")}
                    disabled={atualizando === o.id}
                >
                    Voltar a aberta
                </button>
                <button
                    class="acao-principal"
                    onclick={() => mudarOcorrencia(o, "resolvida")}
                    disabled={atualizando === o.id}
                >
                    Resolver
                </button>
            {:else}
                <button
                    class="acao"
                    onclick={() => mudarOcorrencia(o, "aberta")}
                    disabled={atualizando === o.id}
                >
                    Reabrir
                </button>
            {/if}
        </div>
    </article>
{/snippet}

<main>
    <header>
        <h1>Painel da equipe</h1>
        <p>Operação Átrios · {formatarDataLonga(hoje)}</p>
    </header>

    {#if carregando}
        <div class="carregando-wrapper">
            <Preloader />
            <p>Carregando a operação...</p>
        </div>
    {:else if erro || !painel}
        <div class="bloqueio">
            <p class="erro">{erro || "Não foi possível carregar o painel."}</p>
            <button class="botao-principal" onclick={() => goto("/perfil")}
                >Voltar ao perfil</button
            >
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
                    {#if contagens[a.id] > 0}<span class="contagem"
                            >{contagens[a.id]}</span
                        >{/if}
                </button>
            {/each}
        </div>

        {#if erroAcao}
            <p class="erro-acao">{erroAcao}</p>
        {/if}

        {#if aba === "hoje"}
            <div class="numeros">
                <div class="numero">
                    <span class="numero-valor">{painel.resumo.chegadas}</span>
                    <span class="numero-rotulo">
                        {painel.resumo.chegadas === 1
                            ? "chegada hoje"
                            : "chegadas hoje"}
                    </span>
                </div>
                <div class="numero">
                    <span class="numero-valor">{painel.resumo.saidas}</span>
                    <span class="numero-rotulo">
                        {painel.resumo.saidas === 1
                            ? "saída hoje"
                            : "saídas hoje"}
                    </span>
                </div>
                <div class="numero">
                    <span class="numero-valor">{painel.resumo.em_estadia}</span>
                    <span class="numero-rotulo">em estadia</span>
                </div>
                <div class="numero">
                    <span class="numero-valor"
                        >{painel.resumo.limpezas_pendentes}</span
                    >
                    <span class="numero-rotulo">
                        {painel.resumo.limpezas_pendentes === 1
                            ? "limpeza pendente"
                            : "limpezas pendentes"}
                    </span>
                </div>
            </div>

            <section>
                <h2>Chegadas hoje</h2>
                {#if painel.chegadas.length === 0}
                    <p class="vazio-texto">Nenhuma chegada hoje.</p>
                {:else}
                    <div class="lista">
                        {#each painel.chegadas as m (m.reserva_id)}
                            {@render cartaoMovimento(m)}
                        {/each}
                    </div>
                {/if}
            </section>

            <section>
                <h2>Saídas hoje</h2>
                {#if painel.saidas.length === 0}
                    <p class="vazio-texto">Nenhuma saída hoje.</p>
                {:else}
                    <div class="lista">
                        {#each painel.saidas as m (m.reserva_id)}
                            {@render cartaoMovimento(m)}
                        {/each}
                    </div>
                {/if}
            </section>

            {#if painel.em_estadia.length > 0}
                <section>
                    <h2>Em estadia</h2>
                    <div class="lista">
                        {#each painel.em_estadia as m (m.reserva_id)}
                            {@render cartaoMovimento(m)}
                        {/each}
                    </div>
                </section>
            {/if}

            <section>
                <h2>Próximas 48 horas</h2>
                {#if painel.proximos.length === 0}
                    <p class="vazio-texto">
                        Nada agendado para os próximos dois dias.
                    </p>
                {:else}
                    <div class="lista">
                        {#each painel.proximos as m (m.reserva_id + m.tipo)}
                            {@const dataMov =
                                m.tipo === "checkin"
                                    ? m.data_checkin
                                    : m.data_checkout}
                            <div class="proximo">
                                <div class="data-caixa">
                                    <span class="data-dia"
                                        >{deISO(dataMov).getDate()}</span
                                    >
                                    <span class="data-mes"
                                        >{mesAbreviado(dataMov)}</span
                                    >
                                </div>
                                <div class="movimento-info">
                                    <p class="movimento-imovel">
                                        {m.imovel_nome}
                                    </p>
                                    <p class="movimento-detalhe">
                                        {m.tipo === "checkin"
                                            ? "Chegada"
                                            : "Saída"} · {m.hospede_nome}
                                    </p>
                                </div>
                                {#if m.virada}<span class="chip ativa"
                                        >Virada</span
                                    >{/if}
                            </div>
                        {/each}
                    </div>
                {/if}
            </section>

            <p class="rodape-nota">
                Virada = saída e chegada no mesmo dia, no mesmo imóvel. A
                limpeza dela é urgente.
            </p>
        {/if}

        {#if aba === "limpeza"}
            {#if atrasadas.length + deHoje.length + proximasLimpezas.length + concluidas.length === 0}
                <div class="vazio">
                    <img src="/atrios-simbolo.png" alt="" class="vazio-icone" />
                    <h2>Nenhuma limpeza por aqui</h2>
                    <p>
                        Cada reserva confirmada cria uma limpeza no dia da
                        saída. Elas aparecem aqui.
                    </p>
                </div>
            {:else}
                {#if atrasadas.length > 0}
                    <h2 class="titulo-alerta">Atrasadas</h2>
                    <div class="lista">
                        {#each atrasadas as t (t.id)}
                            {@render cartaoLimpeza(t)}
                        {/each}
                    </div>
                {/if}

                <h2 class:titulo-secao={atrasadas.length > 0}>Hoje</h2>
                {#if deHoje.length === 0}
                    <p class="vazio-texto">Nenhuma limpeza para hoje.</p>
                {:else}
                    <div class="lista">
                        {#each deHoje as t (t.id)}
                            {@render cartaoLimpeza(t)}
                        {/each}
                    </div>
                {/if}

                {#if proximasLimpezas.length > 0}
                    <h2 class="titulo-secao">Próximos dias</h2>
                    <div class="lista">
                        {#each proximasLimpezas as t (t.id)}
                            {@render cartaoLimpeza(t)}
                        {/each}
                    </div>
                {/if}

                {#if concluidas.length > 0}
                    <h2 class="titulo-secao">Concluídas recentemente</h2>
                    <div class="lista">
                        {#each concluidas as t (t.id)}
                            {@render cartaoLimpeza(t)}
                        {/each}
                    </div>
                {/if}
            {/if}
        {/if}

        {#if aba === "ocorrencias"}
            <button class="botao-principal largo" onclick={abrirForm}
                >+ Registrar ocorrência</button
            >

            <div class="filtros">
                <button
                    class="filtro"
                    class:ativo={filtroOco === "abertas"}
                    onclick={() => (filtroOco = "abertas")}
                >
                    Abertas ({abertas.length})
                </button>
                <button
                    class="filtro"
                    class:ativo={filtroOco === "resolvidas"}
                    onclick={() => (filtroOco = "resolvidas")}
                >
                    Resolvidas ({resolvidas.length})
                </button>
            </div>

            {#if listaOco.length === 0}
                <div class="vazio">
                    <img src="/atrios-simbolo.png" alt="" class="vazio-icone" />
                    <h2>
                        {filtroOco === "abertas"
                            ? "Tudo em ordem"
                            : "Nada resolvido ainda"}
                    </h2>
                    <p>
                        {filtroOco === "abertas"
                            ? "Nenhuma ocorrência aberta. Registre manutenção, danos ou reclamações quando surgirem."
                            : "As ocorrências resolvidas ficam guardadas aqui, como histórico."}
                    </p>
                </div>
            {:else}
                <div class="lista">
                    {#each listaOco as o (o.id)}
                        {@render cartaoOcorrencia(o)}
                    {/each}
                </div>
            {/if}
        {/if}

        {#if aba === "calendario"}
            <CalendarioMestre />
        {/if}
    {/if}
</main>

{#if formAberto}
    <div class="fundo" onclick={fecharForm} role="presentation">
        <div
            class="folha"
            onclick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Registrar ocorrência"
            tabindex="-1"
            onkeydown={(e) => e.key === "Escape" && fecharForm()}
        >
            <h2>Registrar ocorrência</h2>

            <label>
                Imóvel
                <select bind:value={formImovel}>
                    <option value="">Escolha o imóvel</option>
                    {#each imoveisLista as i (i.id)}
                        <option value={i.id}>{i.nome} · {i.cidade}</option>
                    {/each}
                </select>
            </label>

            <span class="rotulo">Tipo</span>
            <div class="tipos">
                {#each tiposOcorrencia as t (t.id)}
                    <button
                        type="button"
                        class="tipo"
                        class:ativo={formTipo === t.id}
                        onclick={() => (formTipo = t.id)}
                    >
                        {t.nome}
                    </button>
                {/each}
            </div>

            <label>
                Título
                <input
                    type="text"
                    bind:value={formTitulo}
                    maxlength="120"
                    placeholder="Ex: Torneira da cozinha vazando"
                />
            </label>

            <label>
                Detalhes (opcional)
                <textarea
                    bind:value={formDescricao}
                    rows="3"
                    placeholder="O que aconteceu e o que precisa ser feito?"
                ></textarea>
            </label>

            {#if erroForm}
                <p class="erro">{erroForm}</p>
            {/if}

            <button
                class="botao-principal largo"
                onclick={registrarOcorrencia}
                disabled={salvando}
            >
                {salvando ? "Registrando..." : "Registrar"}
            </button>
            <button
                class="link-acao centro"
                onclick={fecharForm}
                disabled={salvando}>Cancelar</button
            >
        </div>
    </div>
{/if}

<style>
    main {
        min-height: 100vh;
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

    .titulo-alerta {
        color: #b23a2f;
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
        margin: 0;
        font-size: 0.82rem;
        color: #b23a2f;
    }

    .erro-acao {
        margin: 0 0 1rem;
        padding: 0.7rem 0.9rem;
        border-radius: var(--raio-sm);
        background-color: #f4dedb;
        font-size: 0.8rem;
        color: #b23a2f;
    }

    .botao-principal {
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

    .botao-principal.largo {
        width: 100%;
    }

    .botao-principal:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .link-acao {
        padding: 0;
        border: none;
        background: none;
        font-family: var(--fonte-corpo);
        font-size: 0.8rem;
        font-weight: 700;
        color: var(--cor-texto);
        text-decoration: underline;
        cursor: pointer;
    }

    .link-acao.centro {
        align-self: center;
    }

    .link-acao:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    /* Abas */
    .abas {
        display: flex;
        gap: 0.2rem;
        padding: 0.25rem;
        margin-bottom: 1.25rem;
        overflow-x: auto;
        scrollbar-width: none;
        background-color: var(--atrios-branco);
        border-radius: var(--raio-pill);
        box-shadow: 0 2px 10px rgba(31, 42, 38, 0.08);
    }

    .abas::-webkit-scrollbar {
        display: none;
    }

    .aba {
        flex: 1 0 auto;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.3rem;
        padding: 0.65rem 0.8rem;
        border: none;
        border-radius: var(--raio-pill);
        background: none;
        font-family: var(--fonte-corpo);
        font-size: 0.75rem;
        font-weight: 500;
        white-space: nowrap;
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

    .contagem {
        min-width: 1.1rem;
        padding: 0.05rem 0.35rem;
        border-radius: var(--raio-pill);
        background-color: var(--atrios-verde-escuro);
        color: var(--atrios-creme);
        font-size: 0.62rem;
        font-weight: 700;
        text-align: center;
    }

    /* Hoje */
    .numeros {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.6rem;
        margin-bottom: 1.5rem;
    }

    .numero {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        padding: 0.95rem 0.8rem;
        background-color: var(--atrios-branco);
        border-radius: var(--raio-md);
        box-shadow: 0 2px 10px rgba(31, 42, 38, 0.06);
    }

    .numero-valor {
        font-family: var(--fonte-titulo);
        font-size: 1.5rem;
        font-weight: 800;
        color: var(--cor-texto);
    }

    .numero-rotulo {
        font-size: 0.72rem;
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

    .movimento,
    .proximo {
        display: flex;
        align-items: center;
        gap: 0.85rem;
        padding: 0.85rem 0.95rem;
        background-color: var(--atrios-branco);
        border-radius: var(--raio-md);
        box-shadow: 0 2px 10px rgba(31, 42, 38, 0.06);
    }

    .movimento-info {
        flex: 1;
        min-width: 0;
    }

    .movimento-imovel {
        margin: 0 0 0.15rem;
        font-size: 0.86rem;
        font-weight: 700;
        color: var(--cor-texto);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .movimento-detalhe {
        margin: 0;
        font-size: 0.73rem;
        color: var(--cor-texto);
        opacity: 0.65;
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

    .chip.alerta {
        background-color: #f4dedb;
        color: #b23a2f;
    }

    .chips {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 0.3rem;
    }

    .rodape-nota {
        margin: 1rem 0 0;
        font-size: 0.72rem;
        line-height: 1.45;
        color: var(--cor-texto);
        opacity: 0.6;
        text-align: center;
    }

    /* Limpeza e ocorrências */
    .card-tarefa {
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
        padding: 1rem;
        background-color: var(--atrios-branco);
        border-radius: var(--raio-lg);
        box-shadow: 0 4px 16px rgba(31, 42, 38, 0.08);
    }

    .card-tarefa.concluida {
        opacity: 0.7;
    }

    .tarefa-topo {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.6rem;
    }

    .tarefa-textos {
        min-width: 0;
    }

    .tarefa-imovel {
        margin: 0 0 0.15rem;
        font-size: 0.9rem;
        font-weight: 700;
        color: var(--cor-texto);
    }

    .tarefa-detalhe {
        margin: 0;
        font-size: 0.75rem;
        color: var(--cor-texto);
        opacity: 0.65;
    }

    .tarefa-nota {
        margin: 0;
        font-size: 0.78rem;
        line-height: 1.45;
        color: var(--cor-texto);
        opacity: 0.8;
    }

    .tarefa-autor {
        margin: 0;
        font-size: 0.7rem;
        color: var(--cor-texto);
        opacity: 0.55;
    }

    .tarefa-acoes {
        display: flex;
        gap: 0.5rem;
        padding-top: 0.7rem;
        border-top: 1px solid var(--atrios-creme);
    }

    .tarefa-base {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.8rem;
        padding-top: 0.7rem;
        border-top: 1px solid var(--atrios-creme);
    }

    .tarefa-feito {
        font-size: 0.75rem;
        color: var(--cor-texto);
        opacity: 0.7;
    }

    .acao,
    .acao-principal {
        flex: 1;
        padding: 0.65rem 0.5rem;
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

    .acao-principal {
        border: none;
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
    }

    .acao:disabled,
    .acao-principal:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .filtros {
        display: flex;
        gap: 0.5rem;
        margin: 1rem 0;
    }

    .filtro {
        flex: 1;
        padding: 0.6rem 0.5rem;
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

    .filtro.ativo {
        background-color: var(--atrios-dourado);
        font-weight: 700;
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

    /* Formulário de ocorrência (folha) */
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
        max-height: 92vh;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
        padding: 1.6rem 1.4rem calc(env(safe-area-inset-bottom, 0px) + 1.6rem);
        background-color: var(--atrios-branco);
        border-radius: var(--raio-lg) var(--raio-lg) 0 0;
        font-family: var(--fonte-corpo);
    }

    .folha h2 {
        margin: 0;
        font-size: 1.1rem;
    }

    .rotulo {
        font-size: 0.78rem;
        font-weight: 500;
        color: var(--cor-texto);
        margin-bottom: -0.4rem;
    }

    label {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        font-size: 0.78rem;
        font-weight: 500;
        color: var(--cor-texto);
    }

    input,
    select,
    textarea {
        width: 100%;
        min-width: 0;
        padding: 0.7rem 0.95rem;
        border: 1px solid var(--cor-borda);
        border-radius: var(--raio-sm);
        background-color: var(--atrios-creme);
        color: var(--cor-texto);
        font-family: var(--fonte-corpo);
        font-size: 0.85rem;
    }

    input:focus,
    select:focus,
    textarea:focus {
        outline: none;
        border-color: var(--atrios-dourado);
    }

    textarea {
        resize: vertical;
    }

    .tipos {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .tipo {
        padding: 0.5rem 0.95rem;
        border: 1px solid var(--cor-borda);
        border-radius: var(--raio-pill);
        background-color: var(--atrios-branco);
        color: var(--cor-texto);
        font-family: var(--fonte-corpo);
        font-size: 0.8rem;
        cursor: pointer;
    }

    .tipo.ativo {
        background-color: var(--atrios-dourado);
        border-color: var(--atrios-dourado);
        font-weight: 700;
    }
</style>
