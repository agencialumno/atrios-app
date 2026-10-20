<script lang="ts">
    import { goto } from "$app/navigation";
    import { api } from "$lib/api/client";
    import { auth } from "$lib/stores/auth";
    import ModalErro from "$lib/components/ModalErro.svelte";
    import BotoesSociais from "$lib/components/BotoesSociais.svelte";
    import { REQUISITOS_SENHA, senhaForte } from "$lib/senha";
    import "../../lib/styles/theme.css";

    let nome = $state("");
    let email = $state("");
    let telefone = $state("");
    let senha = $state("");
    let erro = $state("");
    let carregando = $state(false);

    let requisitos = $derived(
        REQUISITOS_SENHA.map((r) => ({ ...r, cumprido: r.ok(senha) })),
    );
    let podeCadastrar = $derived(senhaForte(senha) && !carregando);

    async function cadastrar() {
        if (!senhaForte(senha)) return;
        erro = "";
        carregando = true;

        try {
            const resposta = await api<{ token: string; usuario: any }>(
                "/auth/cadastrar",
                {
                    method: "POST",
                    body: {
                        nome,
                        email,
                        senha,
                        papel: "hospede",
                        telefone: telefone || null,
                    },
                },
            );

            auth.login(resposta.usuario, resposta.token);
            goto("/home");
        } catch (e) {
            erro = e instanceof Error ? e.message : "Erro ao cadastrar";
        } finally {
            carregando = false;
        }
    }
</script>

<main>
    <div class="cartao">
        <a href="/login" class="voltar">←</a>

        <img src="/atrios-logo-horizontal.png" alt="Átrios" class="logo" />

        <h1>Criar conta</h1>
        <p class="subtitulo">Comece sua experiência com a Átrios</p>

        <form
            onsubmit={(e) => {
                e.preventDefault();
                cadastrar();
            }}
        >
            <label>
                Nome completo
                <input
                    type="text"
                    bind:value={nome}
                    required
                    placeholder="Seu nome"
                />
            </label>

            <label>
                E-mail
                <input
                    type="email"
                    bind:value={email}
                    required
                    placeholder="seu@email.com"
                />
            </label>

            <label>
                Telefone (opcional)
                <input
                    type="tel"
                    bind:value={telefone}
                    placeholder="(21) 99999-9999"
                />
            </label>

            <label>
                Senha
                <input
                    type="password"
                    bind:value={senha}
                    required
                    placeholder="••••••••"
                    autocomplete="new-password"
                />
            </label>

            <ul class="requisitos" aria-live="polite">
                {#each requisitos as r (r.id)}
                    <li class:cumprido={r.cumprido}>
                        <span class="marca" aria-hidden="true"
                            >{r.cumprido ? "✓" : "○"}</span
                        >
                        {r.rotulo}
                    </li>
                {/each}
            </ul>

            <button type="submit" disabled={!podeCadastrar}>
                {carregando ? "Criando conta..." : "Criar conta"}
            </button>
        </form>

        <BotoesSociais aoErro={(m) => (erro = m)} />

        <p class="link-login">
            Já tem conta? <a href="/login">Entrar</a>
        </p>
    </div>
</main>

<ModalErro mensagem={erro} aoFechar={() => (erro = "")} />

<style>
    main {
        min-height: 100dvh;
        background-color: var(--atrios-branco);
        padding: 1.5rem 1.75rem 2rem;
        display: flex;
        flex-direction: column;
        font-family: var(--fonte-corpo);
    }

    .cartao {
        display: contents;
    }

    .voltar {
        width: 38px;
        height: 38px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: var(--atrios-creme);
        border-radius: 50%;
        font-size: 1.1rem;
        color: var(--cor-texto);
        text-decoration: none;
        margin-bottom: 1rem;
    }

    .logo {
        width: 150px;
        height: auto;
        margin: 0 auto 1.5rem;
    }

    h1 {
        font-size: 1.2rem;
        color: var(--cor-texto);
        margin: 0 0 0.3rem;
    }

    .subtitulo {
        color: var(--cor-texto);
        opacity: 0.65;
        font-size: 0.8rem;
        margin: 0 0 1.5rem;
    }

    form {
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
    }

    label {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        font-size: 0.78rem;
        color: var(--cor-texto);
        font-weight: 500;
    }

    input {
        padding: 0.7rem 1rem;
        border: 1px solid var(--cor-borda);
        border-radius: var(--raio-sm);
        font-size: 0.9rem;
        font-family: var(--fonte-corpo);
        background-color: var(--atrios-creme);
        color: var(--cor-texto);
    }

    input:focus {
        outline: none;
        border-color: var(--atrios-dourado);
    }

    button {
        margin-top: 0.5rem;
        padding: 0.8rem;
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        border: none;
        border-radius: var(--raio-pill);
        font-weight: 600;
        font-size: 0.9rem;
        cursor: pointer;
    }

    button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .requisitos {
        list-style: none;
        margin: -0.3rem 0 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .requisitos li {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        font-size: 0.75rem;
        color: var(--cor-texto);
        opacity: 0.6;
        transition: color 0.15s, opacity 0.15s;
    }

    .requisitos li.cumprido {
        color: #2c8a4a;
        opacity: 1;
    }

    .requisitos .marca {
        width: 1rem;
        text-align: center;
        font-weight: 700;
    }

    .link-login {
        text-align: center;
        font-size: 0.78rem;
        color: var(--cor-texto);
        margin-top: 1.5rem;
    }

    .link-login a {
        color: var(--atrios-dourado);
        font-weight: 600;
        text-decoration: none;
    }

    @media (min-width: 960px) {
        main {
            align-items: center;
            justify-content: center;
            background-color: var(--cor-fundo);
        }

        .cartao {
            display: flex;
            flex-direction: column;
            width: 100%;
            max-width: 420px;
            padding: 3rem 3rem 2.5rem;
            background-color: var(--atrios-branco);
            border-radius: var(--raio-lg);
            box-shadow: 0 20px 50px rgba(31, 42, 38, 0.12);
        }
    }
</style>
