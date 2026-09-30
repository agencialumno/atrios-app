<script lang="ts">
    import { untrack } from "svelte";
    import { goto } from "$app/navigation";
    import { api } from "$lib/api/client";
    import { auth, type Usuario } from "$lib/stores/auth";
    import { publicacao, type AreaComumEnvio } from "$lib/stores/publicacao";
    import { categorias } from "$lib/categorias";
    import { comodidades as catalogoComodidades } from "$lib/comodidades";
    import "../../lib/styles/theme.css";

    interface ImovelLista {
        id: string;
        nome: string;
        area_comum_fotos: string | null;
        area_comum_video: string | null;
    }

    interface AreaExistente {
        origem: string;
        fotos: string[];
        video: string | null;
    }

    const TOTAL_ETAPAS = 6;
    let etapaAtual = $state(1);

    let categoria = $state("");
    let nome = $state("");
    let endereco = $state("");
    let numero = $state("");
    let cidade = $state("");

    let capacidadeHospedes = $state(2);
    let quartos = $state(1);
    let banheiros = $state(1);
    let precoBaseNoite = $state(200);

    let descricao = $state("");
    let selecionadas = $state<string[]>([]);
    let outrasComodidades = $state("");

    let arquivosFotos: FileList | null = $state(null);
    let arquivoVideo: FileList | null = $state(null);

    // Área comum do condomínio
    let arquivosAreaFotos: FileList | null = $state(null);
    let arquivoAreaVideo: FileList | null = $state(null);
    let areaExistente = $state<AreaExistente | null>(null);
    let usarExistente = $state(true);
    let nomeBuscado = "";

    let erro = $state("");
    let tornandoAnfitriao = $state(false);

    let progressoEtapas = $derived((etapaAtual / TOTAL_ETAPAS) * 100);
    let nomeCategoria = $derived(
        categorias.find((c) => c.id === categoria)?.nome ?? "—",
    );
    let jaPublicando = $derived($publicacao.status === "enviando");

    let comodidadesFinais = $derived([
        ...selecionadas,
        ...outrasComodidades
            .split(",")
            .map((c) => c.trim())
            .filter((c) => c.length > 0),
    ]);

    let resumoArea = $derived.by(() => {
        if (areaExistente && usarExistente)
            return `Usando a do ${areaExistente.origem}`;

        const totalFotos = arquivosAreaFotos?.length ?? 0;
        const temVideo = !!arquivoAreaVideo && arquivoAreaVideo.length > 0;
        if (totalFotos === 0 && !temVideo) return "Não informada";

        return [
            totalFotos > 0 ? `${totalFotos} foto(s)` : "",
            temVideo ? "vídeo" : "",
        ]
            .filter((parte) => parte !== "")
            .join(" e ");
    });

    function lerLista(json: string | null): string[] {
        try {
            const lista = JSON.parse(json ?? "[]");
            return Array.isArray(lista) ? lista : [];
        } catch {
            return [];
        }
    }

    function normalizar(texto: string): string {
        return texto
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();
    }

    function descreverArea(area: AreaExistente): string {
        const partes: string[] = [];
        if (area.fotos.length > 0) {
            partes.push(
                `${area.fotos.length} ${area.fotos.length === 1 ? "foto" : "fotos"}`,
            );
        }
        if (area.video) partes.push("vídeo");
        return partes.join(" e ");
    }

    // Procura um anúncio ativo do mesmo condomínio que já tenha a área comum cadastrada
    async function procurarAreaComum() {
        const alvo = normalizar(nome);
        if (!alvo || alvo === nomeBuscado) return;

        nomeBuscado = alvo;
        areaExistente = null;
        usarExistente = true;

        try {
            const lista = await api<ImovelLista[]>("/imoveis");

            for (const im of lista) {
                if (normalizar(im.nome) !== alvo) continue;

                const fotos = lerLista(im.area_comum_fotos);
                const video = im.area_comum_video;

                if (fotos.length > 0 || video) {
                    areaExistente = { origem: im.nome, fotos, video };
                    return;
                }
            }
        } catch {
            // sem conexão: segue sem a sugestão, e a pessoa pode enviar a própria
        }
    }

    $effect(() => {
        if (etapaAtual === 5) {
            untrack(() => {
                void procurarAreaComum();
            });
        }
    });

    function montarArea(): AreaComumEnvio | null {
        if (areaExistente && usarExistente) {
            return {
                fotos: areaExistente.fotos,
                videoAtual: areaExistente.video,
                videoNovo: null,
            };
        }

        const fotosArea = arquivosAreaFotos
            ? Array.from(arquivosAreaFotos)
            : [];
        const videoArea =
            arquivoAreaVideo && arquivoAreaVideo.length > 0
                ? arquivoAreaVideo[0]
                : null;

        if (fotosArea.length === 0 && !videoArea) return null;

        return { fotos: fotosArea, videoAtual: null, videoNovo: videoArea };
    }

    function alternarComodidade(nomeComodidade: string) {
        selecionadas = selecionadas.includes(nomeComodidade)
            ? selecionadas.filter((n) => n !== nomeComodidade)
            : [...selecionadas, nomeComodidade];
    }

    async function tornarAnfitriao() {
        tornandoAnfitriao = true;
        erro = "";
        try {
            const usuarioAtualizado = await api<Usuario>(
                "/auth/tornar-proprietario",
                {
                    method: "POST",
                    autenticado: true,
                },
            );
            auth.atualizarUsuario(usuarioAtualizado);
        } catch (e) {
            erro =
                e instanceof Error
                    ? e.message
                    : "Erro ao ativar modo anfitrião";
        } finally {
            tornandoAnfitriao = false;
        }
    }

    function avancar() {
        erro = "";
        if (
            etapaAtual === 1 &&
            (!categoria || !nome || !endereco || !numero || !cidade)
        ) {
            erro = "Preencha todos os campos antes de continuar.";
            return;
        }
        if (etapaAtual < TOTAL_ETAPAS) {
            etapaAtual++;
        }
    }

    function voltarEtapa() {
        erro = "";
        if (etapaAtual > 1) {
            etapaAtual--;
        }
    }

    function publicar() {
        erro = "";

        const iniciou = publicacao.iniciar(
            {
                nome,
                endereco: `${endereco}, ${numero}`,
                cidade,
                categoria,
                capacidade_hospedes: capacidadeHospedes,
                quartos,
                banheiros,
                preco_base_noite: precoBaseNoite,
                descricao: descricao || null,
                comodidades: comodidadesFinais,
            },
            arquivosFotos ? Array.from(arquivosFotos) : [],
            arquivoVideo && arquivoVideo.length > 0 ? arquivoVideo[0] : null,
            montarArea(),
        );

        if (!iniciou) {
            erro =
                "Já existe um anúncio sendo publicado. Aguarde terminar para criar outro.";
            return;
        }

        goto("/home");
    }
