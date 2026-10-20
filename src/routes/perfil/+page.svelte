<script lang="ts">
    import { goto } from "$app/navigation";
    import { upload } from "@vercel/blob/client";
    import { api } from "$lib/api/client";
    import { API_URL } from "$lib/config";
    import { auth, type Usuario } from "$lib/stores/auth";
    import Avatar from "$lib/components/Avatar.svelte";
    import ModalErro from "$lib/components/ModalErro.svelte";
    import "../../lib/styles/theme.css";

    let nome = $derived($auth.usuario?.nome ?? "");
    let email = $derived($auth.usuario?.email ?? "");
    let foto = $derived($auth.usuario?.foto_url ?? null);
    let enviandoFoto = $state(false);
    let erro = $state("");
    let seletor = $state<HTMLInputElement | null>(null);

    const TAMANHO_MAXIMO = 10 * 1024 * 1024;

    async function salvarFoto(url: string | null) {
        const atualizado = await api<Usuario>("/auth/me", {
            method: "PATCH",
            autenticado: true,
            body: { foto_url: url },
        });
        auth.atualizarUsuario(atualizado);
    }

    async function escolherFoto(e: Event) {
        const entrada = e.currentTarget as HTMLInputElement;
        const arquivo = entrada.files?.[0];
        entrada.value = "";
        if (!arquivo) return;

        if (!arquivo.type.startsWith("image/")) {
            erro = "Escolha um arquivo de imagem.";
            return;
        }
        if (arquivo.size > TAMANHO_MAXIMO) {
            erro = "A foto é grande demais (máximo de 10 MB).";
            return;
        }

        enviandoFoto = true;
        try {
            const token = localStorage.getItem("atrios_token") ?? "";
            const blob = await upload(`perfil-${arquivo.name}`, arquivo, {
                access: "public",
                handleUploadUrl: `${API_URL}/uploads?token=${encodeURIComponent(token)}`,
            });
            await salvarFoto(blob.url);
        } catch (err) {
            erro =
                err instanceof Error
                    ? err.message
                    : "Não foi possível enviar a foto.";
        } finally {
            enviandoFoto = false;
        }
    }

    async function removerFoto() {
        enviandoFoto = true;
        try {
            await salvarFoto(null);
        } catch (err) {
            erro =
                err instanceof Error
                    ? err.message
                    : "Não foi possível remover a foto.";
        } finally {
            enviandoFoto = false;
        }
    }
    let jaAnfitriao = $derived($auth.usuario?.pode_hospedar ?? false);
    let ehEquipe = $derived($auth.usuario?.papel === "equipe");
    let vePainel = $derived(jaAnfitriao || ehEquipe);

    function sair() {
        auth.logout();
        goto("/login");
    }
</script>

