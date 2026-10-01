<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { api } from "$lib/api/client";
    import { auth } from "$lib/stores/auth";
    import { publicacao, type AreaComumEnvio } from "$lib/stores/publicacao";
    import { categorias } from "$lib/categorias";
    import {
        comodidades as catalogo,
        encontrarComodidade,
    } from "$lib/comodidades";
    import Preloader from "$lib/components/Preloader.svelte";
    import ModalErro from "$lib/components/ModalErro.svelte";
    import "$lib/styles/theme.css";

    interface ImovelApi {
        id: string;
        proprietario_id: string;
        nome: string;
        endereco: string;
        cidade: string;
        categoria: string | null;
        capacidade_hospedes: number;
        quartos: number;
        banheiros: number;
        preco_base_noite: number;
        descricao: string | null;
        comodidades: string | null;
        fotos: string | null;
        video_tour: string | null;
        area_comum_fotos: string | null;
        area_comum_video: string | null;
        status: string;
    }

    interface ItemFoto {
        chave: string;
        url: string;
        arquivo: File | null;
    }

    let contador = 0;
    const novaChave = () => `f${++contador}`;

    let imovel = $state<ImovelApi | null>(null);
    let carregando = $state(true);
    let erroCarga = $state("");

    let categoria = $state<string | null>(null);
    let categoriaOriginal = $state<string | null>(null);
    let nome = $state("");
    let endereco = $state("");
    let cidade = $state("");
    let capacidadeHospedes = $state(1);
    let quartos = $state(1);
    let banheiros = $state(1);
    let precoBaseNoite = $state(0);
    let descricao = $state("");
    let selecionadas = $state<string[]>([]);
    let outras = $state("");

    let fotos = $state<ItemFoto[]>([]);
    let videoAtual = $state<string | null>(null);
    let videoNovo = $state<File | null>(null);

    let areaFotos = $state<ItemFoto[]>([]);
    let areaVideoAtual = $state<string | null>(null);
    let areaVideoNovo = $state<File | null>(null);
    let areaAlterada = $state(false);

    let erro = $state("");
    let alterandoStatus = $state(false);

    let idImovel = $derived($page.params.id);
    let jaPublicando = $derived($publicacao.status === "enviando");
    let ativo = $derived(imovel?.status === "ativo");

    let semPermissao = $derived(
        !!imovel &&
            !!$auth.usuario &&
            imovel.proprietario_id !== $auth.usuario.id &&
            $auth.usuario.papel !== "equipe",
    );

    let comodidadesFinais = $derived([
        ...selecionadas,
        ...outras
            .split(",")
            .map((c) => c.trim())
            .filter((c) => c.length > 0),
    ]);

    function lerLista(json: string | null): string[] {
        try {
            const lista = JSON.parse(json ?? "[]");
            return Array.isArray(lista) ? lista : [];
        } catch {
            return [];
        }
    }

    onMount(async () => {
        try {
            const dados = await api<ImovelApi>(`/imoveis/${idImovel}`);
            imovel = dados;

            nome = dados.nome;
            endereco = dados.endereco;
            cidade = dados.cidade;
            categoria = dados.categoria;
            categoriaOriginal = dados.categoria;
            capacidadeHospedes = dados.capacidade_hospedes;
            quartos = dados.quartos;
            banheiros = dados.banheiros;
            precoBaseNoite = dados.preco_base_noite;
            descricao = dados.descricao ?? "";

            const conhecidas: string[] = [];
            const restantes: string[] = [];
            for (const texto of lerLista(dados.comodidades)) {
                const achada = encontrarComodidade(texto);
                if (achada) {
                    if (!conhecidas.includes(achada.nome))
                        conhecidas.push(achada.nome);
                } else {
                    restantes.push(texto);
                }
            }
            selecionadas = conhecidas;
            outras = restantes.join(", ");

            fotos = lerLista(dados.fotos).map((url) => ({
                chave: novaChave(),
                url,
                arquivo: null,
            }));
            videoAtual = dados.video_tour;

            areaFotos = lerLista(dados.area_comum_fotos).map((url) => ({
                chave: novaChave(),
                url,
                arquivo: null,
            }));
            areaVideoAtual = dados.area_comum_video;
        } catch (e) {
            erroCarga =
                e instanceof Error ? e.message : "Erro ao carregar o anúncio";
        } finally {
            carregando = false;
        }
    });

    onDestroy(() => {
        for (const f of [...fotos, ...areaFotos]) {
            if (f.arquivo) URL.revokeObjectURL(f.url);
        }
    });

    function alternarComodidade(nomeComodidade: string) {
        selecionadas = selecionadas.includes(nomeComodidade)
            ? selecionadas.filter((n) => n !== nomeComodidade)
            : [...selecionadas, nomeComodidade];
    }

    function paraItens(input: HTMLInputElement): ItemFoto[] {
        const arquivos = Array.from(input.files ?? []);
        return arquivos.map((a) => ({
            chave: novaChave(),
            url: URL.createObjectURL(a),
            arquivo: a,
        }));
    }

    function trocar(
        lista: ItemFoto[],
        indice: number,
        delta: number,
    ): ItemFoto[] {
        const destino = indice + delta;
        if (destino < 0 || destino >= lista.length) return lista;
        const copia = [...lista];
        [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
        return copia;
    }

    function adicionarFotos(e: Event) {
        const input = e.currentTarget as HTMLInputElement;
        fotos = [...fotos, ...paraItens(input)];
        input.value = "";
    }

    function removerFoto(chave: string) {
        const item = fotos.find((f) => f.chave === chave);
        if (item?.arquivo) URL.revokeObjectURL(item.url);
        fotos = fotos.filter((f) => f.chave !== chave);
    }

    function moverFoto(indice: number, delta: number) {
        fotos = trocar(fotos, indice, delta);
    }

    function escolherVideo(e: Event) {
        const input = e.currentTarget as HTMLInputElement;
        const arquivo = input.files?.[0];
        if (arquivo) videoNovo = arquivo;
        input.value = "";
    }

    function removerVideo() {
        videoNovo = null;
        videoAtual = null;
    }

    function adicionarAreaFotos(e: Event) {
        const input = e.currentTarget as HTMLInputElement;
        areaFotos = [...areaFotos, ...paraItens(input)];
        areaAlterada = true;
        input.value = "";
    }

    function removerAreaFoto(chave: string) {
        const item = areaFotos.find((f) => f.chave === chave);
        if (item?.arquivo) URL.revokeObjectURL(item.url);
        areaFotos = areaFotos.filter((f) => f.chave !== chave);
        areaAlterada = true;
    }

    function moverAreaFoto(indice: number, delta: number) {
        areaFotos = trocar(areaFotos, indice, delta);
        areaAlterada = true;
    }

    function escolherAreaVideo(e: Event) {
        const input = e.currentTarget as HTMLInputElement;
        const arquivo = input.files?.[0];
        if (arquivo) {
            areaVideoNovo = arquivo;
            areaAlterada = true;
        }
        input.value = "";
    }

    function removerAreaVideo() {
        areaVideoNovo = null;
        areaVideoAtual = null;
        areaAlterada = true;
    }

    async function alternarStatus() {
        if (!imovel) return;

        alterandoStatus = true;
        erro = "";

        try {
            imovel = await api<ImovelApi>(`/imoveis/${imovel.id}/status`, {
                method: "POST",
                autenticado: true,
                body: {
                    status: imovel.status === "ativo" ? "pausado" : "ativo",
                },
            });
        } catch (e) {
            erro =
                e instanceof Error
                    ? e.message
                    : "Não foi possível alterar o status";
        } finally {
            alterandoStatus = false;
        }
    }

    function validar(): string {
        if (!nome.trim() || !endereco.trim() || !cidade.trim()) {
            return "Preencha nome, endereço e cidade.";
        }
        if (
            !(capacidadeHospedes >= 1) ||
            !(quartos >= 1) ||
            !(banheiros >= 1)
        ) {
            return "Hóspedes, quartos e banheiros precisam ser pelo menos 1.";
        }
        if (!(precoBaseNoite > 0)) {
            return "Informe um preço por noite maior que zero.";
        }
        if (fotos.length === 0) {
            return "Mantenha pelo menos uma foto no anúncio.";
        }
        return "";
    }

    function salvar() {
        if (!imovel) return;

        erro = validar();
        if (erro) return;

        const area: AreaComumEnvio | null = areaAlterada
            ? {
                  fotos: areaFotos.map((f) => f.arquivo ?? f.url),
                  videoAtual: areaVideoAtual,
                  videoNovo: areaVideoNovo,
              }
            : null;

        const iniciou = publicacao.iniciarEdicao(
            imovel.id,
            {
                nome: nome.trim(),
                endereco: endereco.trim(),
                cidade: cidade.trim(),
                categoria: categoria || null,
                capacidade_hospedes: capacidadeHospedes,
                quartos,
                banheiros,
                preco_base_noite: precoBaseNoite,
                descricao: descricao.trim() || null,
                comodidades: comodidadesFinais,
            },
            fotos.map((f) => f.arquivo ?? f.url),
            { atual: videoAtual, novo: videoNovo },
            area,
        );

        if (!iniciou) {
            erro =
                "Já existe uma publicação em andamento. Aguarde terminar para salvar.";
            return;
        }

        goto("/anfitriao");
    }
</script>

{#snippet grade(
    itens: ItemFoto[],
    mover: (indice: number, delta: number) => void,
    remover: (chave: string) => void,
    mostrarCapa: boolean,
)}
    <div class="grade-fotos">
        {#each itens as foto, i (foto.chave)}
            <div class="tile">
                <img src={foto.url} alt="Foto {i + 1}" />
                {#if mostrarCapa && i === 0}<span class="etiqueta capa"
                        >Capa</span
                    >{/if}
                {#if foto.arquivo}<span class="etiqueta nova">Nova</span>{/if}
                <div class="tile-acoes">
                    <button
                        onclick={() => mover(i, -1)}
                        disabled={i === 0}
                        aria-label="Mover para trás"
                    >
                        ‹
                    </button>
                    <button
                        onclick={() => remover(foto.chave)}
                        aria-label="Remover foto">✕</button
                    >
                    <button
                        onclick={() => mover(i, 1)}
                        disabled={i === itens.length - 1}
                        aria-label="Mover para frente"
                    >
                        ›
                    </button>
                </div>
            </div>
        {/each}
    </div>
{/snippet}

<main>
    {#if carregando}
        <div class="carregando-wrapper">
            <Preloader />
            <p>Carregando o anúncio...</p>
        </div>
    {:else if erroCarga || !imovel}
        <div class="topo">
            <a href="/anfitriao" class="voltar">←</a>
        </div>
        <p class="erro-pagina">{erroCarga || "Anúncio não encontrado."}</p>
    {:else if semPermissao}
        <div class="topo">
            <a href="/anfitriao" class="voltar">←</a>
        </div>
        <p class="erro-pagina">Você não pode editar este anúncio.</p>
    {:else}
        <div class="topo">
            <a href="/anfitriao" class="voltar">←</a>
            <h1>Editar anúncio</h1>
        </div>

        <div class="conteudo conteudo-grade">
            <section class="cartao status status-full" class:pausado={!ativo}>
                <div class="status-textos">
                    <p class="status-titulo">
                        {ativo ? "Anúncio ativo" : "Anúncio pausado"}
                    </p>
                    <p class="status-detalhe">
                        {ativo
                            ? "Aparece na home e aceita reservas."
                            : "Não aparece na home nem aceita novas reservas. As reservas já feitas continuam valendo."}
                    </p>
                </div>
                <button
                    class="botao-status"
                    onclick={alternarStatus}
                    disabled={alterandoStatus}
                >
                    {alterandoStatus ? "..." : ativo ? "Pausar" : "Reativar"}
                </button>
            </section>

            <section class="cartao">
                <h2>Fotos</h2>
                <p class="ajuda">
                    A primeira foto é a capa. Use as setas para reordenar.
                </p>

                {@render grade(fotos, moverFoto, removerFoto, true)}

                <label class="adicionar">
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        onchange={adicionarFotos}
                        class="input-oculto"
                    />
                    + Adicionar fotos
                </label>
            </section>

            <section class="cartao">
                <h2>Vídeo do tour</h2>

                {#if videoNovo}
                    <div class="video-linha">
                        <span class="video-texto"
                            >Novo vídeo: {videoNovo.name}</span
                        >
                        <button
                            class="link-acao"
                            onclick={() => (videoNovo = null)}>Desfazer</button
                        >
                    </div>
                {:else if videoAtual}
                    <div class="video-linha">
                        <span class="video-texto"
                            >Tour em vídeo cadastrado ✓</span
                        >
                        <div class="video-botoes">
                            <label class="link-acao">
                                Trocar
                                <input
                                    type="file"
                                    accept="video/*"
                                    onchange={escolherVideo}
                                    class="input-oculto"
                                />
                            </label>
                            <button
                                class="link-acao perigo"
                                onclick={removerVideo}>Remover</button
                            >
                        </div>
                    </div>
                {:else}
                    <label class="adicionar">
                        <input
                            type="file"
                            accept="video/*"
                            onchange={escolherVideo}
                            class="input-oculto"
                        />
                        + Adicionar vídeo (grave na vertical, 1080×1920)
                    </label>
                {/if}
            </section>

            <section class="cartao">
                <h2>Área comum do condomínio</h2>
                <p class="ajuda">
                    Fotos e vídeo da piscina, academia, salão... Aparecem no
                    botão "Veja como é a área comum do condomínio". A primeira
                    foto é a capa do botão.
                </p>

                {#if areaFotos.length > 0}
                    {@render grade(
                        areaFotos,
                        moverAreaFoto,
                        removerAreaFoto,
                        true,
                    )}
                {/if}

                <label class="adicionar">
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        onchange={adicionarAreaFotos}
                        class="input-oculto"
                    />
                    + Adicionar fotos da área comum
                </label>

                {#if areaVideoNovo}
                    <div class="video-linha">
                        <span class="video-texto"
                            >Novo vídeo: {areaVideoNovo.name}</span
                        >
                        <button
                            class="link-acao"
                            onclick={() => {
                                areaVideoNovo = null;
                                areaAlterada = true;
                            }}
                        >
                            Desfazer
                        </button>
                    </div>
                {:else if areaVideoAtual}
                    <div class="video-linha">
                        <span class="video-texto"
                            >Vídeo da área comum cadastrado ✓</span
                        >
                        <div class="video-botoes">
                            <label class="link-acao">
                                Trocar
                                <input
                                    type="file"
                                    accept="video/*"
                                    onchange={escolherAreaVideo}
                                    class="input-oculto"
                                />
                            </label>
                            <button
                                class="link-acao perigo"
                                onclick={removerAreaVideo}>Remover</button
                            >
                        </div>
                    </div>
                {:else}
                    <label class="adicionar">
                        <input
                            type="file"
                            accept="video/*"
                            onchange={escolherAreaVideo}
                            class="input-oculto"
                        />
                        + Adicionar vídeo da área comum
                    </label>
                {/if}
            </section>

            <section class="cartao">
                <h2>Comodidades</h2>

                <div class="comodidades-grade">
                    {#each catalogo as c (c.id)}
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
                        bind:value={outras}
                        placeholder="Separe por vírgula. Ex: piano, vista para o mar"
                    />
                </label>
            </section>

            <section class="cartao coluna-direita-inicio">
                <h2>Dados do imóvel</h2>

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
                {#if categoria !== categoriaOriginal}
                    <p class="dica">
                        Mudar o tipo muda a categoria em que o anúncio aparece
                        na home.
                    </p>
                {:else if !categoria}
                    <p class="dica">
                        Sem tipo definido, o anúncio só aparece em "Em
                        destaque".
                    </p>
                {/if}

                <label>
                    Nome do condomínio
                    <input type="text" bind:value={nome} />
                </label>
                <label>
                    Endereço e número
                    <input type="text" bind:value={endereco} />
                </label>
                <label>
                    Cidade
                    <input type="text" bind:value={cidade} />
                </label>

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
                <p class="dica">
                    O preço novo vale só para reservas futuras. As já feitas
                    mantêm o valor combinado.
                </p>

                <label>
                    Descrição
                    <textarea bind:value={descricao} rows="4"></textarea>
                </label>
            </section>
        </div>

        <div class="rodape rodape-desktop">
            {#if jaPublicando}
                <p class="aviso">
                    Aguarde a publicação em andamento terminar para salvar.
                </p>
            {/if}
            <button
                class="botao-principal"
                onclick={salvar}
                disabled={jaPublicando}
            >
                Salvar alterações
            </button>
        </div>
    {/if}
</main>
<ModalErro mensagem={erro} aoFechar={() => (erro = "")} />

<style>
    main {
        min-height: 100dvh;
        background-color: var(--cor-fundo);
        font-family: var(--fonte-corpo);
        padding-bottom: 150px;
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

    .erro-pagina {
        padding: 1rem 1.25rem;
        font-size: 0.85rem;
        color: #b23a2f;
    }

    .conteudo {
        padding: 0.5rem 1.1rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
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

    .cartao h2 {
        margin: 0;
        font-size: 1rem;
        color: var(--cor-texto);
    }

    .ajuda {
        margin: -0.4rem 0 0;
        font-size: 0.78rem;
        line-height: 1.4;
        color: var(--cor-texto);
        opacity: 0.65;
    }

    .dica {
        margin: -0.3rem 0 0;
        font-size: 0.72rem;
        line-height: 1.4;
        color: var(--cor-texto);
        opacity: 0.65;
    }

    .status {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        border-left: 5px solid var(--atrios-dourado);
    }

    .status.pausado {
        border-left-color: var(--cor-borda);
    }

    .status-textos {
        min-width: 0;
    }

    .status-titulo {
        margin: 0 0 0.2rem;
        font-family: var(--fonte-titulo);
        font-weight: 700;
        font-size: 0.95rem;
        color: var(--cor-texto);
    }

    .status-detalhe {
        margin: 0;
        font-size: 0.75rem;
        line-height: 1.4;
        color: var(--cor-texto);
        opacity: 0.7;
    }

    .botao-status {
        flex-shrink: 0;
        padding: 0.6rem 1.2rem;
        border: none;
        border-radius: var(--raio-pill);
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        font-family: var(--fonte-corpo);
        font-weight: 700;
        font-size: 0.8rem;
        cursor: pointer;
    }

    .botao-status:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .grade-fotos {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.5rem;
    }

    .tile {
        position: relative;
        aspect-ratio: 1;
        border-radius: var(--raio-md);
        overflow: hidden;
        background-color: var(--atrios-creme);
    }

    .tile img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .etiqueta {
        position: absolute;
        top: 0.35rem;
        padding: 0.15rem 0.5rem;
        border-radius: var(--raio-pill);
        font-size: 0.6rem;
        font-weight: 800;
        pointer-events: none;
    }

    .etiqueta.capa {
        left: 0.35rem;
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
    }

    .etiqueta.nova {
        right: 0.35rem;
        background-color: var(--atrios-verde-escuro);
        color: var(--atrios-creme);
    }

    .tile-acoes {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        justify-content: space-between;
        padding: 0.25rem;
        background: linear-gradient(
            to top,
            rgba(16, 22, 20, 0.7),
            rgba(16, 22, 20, 0)
        );
    }

    .tile-acoes button {
        width: 26px;
        height: 26px;
        border: none;
        border-radius: 50%;
        background-color: rgba(255, 255, 255, 0.9);
        color: var(--atrios-verde-escuro);
        font-size: 0.9rem;
        font-weight: 700;
        line-height: 1;
        cursor: pointer;
    }

    .tile-acoes button:disabled {
        opacity: 0.35;
        cursor: not-allowed;
    }

    .adicionar {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.85rem 1rem;
        border: 2px dashed var(--cor-borda);
        border-radius: var(--raio-md);
        color: var(--cor-texto);
        font-size: 0.82rem;
        font-weight: 600;
        text-align: center;
        cursor: pointer;
    }

    .adicionar:hover {
        border-color: var(--atrios-dourado);
    }

    .input-oculto {
        display: none;
    }

    .video-linha {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.8rem;
    }

    .video-texto {
        min-width: 0;
        font-size: 0.82rem;
        color: var(--cor-texto);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .video-botoes {
        flex-shrink: 0;
        display: flex;
        gap: 0.9rem;
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

    .link-acao.perigo {
        color: #b23a2f;
    }

    .rotulo-secao {
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
        padding: 0.7rem 0.95rem;
        border: 1px solid var(--cor-borda);
        border-radius: var(--raio-sm);
        background-color: var(--atrios-creme);
        color: var(--cor-texto);
        font-family: var(--fonte-corpo);
        font-size: 0.85rem;
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
        padding: 0.7rem 0.5rem;
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

    .rodape .aviso {
        margin: 0;
        font-size: 0.75rem;
        color: var(--cor-texto);
        opacity: 0.7;
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

    .botao-principal:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    /* ===== Desktop: duas colunas — mídia + comodidades à esquerda, dados à direita ===== */
    @media (min-width: 960px) {
        .topo {
            max-width: 1100px;
            margin: 0 auto;
            padding-left: 0;
            padding-right: 0;
        }

        .conteudo-grade {
            max-width: 1100px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.2rem;
            align-items: start;
        }

        .status-full {
            grid-column: 1 / -1;
        }

        .coluna-direita-inicio {
            grid-column: 2;
        }

        .rodape-desktop {
            position: static;
            max-width: 1100px;
            margin: 1.2rem auto 0;
            padding: 0;
            background: none;
            box-shadow: none;
            display: grid;
            grid-template-columns: 1fr 1fr;
        }

        .rodape-desktop > * {
            grid-column: 2;
        }

        .rodape-desktop .botao-principal {
            box-shadow: 0 4px 16px rgba(31, 42, 38, 0.08);
        }

        main {
            padding-bottom: 3rem;
        }
    }
</style>
