import { json, error } from "@sveltejs/kit";
import { put } from "@vercel/blob";
import { extrairClaims } from "$lib/server/auth";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
  await extrairClaims(request.headers); // só exige estar logado

  const formData = await request.formData();
  const arquivo = formData.get("arquivo");

  if (!(arquivo instanceof File)) {
    throw error(400, "nenhum arquivo enviado");
  }

  const blob = await put(arquivo.name, arquivo, {
    access: "public",
    addRandomSuffix: true,
  });

  return json({ url: blob.url });
};
