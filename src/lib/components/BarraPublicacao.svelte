<script lang="ts">
    import { publicacao } from "$lib/stores/publicacao";
    import Preloader from "./Preloader.svelte";

    let { noTopo = false }: { noTopo?: boolean } = $props();

    let percentual = $derived(Math.round($publicacao.percentual));
    let enviando = $derived($publicacao.status === "enviando");
    let concluido = $derived($publicacao.status === "concluido");
    let comErro = $derived($publicacao.status === "erro");
    let edicao = $derived($publicacao.tipo === "editar");
</script>

{#if $publicacao.status !== "ocioso"}
    <div
        class="faixa"
        class:topo={noTopo}
        class:comErro
        class:concluido
        role="status"
        aria-live="polite"
    >
        <div class="linha">
            <span class="marcador">
                {#if enviando}
                    <Preloader tamanho={30} />
                {:else if concluido}
                    <span class="selo ok">✓</span>
                {:else}
                    <span class="selo falha">!</span>
                {/if}
            </span>

            <div class="textos">
                {#if enviando}
                    <p class="titulo">
                        {edicao
                            ? "Salvando seu anúncio..."
                            : "Publicando seu anúncio..."}
                    </p>
                    <p class="sub">
                        {$publicacao.mensagem} · mantenha o app aberto
                    </p>
                {:else if concluido}
                    <p class="titulo">
                        {edicao ? "Alterações salvas" : "Anúncio publicado"}
                    </p>
                    <p class="sub">
                        {$publicacao.nomeImovel}
                        {edicao ? "foi atualizado" : "já está no ar"}
                    </p>
                {:else}
                    <p class="titulo">
                        {edicao
                            ? "Não foi possível salvar"
                            : "Não foi possível publicar"}
                    </p>
                    <p class="sub">{$publicacao.erro}</p>
                {/if}
            </div>

            {#if enviando}
                <span class="percentual">{percentual}%</span>
            {:else if comErro}
                <div class="botoes">
                    <button
                        class="tentar"
                        onclick={() => publicacao.tentarNovamente()}
                    >
                        Tentar de novo
                    </button>
                    <button
                        class="descartar"
                        onclick={() => publicacao.descartar()}
                        aria-label="Descartar"
                    >
                        ✕
                    </button>
                </div>
            {/if}
        </div>

        <div class="trilho">
            <div class="preenchido" style="width: {percentual}%"></div>
        </div>
    </div>
{/if}

<style>
    .faixa {
        position: fixed;
        left: 0.75rem;
        right: 0.75rem;
        bottom: calc(var(--altura-nav) + 0.5rem);
        height: 56px;
        padding: 0.5rem 0.9rem 0;
        background-color: var(--atrios-branco);
        border-radius: var(--raio-md);
        box-shadow: 0 6px 24px rgba(31, 42, 38, 0.16);
        overflow: hidden;
        z-index: 60;
        font-family: var(--fonte-corpo);
    }

    .faixa.topo {
        bottom: auto;
        top: 0.75rem;
    }

    .linha {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        height: 38px;
    }

    .marcador {
        flex-shrink: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .selo {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.85rem;
        font-weight: 700;
    }

    .selo.ok {
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
    }

    .selo.falha {
        background-color: #b23a2f;
        color: #fff;
    }

    .textos {
        flex: 1;
        min-width: 0;
    }

    .titulo {
        margin: 0;
        font-family: var(--fonte-titulo);
        font-weight: 700;
        font-size: 0.82rem;
        color: var(--cor-texto);
    }

    .sub {
        margin: 0.1rem 0 0;
        font-size: 0.7rem;
        color: var(--cor-texto);
        opacity: 0.65;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .percentual {
        flex-shrink: 0;
        font-family: var(--fonte-titulo);
        font-weight: 700;
        font-size: 0.85rem;
        color: var(--cor-texto);
    }

    .botoes {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        gap: 0.4rem;
    }

    .tentar {
        border: none;
        border-radius: var(--raio-pill);
        padding: 0.4rem 0.8rem;
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        font-weight: 600;
        font-size: 0.72rem;
        cursor: pointer;
    }

    .descartar {
        width: 28px;
        height: 28px;
        border: none;
        border-radius: 50%;
        background-color: var(--atrios-creme);
        color: var(--cor-texto);
        font-size: 0.75rem;
        cursor: pointer;
    }

    .trilho {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 4px;
        background-color: var(--cor-borda);
    }

    .preenchido {
        height: 100%;
        background-color: var(--atrios-dourado);
        transition: width 0.3s ease;
    }

    .faixa.comErro .preenchido {
        background-color: #b23a2f;
    }

    /* ===== Desktop: vira um cartão compacto ancorado no canto, não uma faixa esticada ===== */
    @media (min-width: 960px) {
        .faixa {
            left: auto;
            right: 1.5rem;
            bottom: 1.5rem;
            width: 380px;
            border-radius: var(--raio-lg);
        }

        .faixa.topo {
            bottom: auto;
            top: 1.5rem;
        }
    }
</style>
