<script lang="ts">
    import CabecalhoSite from "$lib/components/site/CabecalhoSite.svelte";
    import RodapeSite from "$lib/components/site/RodapeSite.svelte";
    import "$lib/styles/theme.css";
    import "$lib/styles/site.css";

    const ENDPOINT_FORMULARIO = "https://formspree.io/f/mkjgkbda";

    let nome = $state("");
    let email = $state("");
    let telefone = $state("");
    let assunto = $state("Sou proprietário e quero anunciar");
    let mensagem = $state("");

    let enviando = $state(false);
    let enviado = $state(false);
    let erro = $state("");

    async function enviar(evento: SubmitEvent) {
        evento.preventDefault();
        erro = "";

        if (!nome.trim() || !email.trim() || !mensagem.trim()) {
            erro = "Preencha nome, e-mail e mensagem.";
            return;
        }

        enviando = true;

        try {
            const resposta = await fetch(ENDPOINT_FORMULARIO, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    nome,
                    email,
                    telefone,
                    assunto,
                    mensagem,
                }),
            });

            if (!resposta.ok) throw new Error("Falha ao enviar");

            enviado = true;
        } catch {
            erro =
                "Não foi possível enviar agora. Tente novamente em instantes.";
        } finally {
            enviando = false;
        }
    }
</script>

<svelte:head>
    <title>Contato — Átrios Gestão & Locação</title>
</svelte:head>

<CabecalhoSite />

<main class="pagina">
    <section class="hero-pagina">
        <span class="etiqueta">Contato</span>
        <h1>Fale com a nossa equipe</h1>
        <p>
            Proprietário ou hóspede, estamos por aqui para responder qualquer
            dúvida.
        </p>
    </section>

    <section class="secao-pagina conteudo-contato">
        <div class="lado-info">
            <div class="info-item">
                <h3>E-mail</h3>
                <a href="mailto:contato@atrios.com.br">contato@atrios.com.br</a>
            </div>
            <div class="info-item">
                <h3>Localização</h3>
                <p>Rio de Janeiro, RJ</p>
            </div>
            <div class="info-item">
                <h3>Atendimento</h3>
                <p>Segunda a sexta, 9h às 18h</p>
            </div>
        </div>

        <div class="lado-form">
            {#if enviado}
                <div class="sucesso">
                    <p class="sucesso-titulo">Mensagem enviada!</p>
                    <p>Vamos responder o mais rápido possível.</p>
                </div>
            {:else}
                <form onsubmit={enviar}>
                    <div class="linha">
                        <label>
                            Nome
                            <input type="text" bind:value={nome} required />
                        </label>
                        <label>
                            E-mail
                            <input type="email" bind:value={email} required />
                        </label>
                    </div>

                    <div class="linha">
                        <label>
                            Telefone (opcional)
                            <input type="tel" bind:value={telefone} />
                        </label>
                        <label>
                            Assunto
                            <select bind:value={assunto}>
                                <option
                                    >Sou proprietário e quero anunciar</option
                                >
                                <option>Sou hóspede e tenho uma dúvida</option>
                                <option>Outro assunto</option>
                            </select>
                        </label>
                    </div>

                    <label>
                        Mensagem
                        <textarea bind:value={mensagem} rows="5" required
                        ></textarea>
                    </label>

                    {#if erro}
                        <p class="erro-form">{erro}</p>
                    {/if}

                    <button
                        type="submit"
                        class="botao-principal"
                        disabled={enviando}
                    >
                        {enviando ? "Enviando..." : "Enviar mensagem"}
                    </button>
                </form>
            {/if}
        </div>
    </section>
</main>

<RodapeSite />

<style>
    :global(body) {
        margin: 0;
    }

    .pagina {
        font-family: var(--fonte-corpo);
        color: var(--cor-texto);
        background-color: var(--cor-fundo);
    }

    .conteudo-contato {
        display: grid;
        grid-template-columns: 320px 1fr;
        gap: 4rem;
    }

    .lado-info {
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

    .info-item h3 {
        font-family: var(--fonte-titulo);
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--atrios-dourado);
        margin: 0 0 0.4rem;
    }

    .info-item a,
    .info-item p {
        font-size: 0.92rem;
        color: var(--cor-texto);
        text-decoration: none;
        margin: 0;
        opacity: 0.85;
    }

    .lado-form {
        padding: 2rem;
        border-radius: var(--raio-lg);
        background-color: var(--atrios-branco);
        box-shadow: 0 8px 24px rgba(31, 42, 38, 0.08);
    }

    form {
        display: flex;
        flex-direction: column;
        gap: 1.2rem;
    }

    .linha {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.2rem;
    }

    label {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--cor-texto);
    }

    input,
    select,
    textarea {
        padding: 0.75rem 0.9rem;
        border: 1px solid var(--cor-borda);
        border-radius: var(--raio-sm);
        background-color: var(--atrios-creme);
        font-family: var(--fonte-corpo);
        font-size: 0.9rem;
        color: var(--cor-texto);
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

    .erro-form {
        color: #b23a2f;
        font-size: 0.85rem;
        margin: 0;
    }

    .sucesso {
        text-align: center;
        padding: 3rem 1rem;
    }

    .sucesso-titulo {
        font-family: var(--fonte-titulo);
        font-size: 1.2rem;
        color: var(--atrios-dourado);
        margin: 0 0 0.5rem;
    }

    @media (max-width: 860px) {
        .conteudo-contato {
            grid-template-columns: 1fr;
            gap: 2.5rem;
        }

        .linha {
            grid-template-columns: 1fr;
        }
    }
</style>