<main>
    <header>
        <button
            class="avatar"
            onclick={() => seletor?.click()}
            disabled={enviandoFoto}
            aria-label="Trocar foto de perfil"
        >
            <Avatar
                {nome}
                semente={$auth.usuario?.id ?? ""}
                {foto}
                tamanho={84}
            />
            <span class="editar">{enviandoFoto ? "..." : "✎"}</span>
        </button>
        <input
            bind:this={seletor}
            type="file"
            accept="image/*"
            class="oculto"
            onchange={escolherFoto}
        />
        {#if foto}
            <button
                class="link-foto"
                onclick={removerFoto}
                disabled={enviandoFoto}>Remover foto</button
            >
        {/if}
        <h1>{nome}</h1>
        <p class="email">{email}</p>
    </header>

    <div class="cartoes">
        {#if ehEquipe}
            <section class="cartao">
                <h2>Painel da equipe</h2>
                <p>
                    Chegadas e saídas do dia, limpezas, ocorrências e o
                    calendário de todos os imóveis.
                </p>
                <button class="botao-principal" onclick={() => goto("/equipe")}>
                    Abrir painel da equipe
                </button>
            </section>
        {/if}

        {#if vePainel}
            <section class="cartao">
                <h2>Painel do anfitrião</h2>
                <p>
                    Acompanhe reservas, ocupação e o extrato do que você recebe.
                </p>
                <button
                    class="botao-principal"
                    onclick={() => goto("/anfitriao")}
                >
                    Abrir painel
                </button>
            </section>

            <section class="cartao">
                <h2>Calendários</h2>
                <p>
                    Conecte o Airbnb e o Booking para bloquear as datas entre os
                    canais e evitar reservas duplicadas.
                </p>
                <button
                    class="botao-principal"
                    onclick={() => goto("/anfitriao/calendarios")}
                >
                    Gerenciar calendários
                </button>
            </section>
        {/if}

        <section class="cartao">
            <h2>Fale com a Átrios</h2>
            <p>
                Dúvidas, problemas com uma reserva ou qualquer ajuda: nossa
                equipe responde pelas mensagens.
            </p>
            <button
                class="botao-principal"
                onclick={() => goto("/mensagens?suporte=1")}
            >
                Falar com o suporte
            </button>
        </section>

        <section class="cartao">
            <h2>{jaAnfitriao ? "Novo anúncio" : "Seja anfitrião"}</h2>
            <p>
                {jaAnfitriao
                    ? "Cadastre mais um imóvel e deixe a Átrios cuidar dos hóspedes."
                    : "Anuncie seu imóvel e deixe a Átrios cuidar de tudo, como uma coanfitriã de verdade."}
            </p>
            <button class="botao-principal" onclick={() => goto("/anunciar")}>
                Criar anúncio
            </button>
        </section>
    </div>

    <button class="botao-sair" onclick={sair}>Sair da conta</button>
</main>

<ModalErro mensagem={erro} aoFechar={() => (erro = "")} />

<style>
    main {
        min-height: 100dvh;
        background-color: var(--cor-fundo);
        padding: 2.5rem 1.25rem calc(var(--altura-barra) + 1.5rem);
        font-family: var(--fonte-corpo);
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
    }

    header {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 0.3rem;
    }

    .avatar {
        position: relative;
        width: 90px;
        height: 90px;
        padding: 0;
        border-radius: 50%;
        background: none;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid var(--atrios-branco);
        box-shadow: 0 4px 16px rgba(31, 42, 38, 0.12);
        margin-bottom: 0.2rem;
        cursor: pointer;
    }

    .editar {
        position: absolute;
        right: -4px;
        bottom: -2px;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        border: 2px solid var(--atrios-branco);
        font-size: 0.8rem;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .oculto {
        display: none;
    }

    .link-foto {
        background: none;
        border: none;
        padding: 0;
        font-family: var(--fonte-corpo);
        font-size: 0.75rem;
        color: var(--cor-texto);
        opacity: 0.6;
        text-decoration: underline;
        cursor: pointer;
    }

    h1 {
        font-size: 1.3rem;
        color: var(--cor-texto);
        margin: 0;
    }

    .email {
        margin: 0;
        font-size: 0.85rem;
        color: var(--cor-texto);
        opacity: 0.65;
    }

    .cartoes {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
    }

    .cartao {
        background-color: var(--atrios-branco);
        border-radius: var(--raio-lg);
        box-shadow: 0 4px 16px rgba(31, 42, 38, 0.08);
        padding: 1.4rem;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
    }

    .cartao h2 {
        font-size: 1.05rem;
        color: var(--cor-texto);
        margin: 0;
    }

    .cartao p {
        margin: 0 0 0.6rem;
        font-size: 0.85rem;
        color: var(--cor-texto);
        opacity: 0.7;
        line-height: 1.45;
    }

    .botao-principal {
        width: 100%;
        padding: 0.85rem;
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        border: none;
        border-radius: var(--raio-pill);
        font-weight: 600;
        font-size: 0.9rem;
        cursor: pointer;
    }

    .botao-sair {
        align-self: center;
        background: none;
        border: none;
        color: var(--cor-texto);
        opacity: 0.6;
        font-size: 0.85rem;
        text-decoration: underline;
        cursor: pointer;
        font-family: var(--fonte-corpo);
    }

    /* ===== Desktop: conteúdo centralizado, cartões em grade ===== */
    @media (min-width: 960px) {
        main {
            max-width: 900px;
            margin: 0 auto;
        }

        .cartoes {
            flex-direction: row;
            flex-wrap: wrap;
        }

        .cartao {
            flex: 1 1 260px;
        }
    }
</style>
