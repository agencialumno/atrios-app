// Dois destinos de build, dois adapters:
// - Tauri (app mobile/desktop): sem servidor Node, por isso SPA estático com fallback pro index.html
//   Ver: https://svelte.dev/docs/kit/single-page-apps
//   Ver: https://v2.tauri.app/start/frontend/sveltekit/ para mais informações
// - Vercel (site + backend): precisa do adapter-vercel para as rotas +server.ts virarem funções serverless de verdade
import adapterStatic from "@sveltejs/adapter-static";
import adapterVercel from "@sveltejs/adapter-vercel";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

// A Vercel define essa variável sozinha em todo build feito por ela; localmente e no Tauri, ela não existe
const naVercel = !!process.env.VERCEL;

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: naVercel
      ? adapterVercel()
      : adapterStatic({
          fallback: "index.html",
        }),
  },
};

export default config;
