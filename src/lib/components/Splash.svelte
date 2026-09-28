<script lang="ts">
    export let visivel = true;
</script>

{#if visivel}
    <div class="splash">
        <video autoplay loop muted playsinline class="video-splash">
            <source src="/splash-atrios.mp4" type="video/mp4" />
        </video>
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

    .video-splash {
        width: 130px;
        height: 130px;
        object-fit: contain;
    }
</style>
