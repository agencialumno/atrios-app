<script lang="ts">
    let {
        linkAppStore = "#",
        linkPlayStore = "#",
    }: { linkAppStore?: string; linkPlayStore?: string } = $props();
</script>

<div class="badges">
    <a href={linkAppStore} class="badge" aria-label="Baixar na App Store">
        <svg viewBox="0 0 24 24" fill="currentColor" class="icone-apple">
            <path
                d="M17.05 12.04c-.02-2.02 1.65-2.99 1.72-3.03-.94-1.37-2.4-1.56-2.92-1.58-1.24-.13-2.43.73-3.06.73-.63 0-1.6-.71-2.63-.69-1.35.02-2.6.79-3.3 2-1.41 2.44-.36 6.06 1 8.04.67.97 1.46 2.05 2.5 2.01 1-.04 1.38-.65 2.6-.65 1.21 0 1.56.65 2.62.63 1.08-.02 1.77-.98 2.43-1.96.77-1.12 1.08-2.21 1.1-2.27-.02-.01-2.1-.81-2.13-3.23zM15.1 5.3c.55-.68.93-1.6.83-2.53-.8.03-1.78.54-2.35 1.2-.51.6-.96 1.55-.84 2.46.9.07 1.81-.46 2.36-1.13z"
            />
        </svg>
        <span class="texto">
            <span class="pequeno">Baixe na</span>
            <span class="grande">App Store</span>
        </span>
    </a>

    <a
        href={linkPlayStore}
        class="badge"
        aria-label="Disponível no Google Play"
    >
        <svg viewBox="0 0 24 24" class="icone-play">
            <path
                fill="#00d9ff"
                d="M3.6 2.4 13.6 12 3.6 21.6c-.4-.3-.6-.7-.6-1.2V3.6c0-.5.2-.9.6-1.2z"
            />
            <path
                fill="#ffd900"
                d="M13.6 12 17 8.6 4.5 2.1c-.3-.1-.6-.1-.9 0L13.6 12z"
            />
            <path
                fill="#ff3d00"
                d="M13.6 12 4.5 21.9c.3.1.6.1.9 0L17 15.4l-3.4-3.4z"
            />
            <path
                fill="#00ee76"
                d="m17 8.6-3.4 3.4L17 15.4l3.8-2.2c.6-.4.6-1.3 0-1.7L17 8.6z"
            />
        </svg>
        <span class="texto">
            <span class="pequeno">Disponível no</span>
            <span class="grande">Google Play</span>
        </span>
    </a>
</div>

<style>
    .badges {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
    }

    .badge {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        padding: 0.65rem 1.3rem;
        border-radius: var(--raio-md);
        background-color: #111;
        color: #fff;
        text-decoration: none;
    }

    .icone-apple {
        width: 26px;
        height: 26px;
        flex-shrink: 0;
    }

    .icone-play {
        width: 24px;
        height: 24px;
        flex-shrink: 0;
    }

    .texto {
        display: flex;
        flex-direction: column;
        line-height: 1.15;
    }

    .pequeno {
        font-size: 0.62rem;
        opacity: 0.85;
    }

    .grande {
        font-family: var(--fonte-titulo);
        font-size: 1rem;
        font-weight: 600;
    }
</style>