</script>

<main>
    {#if !$auth.usuario?.pode_hospedar}
        <div class="convite">
            <img src="/atrios-simbolo.png" alt="Átrios" class="icone" />
            <h1>Torne-se um anfitrião Átrios</h1>
            <p class="ajuda">
                Anuncie seu imóvel e deixe a Átrios cuidar de tudo: hóspedes,
                limpeza, manutenção e prestação de contas — como uma coanfitriã
                de verdade.
            </p>

            {#if erro}
                <p class="erro">{erro}</p>
            {/if}

            <button
                class="botao-principal"
                onclick={tornarAnfitriao}
                disabled={tornandoAnfitriao}
            >
                {tornandoAnfitriao
                    ? "Ativando..."
                    : "Quero anunciar meu imóvel"}
            </button>

            <a href="/perfil" class="link-voltar">Voltar</a>
        </div>
    {:else}
        <div class="topo">
            {#if etapaAtual > 1}
                <button class="voltar" onclick={voltarEtapa}>←</button>
            {:else}
                <a href="/perfil" class="voltar">←</a>
            {/if}

            <div class="barra-progresso">
                <div
                    class="barra-preenchida"
                    style="width: {progressoEtapas}%"
                ></div>
            </div>

            <span class="contador-etapa">{etapaAtual}/{TOTAL_ETAPAS}</span>
        </div>

        <div class="conteudo-etapa">
            {#if etapaAtual === 1}
                <h1>Vamos conhecer o imóvel</h1>
                <p class="ajuda">
                    Comece escolhendo o tipo e informando onde ele fica.
                </p>

                <span class="rotulo-secao">Tipo do imóvel</span>
                <div class="tipos">
                    {#each categorias as cat (cat.id)}
                        <button
                            type="button"
                            class="tipo"
                            class:ativo={categoria === cat.id}
                            onclick={() => (categoria = cat.id)}
                        >
                            <span class="tipo-icone">{@html cat.icone}</span>
                            {cat.nome}
                        </button>
                    {/each}
                </div>

                <label>
                    Nome do condomínio
                    <input
                        type="text"
                        bind:value={nome}
                        placeholder="Ex: Etehe"
                    />
                </label>
                <label>
                    Endereço
                    <input
                        type="text"
                        bind:value={endereco}
                        placeholder="Rua ou avenida"
                    />
                </label>
                <label>
                    Número do apartamento
                    <input
                        type="text"
                        bind:value={numero}
                        placeholder="Ex: 302"
                    />
                </label>
                <label>
                    Cidade
                    <input
                        type="text"
                        bind:value={cidade}
                        placeholder="Rio de Janeiro"
                    />
                </label>
            {/if}

            {#if etapaAtual === 2}
                <h1>Quanto espaço ele oferece?</h1>
                <p class="ajuda">
                    Isso ajuda os hóspedes a saber se o imóvel serve pra eles.
                </p>

                <div class="linha">
                    <label>
                        Hóspedes
                        <input
                            type="number"
                            bind:value={capacidadeHospedes}
                            min="1"
                        />
                    </label>
                    <label>
                        Quartos
                        <input type="number" bind:value={quartos} min="1" />
                    </label>
                    <label>
                        Banheiros
                        <input type="number" bind:value={banheiros} min="1" />
                    </label>
                </div>

                <label>
                    Preço por noite (R$)
                    <input
                        type="number"
                        bind:value={precoBaseNoite}
                        min="0"
                        step="0.01"
                    />
                </label>
            {/if}

            {#if etapaAtual === 3}
                <h1>Conte a história desse lugar</h1>
                <p class="ajuda">
                    Uma boa descrição e as comodidades certas fazem toda a
                    diferença.
                </p>

                <label>
                    Descrição
                    <textarea
                        bind:value={descricao}
                        rows="4"
                        placeholder="O que torna esse imóvel especial?"
                    ></textarea>
                </label>

                <span class="rotulo-secao">O que o imóvel oferece</span>
                <div class="comodidades-grade">
                    {#each catalogoComodidades as c (c.id)}
                        <button
                            type="button"
                            class="comodidade-opcao"
                            class:ativa={selecionadas.includes(c.nome)}
                            onclick={() => alternarComodidade(c.nome)}
                        >
                            <span class="comodidade-icone">{@html c.icone}</span
                            >
                            <span class="comodidade-texto">{c.nome}</span>
                        </button>
                    {/each}
                </div>

                <label>
                    Outras comodidades (opcional)
                    <input
                        type="text"
                        bind:value={outrasComodidades}
                        placeholder="Separe por vírgula. Ex: piano, vista para o mar"
                    />
                </label>
            {/if}

            {#if etapaAtual === 4}
                <h1>Hora de mostrar o imóvel</h1>
                <p class="ajuda">
                    Fotos de qualidade atraem mais hóspedes. Um vídeo de tour é
                    um diferencial e tanto.
                </p>

                <span class="rotulo-secao">Fotos do imóvel</span>
                <label
                    class="dropzone"
                    class:preenchida={arquivosFotos && arquivosFotos.length > 0}
                >
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        bind:files={arquivosFotos}
                        class="input-oculto"
                    />
                    {#if arquivosFotos && arquivosFotos.length > 0}
                        <span class="icone-dropzone">✓</span>
                        <span class="texto-dropzone-principal">
                            {arquivosFotos.length} foto(s) selecionada(s)
                        </span>
                        <span class="texto-dropzone-secundario"
                            >Toque para trocar</span
                        >
                    {:else}
                        <span class="icone-dropzone">📷</span>
                        <span class="texto-dropzone-principal"
                            >Toque para escolher fotos</span
                        >
                        <span class="texto-dropzone-secundario">
                            Você pode selecionar várias de uma vez
                        </span>
                    {/if}
                </label>

                <span class="rotulo-secao">Vídeo do tour (opcional)</span>
                <label
                    class="dropzone"
                    class:preenchida={arquivoVideo && arquivoVideo.length > 0}
                >
                    <input
                        type="file"
                        accept="video/*"
                        bind:files={arquivoVideo}
                        class="input-oculto"
                    />
                    {#if arquivoVideo && arquivoVideo.length > 0}
                        <span class="icone-dropzone">✓</span>
                        <span class="texto-dropzone-principal"
                            >Vídeo selecionado</span
                        >
                        <span class="texto-dropzone-secundario"
                            >Toque para trocar</span
                        >
                    {:else}
                        <span class="icone-dropzone">🎬</span>
                        <span class="texto-dropzone-principal"
                            >Toque para escolher um vídeo</span
                        >
                        <span class="texto-dropzone-secundario">
                            Grave na vertical (1080×1920), como no celular
                        </span>
                    {/if}
                </label>
            {/if}

            {#if etapaAtual === 5}
                <h1>E o condomínio?</h1>
                <p class="ajuda">
                    Mostre a área comum (piscina, academia, salão...). É
                    opcional, mas ajuda o hóspede a decidir. Você pode pular
                    esta etapa.
                </p>

                {#if areaExistente}
                    <div class="area-existente">
                        {#if areaExistente.fotos.length > 0}
                            <img
                                class="area-miniatura"
                                src={areaExistente.fotos[0]}
                                alt=""
                            />
                        {/if}
                        <div class="area-existente-textos">
                            <p class="area-existente-titulo">
                                Já temos a área comum do {areaExistente.origem}
                            </p>
                            <p class="area-existente-sub">
                                {descreverArea(areaExistente)}
                            </p>
                        </div>
                    </div>

                    <div class="opcoes">
                        <button
                            type="button"
                            class="opcao"
                            class:ativa={usarExistente}
                            onclick={() => (usarExistente = true)}
                        >
                            Usar esta
                        </button>
                        <button
                            type="button"
                            class="opcao"
                            class:ativa={!usarExistente}
                            onclick={() => (usarExistente = false)}
                        >
                            Enviar a minha
                        </button>
                    </div>
                {/if}

                {#if !areaExistente || !usarExistente}
                    <span class="rotulo-secao">Fotos da área comum</span>
                    <label
                        class="dropzone"
                        class:preenchida={arquivosAreaFotos &&
                            arquivosAreaFotos.length > 0}
                    >
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            bind:files={arquivosAreaFotos}
                            class="input-oculto"
                        />
                        {#if arquivosAreaFotos && arquivosAreaFotos.length > 0}
                            <span class="icone-dropzone">✓</span>
                            <span class="texto-dropzone-principal">
                                {arquivosAreaFotos.length} foto(s) selecionada(s)
                            </span>
                            <span class="texto-dropzone-secundario"
                                >Toque para trocar</span
                            >
                        {:else}
                            <span class="icone-dropzone">🏊</span>
                            <span class="texto-dropzone-principal"
                                >Toque para escolher fotos</span
                            >
                            <span class="texto-dropzone-secundario">
                                Piscina, academia, salão de festas, quadra...
                            </span>
                        {/if}
                    </label>

                    <span class="rotulo-secao"
                        >Vídeo da área comum (opcional)</span
                    >
                    <label
                        class="dropzone"
                        class:preenchida={arquivoAreaVideo &&
                            arquivoAreaVideo.length > 0}
                    >
                        <input
                            type="file"
                            accept="video/*"
                            bind:files={arquivoAreaVideo}
                            class="input-oculto"
                        />
                        {#if arquivoAreaVideo && arquivoAreaVideo.length > 0}
                            <span class="icone-dropzone">✓</span>
                            <span class="texto-dropzone-principal"
                                >Vídeo selecionado</span
                            >
                            <span class="texto-dropzone-secundario"
                                >Toque para trocar</span
                            >
                        {:else}
                            <span class="icone-dropzone">🎬</span>
                            <span class="texto-dropzone-principal"
                                >Toque para escolher um vídeo</span
                            >
                            <span class="texto-dropzone-secundario"
                                >Um passeio pelo condomínio</span
                            >
                        {/if}
                    </label>
                {/if}
            {/if}

            {#if etapaAtual === 6}
                <h1>Tudo certo?</h1>
                <p class="ajuda">
                    Confira os dados antes de publicar. Você pode editar o
                    anúncio depois.
                </p>

                <div class="resumo">
                    <div class="resumo-linha">
                        <span>Tipo</span>
                        <strong>{nomeCategoria}</strong>
                    </div>
                    <div class="resumo-linha">
                        <span>Condomínio</span>
                        <strong>{nome}</strong>
                    </div>
                    <div class="resumo-linha">
                        <span>Endereço</span>
                        <strong>{endereco}, {numero}</strong>
                    </div>
                    <div class="resumo-linha">
                        <span>Cidade</span>
                        <strong>{cidade}</strong>
                    </div>
                    <div class="resumo-linha">
                        <span>Capacidade</span>
                        <strong>
                            {capacidadeHospedes} hóspede(s) · {quartos} quarto(s)
                            · {banheiros} banheiro(s)
                        </strong>
                    </div>
                    <div class="resumo-linha">
                        <span>Preço</span>
                        <strong>R$ {precoBaseNoite}/noite</strong>
                    </div>
                    <div class="resumo-linha">
                        <span>Comodidades</span>
                        <strong>{comodidadesFinais.length}</strong>
                    </div>
                    <div class="resumo-linha">
                        <span>Fotos</span>
                        <strong>{arquivosFotos?.length ?? 0}</strong>
                    </div>
                    <div class="resumo-linha">
                        <span>Vídeo do tour</span>
                        <strong
                            >{arquivoVideo && arquivoVideo.length > 0
                                ? "Sim"
                                : "Não"}</strong
                        >
                    </div>
                    <div class="resumo-linha">
                        <span>Área comum</span>
                        <strong>{resumoArea}</strong>
                    </div>
                </div>

                {#if !arquivosFotos || arquivosFotos.length === 0}
                    <p class="aviso">
                        Sem fotos, o anúncio aparece com o símbolo da Átrios.
                        Você pode adicionar depois, editando o anúncio.
                    </p>
                {/if}

                {#if jaPublicando}
                    <p class="aviso">
                        Aguarde o anúncio em andamento terminar para publicar
                        outro.
                    </p>
                {/if}
            {/if}
        </div>

        <div class="rodape">
            {#if erro}
                <p class="erro">{erro}</p>
            {/if}

            {#if etapaAtual < TOTAL_ETAPAS}
                <button class="botao-principal" onclick={avancar}>
                    {etapaAtual === 5 && resumoArea === "Não informada"
                        ? "Pular esta etapa"
                        : "Continuar"}
                </button>
            {:else}
                <button
                    class="botao-principal"
                    onclick={publicar}
                    disabled={jaPublicando}
                >
                    Publicar anúncio
                </button>
            {/if}
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

    /* Convite para virar anfitrião */
    .convite {
        min-height: 100dvh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        padding: 2rem 1.5rem;
        text-align: center;
    }

    .icone {
        width: 72px;
        height: auto;
    }

    .convite h1 {
        margin: 0;
    }

    .convite .botao-principal {
        max-width: 320px;
    }

    .link-voltar {
        font-size: 0.85rem;
        color: var(--cor-texto);
        opacity: 0.65;
        text-decoration: underline;
    }

    /* Topo com progresso */
    .topo {
        display: flex;
        align-items: center;
        gap: 0.9rem;
        padding: 1.25rem 1.1rem 0.75rem;
    }

    .voltar {
        width: 38px;
        height: 38px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        border-radius: 50%;
        background-color: var(--atrios-branco);
        box-shadow: 0 2px 10px rgba(31, 42, 38, 0.08);
        color: var(--cor-texto);
        text-decoration: none;
        font-size: 1.05rem;
        cursor: pointer;
    }

    .barra-progresso {
        flex: 1;
        height: 6px;
        border-radius: var(--raio-pill);
        background-color: var(--cor-borda);
        overflow: hidden;
    }

    .barra-preenchida {
        height: 100%;
        border-radius: var(--raio-pill);
        background-color: var(--atrios-dourado);
        transition: width 0.3s ease;
    }

    .contador-etapa {
        flex-shrink: 0;
        font-size: 0.78rem;
        font-weight: 600;
        color: var(--cor-texto);
        opacity: 0.7;
    }

    .conteudo-etapa {
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
        padding: 0.75rem 1.25rem 1rem;
    }

    h1 {
        margin: 0;
        font-size: 1.3rem;
        color: var(--cor-texto);
    }

    .ajuda {
        margin: -0.4rem 0 0.2rem;
        font-size: 0.85rem;
        line-height: 1.45;
        color: var(--cor-texto);
        opacity: 0.7;
    }

    .erro {
        margin: 0;
        font-size: 0.8rem;
        color: #b23a2f;
    }

    .aviso {
        margin: 0;
        padding: 0.7rem 0.9rem;
        border-radius: var(--raio-sm);
        background-color: var(--atrios-creme);
        font-size: 0.78rem;
        line-height: 1.45;
        color: var(--cor-texto);
    }

    /* Campos */
    .rotulo-secao {
        margin-top: 0.2rem;
        font-size: 0.78rem;
        font-weight: 500;
        color: var(--cor-texto);
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
    textarea {
        width: 100%;
        min-width: 0;
        padding: 0.75rem 1rem;
        border: 1px solid var(--cor-borda);
        border-radius: var(--raio-sm);
        background-color: var(--atrios-branco);
        color: var(--cor-texto);
        font-family: var(--fonte-corpo);
        font-size: 0.88rem;
    }

    input:focus,
    textarea:focus {
        outline: none;
        border-color: var(--atrios-dourado);
    }

    textarea {
        resize: vertical;
    }

    .linha {
        display: flex;
        gap: 0.5rem;
    }

    .linha label {
        flex: 1;
        min-width: 0;
    }

    .linha input {
        padding: 0.75rem 0.5rem;
    }

    .tipos {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .tipo {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.55rem 0.95rem;
        border: 1px solid var(--cor-borda);
        border-radius: var(--raio-pill);
        background-color: var(--atrios-branco);
        color: var(--cor-texto);
        font-family: var(--fonte-corpo);
        font-size: 0.8rem;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .tipo.ativo {
        background-color: var(--atrios-dourado);
        border-color: var(--atrios-dourado);
        font-weight: 600;
    }

    .tipo-icone {
        display: inline-flex;
        width: 18px;
        height: 18px;
    }

    .tipo-icone :global(svg) {
        width: 100%;
        height: 100%;
    }

    .comodidades-grade {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.5rem;
    }

    .comodidade-opcao {
        display: flex;
        align-items: center;
        gap: 0.55rem;
        min-width: 0;
        padding: 0.6rem 0.7rem;
        border: 1.5px solid var(--cor-borda);
        border-radius: var(--raio-md);
        background-color: var(--atrios-branco);
        color: var(--cor-texto);
        font-family: var(--fonte-corpo);
        font-size: 0.78rem;
        text-align: left;
        cursor: pointer;
        transition:
            background-color 0.2s,
            border-color 0.2s;
    }

    .comodidade-opcao.ativa {
        border-color: var(--atrios-dourado);
        background-color: rgba(201, 169, 107, 0.2);
        font-weight: 600;
    }

    .comodidade-icone {
        flex-shrink: 0;
        display: inline-flex;
        width: 20px;
        height: 20px;
    }

    .comodidade-icone :global(svg) {
        width: 100%;
        height: 100%;
    }

    .comodidade-texto {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    /* Envio de arquivos */
    .dropzone {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
        padding: 1.4rem 1rem;
        border: 2px dashed var(--cor-borda);
        border-radius: var(--raio-md);
        background-color: var(--atrios-branco);
        text-align: center;
        cursor: pointer;
    }

    .dropzone.preenchida {
        border-color: var(--atrios-dourado);
        background-color: rgba(201, 169, 107, 0.12);
    }

    .input-oculto {
        display: none;
    }

    .icone-dropzone {
        font-size: 1.5rem;
    }

    .texto-dropzone-principal {
        font-size: 0.88rem;
        font-weight: 600;
        color: var(--cor-texto);
    }

    .texto-dropzone-secundario {
        font-size: 0.72rem;
        font-weight: 400;
        color: var(--cor-texto);
        opacity: 0.65;
    }

    /* Área comum já cadastrada */
    .area-existente {
        display: flex;
        align-items: center;
        gap: 0.9rem;
        padding: 0.75rem;
        border-radius: var(--raio-lg);
        background-color: var(--atrios-branco);
        box-shadow: 0 4px 16px rgba(31, 42, 38, 0.08);
    }

    .area-miniatura {
        width: 64px;
        height: 64px;
        flex-shrink: 0;
        border-radius: var(--raio-md);
        object-fit: cover;
        background-color: var(--atrios-creme);
    }

    .area-existente-textos {
        min-width: 0;
    }

    .area-existente-titulo {
        margin: 0 0 0.2rem;
        font-size: 0.86rem;
        font-weight: 700;
        line-height: 1.3;
        color: var(--cor-texto);
    }

    .area-existente-sub {
        margin: 0;
        font-size: 0.75rem;
        color: var(--cor-texto);
        opacity: 0.65;
    }

    .opcoes {
        display: flex;
        gap: 0.5rem;
    }

    .opcao {
        flex: 1;
        padding: 0.7rem 0.5rem;
        border: 1.5px solid var(--cor-borda);
        border-radius: var(--raio-pill);
        background-color: var(--atrios-branco);
        color: var(--cor-texto);
        font-family: var(--fonte-corpo);
        font-size: 0.82rem;
        font-weight: 500;
        cursor: pointer;
    }

    .opcao.ativa {
        border-color: var(--atrios-dourado);
        background-color: var(--atrios-dourado);
        font-weight: 700;
    }

    /* Resumo */
    .resumo {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding: 1.1rem;
        border-radius: var(--raio-lg);
        background-color: var(--atrios-branco);
        box-shadow: 0 4px 16px rgba(31, 42, 38, 0.08);
    }

    .resumo-linha {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        font-size: 0.82rem;
        color: var(--cor-texto);
    }

    .resumo-linha span {
        flex-shrink: 0;
        opacity: 0.65;
    }

    .resumo-linha strong {
        text-align: right;
        font-weight: 600;
    }

    /* Rodapé */
    .rodape {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 40;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        padding: 0.9rem 1.1rem calc(env(safe-area-inset-bottom, 0px) + 1rem);
        background-color: var(--atrios-branco);
        border-radius: var(--raio-lg) var(--raio-lg) 0 0;
        box-shadow: 0 -4px 16px rgba(31, 42, 38, 0.1);
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

    .botao-principal:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    /* ===== Desktop: assistente centralizado, como um cartão ===== */
    @media (min-width: 960px) {
        main {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding-bottom: 3rem;
        }

        .convite {
            min-height: 70dvh;
        }

        .topo,
        .conteudo-etapa {
            width: 100%;
            max-width: 640px;
        }

        .comodidades-grade {
            grid-template-columns: repeat(3, 1fr);
        }

        .rodape {
            position: static;
            width: 100%;
            max-width: 640px;
            border-radius: var(--raio-lg);
            box-shadow: 0 4px 16px rgba(31, 42, 38, 0.08);
            margin-top: 1rem;
        }

        .botao-principal {
            max-width: 320px;
            margin: 0 auto;
        }
    }
</style>
