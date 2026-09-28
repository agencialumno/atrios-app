<script lang="ts">
    import { goto } from "$app/navigation";
    import { api } from "$lib/api/client";
    import { auth } from "$lib/stores/auth";
    import "../../lib/styles/theme.css";

    let nome = $state("");
    let email = $state("");
    let telefone = $state("");
    let senha = $state("");
    let erro = $state("");
    let carregando = $state(false);

    async function cadastrar() {
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
            />
        </label>

        {#if erro}
            <p class="erro">{erro}</p>
        {/if}

        <button type="submit" disabled={carregando}>
            {carregando ? "Criando conta..." : "Criar conta"}
        </button>
    </form>

    <p class="link-login">
        Já tem conta? <a href="/login">Entrar</a>
    </p>
</main>

<style>
    main {
        min-height: 100dvh;
        background-color: var(--atrios-branco);
        padding: 1.5rem 1.75rem 2rem;
        display: flex;
        flex-direction: column;
        font-family: var(--fonte-corpo);
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

    .erro {
        color: #b23a2f;
        font-size: 0.78rem;
        margin: 0;
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
</style>
