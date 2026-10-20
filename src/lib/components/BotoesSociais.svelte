<script lang="ts">
    import { entrarCom, type Provedor } from "$lib/social";

    let { aoErro }: { aoErro: (mensagem: string) => void } = $props();

    let abrindo = $state<Provedor | null>(null);

    async function iniciar(provedor: Provedor) {
        abrindo = provedor;
        try {
            await entrarCom(provedor);
        } catch (e) {
            aoErro(
                e instanceof Error
                    ? e.message
                    : "Não foi possível abrir o login",
            );
        } finally {
            // volta ao normal depois de um tempo: o login acontece fora do app
            setTimeout(() => (abrindo = null), 1500);
        }
    }
</script>

<div class="sociais">
    <div class="divisor"><span>ou</span></div>

    <button
        type="button"
        class="google"
        onclick={() => iniciar("google")}
        disabled={abrindo !== null}
    >
        <svg viewBox="0 0 48 48" aria-hidden="true">
            <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
        </svg>
        Continuar com Google
    </button>

    <button
        type="button"
        class="apple"
        onclick={() => iniciar("apple")}
        disabled={abrindo !== null}
    >
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
                fill="currentColor"
                d="M16.37 1.43c0 1.14-.46 2.22-1.2 3-.8.85-2.1 1.5-3.15 1.42-.13-1.1.42-2.25 1.15-3 .82-.85 2.2-1.46 3.2-1.42zM20.5 17.1c-.55 1.27-.82 1.84-1.52 2.96-.98 1.57-2.37 3.53-4.08 3.54-1.52.02-1.92-.99-3.99-.98-2.07.01-2.5 1-4.02.99-1.71-.02-3.02-1.78-4-3.35C-.1 15.9-.4 11.1 1.3 8.5c1.2-1.84 3.1-2.92 4.88-2.92 1.81 0 2.95 1 4.45 1 1.45 0 2.34-1 4.44-1 1.58 0 3.26.86 4.46 2.34-3.92 2.15-3.28 7.75.97 9.18z"
            />
        </svg>
        Continuar com Apple
    </button>
</div>

<style>
    .sociais {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
        margin-top: 0.4rem;
    }

    .divisor {
        display: flex;
        align-items: center;
        gap: 0.8rem;
        font-size: 0.75rem;
        color: var(--cor-texto);
        opacity: 0.6;
    }

    .divisor::before,
    .divisor::after {
        content: "";
        flex: 1;
        height: 1px;
        background-color: var(--cor-borda);
    }

    button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.6rem;
        width: 100%;
        padding: 0.8rem;
        border-radius: var(--raio-pill);
        font-family: var(--fonte-corpo);
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
    }

    button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    svg {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
    }

    /* Botão padrão do Google: fundo branco, borda cinza */
    .google {
        background-color: #ffffff;
        color: #1f1f1f;
        border: 1px solid #dadce0;
    }

    /* Botão "Sign in with Apple": preto com a maçã branca */
    .apple {
        background-color: #000000;
        color: #ffffff;
        border: 1px solid #000000;
    }
</style>
