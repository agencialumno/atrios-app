<script lang="ts">
    let { tamanho = 56 }: { tamanho?: number } = $props();
</script>

<div class="preloader" style="width: {tamanho}px; height: {tamanho}px;">
    <svg viewBox="0 0 100 100" class="anel">
        <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="var(--cor-borda)"
            stroke-width="7"
        />
        <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="var(--atrios-dourado)"
            stroke-width="7"
            stroke-linecap="round"
            stroke-dasharray="66 198"
            class="traco"
        />
    </svg>
    <svg viewBox="0 0 100 100" class="simbolo">
        <path
            d="M50 22 L74 58 L64 58 L64 78 L36 78 L36 58 L26 58 Z"
            fill="var(--atrios-verde-escuro)"
        />
    </svg>
</div>

<style>
    .preloader {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }

    .anel {
        position: absolute;
        inset: 0;
        animation: girar 1.1s linear infinite;
    }

    .traco {
        transform-origin: center;
    }

    .simbolo {
        width: 38%;
        height: 38%;
        animation: respirar 1.6s ease-in-out infinite;
    }

    @keyframes girar {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    @keyframes respirar {
        0%,
        100% {
            opacity: 0.55;
            transform: scale(0.92);
        }
        50% {
            opacity: 1;
            transform: scale(1);
        }
    }
</style>
