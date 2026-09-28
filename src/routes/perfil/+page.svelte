<script lang="ts">
    import { goto } from "$app/navigation";
    import { auth } from "$lib/stores/auth";
    import "../../lib/styles/theme.css";

    let nome = $derived($auth.usuario?.nome ?? "");
    let email = $derived($auth.usuario?.email ?? "");
    let inicial = $derived(nome.charAt(0).toUpperCase());
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
        <div class="avatar">{inicial}</div>
        <h1>{nome}</h1>
        <p class="email">{email}</p>
    </header>

    {#if ehEquipe}
        <section class="cartao">
            <h2>Painel da equipe</h2>
            <p>
                Chegadas e saídas do dia, limpezas, ocorrências e o calendário
                de todos os imóveis.
            </p>
            <button class="botao-principal" onclick={() => goto("/equipe")}>
                Abrir painel da equipe
            </button>
        </section>
    {/if}

    {#if vePainel}
        <section class="cartao">
            <h2>Painel do anfitrião</h2>
            <p>Acompanhe reservas, ocupação e o extrato do que você recebe.</p>
            <button class="botao-principal" onclick={() => goto("/anfitriao")}>
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

    <button class="botao-sair" onclick={sair}>Sair da conta</button>
</main>

<style>
    main {
        min-height: 100vh;
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
        width: 84px;
        height: 84px;
        border-radius: 50%;
        background-color: var(--atrios-dourado);
        color: var(--atrios-verde-escuro);
        font-family: var(--fonte-titulo);
        font-weight: 700;
        font-size: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid var(--atrios-branco);
        box-shadow: 0 4px 16px rgba(31, 42, 38, 0.12);
        margin-bottom: 0.6rem;
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
</style>
