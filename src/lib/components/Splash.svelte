<script lang="ts">
    export let visivel = true;
</script>

{#if visivel}
    <div class="splash">
        <img src="/atrios-logo.png" alt="Átrios" class="logo-splash" />
    </div>
{/if}

<style>
    .splash {
        position: fixed;
        inset: 0;
        background-color: var(--atrios-creme);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    }

    .logo-splash {
        width: 180px;
        height: auto;
        object-fit: contain;
        animation: aparecer 0.6s ease-out both;
    }

    @keyframes aparecer {
        from {
            opacity: 0;
            transform: scale(0.96);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }
</style>
