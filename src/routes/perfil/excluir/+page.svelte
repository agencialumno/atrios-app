<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { api } from "$lib/api/client";
    import { auth } from "$lib/stores/auth";
    import { isTauri } from "$lib/plataforma";
    import { abrirLinkExterno } from "$lib/externo";
    import ModalErro from "$lib/components/ModalErro.svelte";
    import "../../../lib/styles/theme.css";

    type Metodo = "senha" | "apple" | "google";

    let metodo = $state<Metodo | null>(null);
    let bloqueios = $state<string[]>([]);
    let carregando = $state(true);
    let senha = $state("");
    let excluindo = $state(false);
    let erro = $state("");

    const NOME_PROVEDOR = { apple: "Apple", google: "Google" } as const;

    onMount(async () => {
        try {
            const r = await api<{ metodo: Metodo; bloqueios: string[] }>(
                "/auth/conta",
                { autenticado: true },
            );
            metodo = r.metodo;
            bloqueios = r.bloqueios;
        } catch (e) {
            erro = e instanceof Error ? e.message : "Erro ao carregar";
        } finally {
            carregando = false;
        }
    });

    let podeExcluir = $derived(
        !excluindo &&
            bloqueios.length === 0 &&
            (metodo === "apple" ||
                metodo === "google" ||
                (metodo === "senha" && senha.length > 0)),
    );

    async function excluir() {
        if (!podeExcluir) return;
        excluindo = true;
        erro = "";
        try {
            if (metodo === "senha") {
                await api("/auth/conta", {
                    method: "DELETE",
                    autenticado: true,
                    body: { senha },
                });
                auth.logout();
                await goto("/login", { replaceState: true });
            } else {
                // Apple/Google: entra de novo no provedor; o servidor exclui no retorno
                const { url } = await api<{ url: string }>(
                    "/auth/conta/reautenticar",
                    {
                        method: "POST",
                        autenticado: true,
                        body: { app: isTauri() },
                    },
                );
                if (isTauri()) await abrirLinkExterno(url);
                else window.location.href = url;
            }
        } catch (e) {
            erro = e instanceof Error ? e.message : "Não foi possível excluir";
        } finally {
            setTimeout(() => (excluindo = false), 1500);
        }
    }
</script>

<main>
    <button class="voltar" onclick={() => goto("/perfil")}>← Voltar</button>

    <h1>Excluir minha conta</h1>

    {#if carregando}
        <p>Carregando...</p>
    {:else}
        <section class="cartao">
            <h2>O que acontece</h2>
            <ul>
                <li>
                    Seu nome, e-mail, telefone e foto de perfil são removidos
                    e você não consegue mais entrar na conta.
                </li>
                <li>Seus anúncios deixam de aparecer no app.</li>
                <li>
                    O histórico de reservas e pagamentos já feitos é mantido,
                    sem os seus dados pessoais.
                </li>
                <li>Esta ação não pode ser desfeita.</li>
            </ul>
        </section>

        {#if bloqueios.length > 0}
            <section class="cartao aviso">
                <h2>Antes de excluir</h2>
                <p>Você precisa resolver estas reservas em aberto:</p>
                <ul>
                    {#each bloqueios as b}<li>{b}</li>{/each}
                </ul>
            </section>
        {:else if metodo === "senha"}
            <label>
                Digite sua senha atual para confirmar
                <input
                    type="password"
                    bind:value={senha}
                    autocomplete="current-password"
                />
            </label>
        {:else if metodo}
            <p class="nota">
                Para confirmar, você vai entrar de novo com
                {NOME_PROVEDOR[metodo]}. A exclusão termina quando você
                voltar para o app.
            </p>
        {/if}

        <button class="excluir" onclick={excluir} disabled={!podeExcluir}>
            {excluindo ? "Excluindo..." : "Excluir minha conta definitivamente"}
        </button>
        <a class="privacidade" href="/privacidade">Política de privacidade</a>
    {/if}
</main>

<ModalErro mensagem={erro} aoFechar={() => (erro = "")} />

<style>
    main {
        min-height: 100dvh;
        background-color: var(--cor-fundo);
        padding: 2rem 1.25rem calc(var(--altura-barra) + 1.5rem);
        font-family: var(--fonte-corpo);
        display: flex;
        flex-direction: column;
        gap: 1.1rem;
        max-width: 560px;
        margin: 0 auto;
    }

    h1 {
        margin: 0;
        font-size: 1.3rem;
        color: var(--cor-texto);
    }

    .voltar {
        align-self: flex-start;
        background: none;
        border: none;
        padding: 0;
        color: var(--cor-texto);
        opacity: 0.7;
        cursor: pointer;
        font-family: var(--fonte-corpo);
    }

    .cartao {
        background-color: var(--atrios-branco);
        border-radius: var(--raio-lg);
        box-shadow: 0 4px 16px rgba(31, 42, 38, 0.08);
        padding: 1.2rem 1.4rem;
        color: var(--cor-texto);
    }

    .cartao h2 {
        margin: 0 0 0.5rem;
        font-size: 1.02rem;
    }

    .cartao p {
        margin: 0 0 0.4rem;
        font-size: 0.88rem;
    }

    .cartao ul {
        margin: 0;
        padding-left: 1.1rem;
        font-size: 0.88rem;
        line-height: 1.5;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
    }

    .aviso {
        border: 1px solid #b3261e;
    }

    label {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        font-size: 0.88rem;
        color: var(--cor-texto);
    }

    input {
        padding: 0.7rem 1rem;
        border: 1px solid var(--cor-borda);
        border-radius: var(--raio-sm);
        font-size: 0.95rem;
        font-family: var(--fonte-corpo);
        background-color: var(--atrios-creme);
        color: var(--cor-texto);
    }

    .nota {
        margin: 0;
        font-size: 0.88rem;
        line-height: 1.45;
        color: var(--cor-texto);
    }

    .excluir {
        padding: 0.9rem;
        background-color: #b3261e;
        color: #fff;
        border: none;
        border-radius: var(--raio-pill);
        font-weight: 600;
        font-size: 0.92rem;
        cursor: pointer;
    }

    .excluir:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .privacidade {
        align-self: center;
        font-size: 0.8rem;
        color: var(--cor-texto);
        opacity: 0.6;
        text-decoration: underline;
    }
</style>
