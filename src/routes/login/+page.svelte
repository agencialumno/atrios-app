<script lang="ts">
    import { goto } from "$app/navigation";
    import { api } from "$lib/api/client";
    import { auth } from "$lib/stores/auth";
    import "../../lib/styles/theme.css";

    let email = $state("");
    let senha = $state("");
    let erro = $state("");
    let carregando = $state(false);

    async function entrar() {
        erro = "";
        carregando = true;

        try {
            const resposta = await api<{ token: string; usuario: any }>(
                "/auth/login",
                {
                    method: "POST",
                    body: { email, senha },
                },
            );

            auth.login(resposta.usuario, resposta.token);
            goto("/home");
        } catch (e) {
            erro = e instanceof Error ? e.message : "Erro ao entrar";
        } finally {
            carregando = false;
        }
    }
</script>

<main>
    <div class="topo"></div>

    <div class="folha">
        <img src="/atrios-logo-horizontal.png" alt="Átrios" class="logo" />

        <h1>Bem-vindo de volta</h1>
        <p class="subtitulo">Entre para continuar sua jornada</p>

        <form
            onsubmit={(e) => {
                e.preventDefault();
                entrar();
            }}
        >
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
                Senha
                <input
                    type="password"
                    bind:value={senha}
                    required
                    placeholder="••••••••"
                />
            </label>

            <a href="/esqueci-senha" class="esqueci">Esqueceu a senha?</a>

            {#if erro}
                <p class="erro">{erro}</p>
            {/if}

            <button type="submit" disabled={carregando}>
                {carregando ? "Entrando..." : "Entrar"}
            </button>
        </form>

        <p class="link-cadastro">
            Não tem conta? <a href="/cadastro">Cadastre-se</a>
        </p>
    </div>
</main>

<style>
    main {
        min-height: 100dvh;
        display: flex;
        flex-direction: column;
        background-color: var(--cor-fundo);
        font-family: var(--fonte-corpo);
    }

    .topo {
        height: 22vh;
        background-image: url("/fundo-auth.jpg");
        background-size: cover;
        background-position: center;
    }

    .folha {
        flex: 1;
        background-color: var(--atrios-branco);
        border-radius: var(--raio-lg) var(--raio-lg) 0 0;
        margin-top: -28px;
        padding: 2rem 1.75rem 2rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .logo {
        width: 168px;
        height: auto;
        margin: 0 auto 1.75rem;
    }

    h1 {
        font-size: 1.2rem;
        color: var(--cor-texto);
        margin: 0;
    }

    .subtitulo {
        color: var(--cor-texto);
        opacity: 0.65;
        font-size: 0.8rem;
        margin: 0 0 1rem;
    }

    form {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    label {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        font-size: 0.78rem;
        color: var(--cor-texto);
        font-weight: 500;
    }

    input {
        padding: 0.6rem 0.85rem;
        border: 1px solid var(--cor-borda);
        border-radius: 8px;
        font-size: 0.9rem;
        font-family: var(--fonte-corpo);
        background-color: var(--atrios-creme);
        color: var(--cor-texto);
    }

    input:focus {
        outline: none;
        border-color: var(--atrios-dourado);
    }

    .esqueci {
        align-self: flex-end;
        font-size: 0.75rem;
        color: var(--atrios-dourado);
        text-decoration: none;
        margin-top: -0.3rem;
    }

    button {
        margin-top: 0.3rem;
        padding: 0.7rem;
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        border: none;
        border-radius: 8px;
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

    .link-cadastro {
        text-align: center;
        font-size: 0.78rem;
        color: var(--cor-texto);
        margin-top: 1rem;
    }

    .link-cadastro a {
        color: var(--atrios-dourado);
        font-weight: 600;
        text-decoration: none;
    }
</style>
