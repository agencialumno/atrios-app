import { json, error } from "@sveltejs/kit";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "$env/static/private";
import type { RequestHandler } from "./$types";

const segredo = new TextEncoder().encode(JWT_SECRET);

export const POST: RequestHandler = async ({ request, url }) => {
  // O navegador manda o token como ?token=... porque esta chamada é feita
  // pela biblioteca do Vercel Blob, que não deixa adicionar o cabeçalho Authorization
  const token = url.searchParams.get("token");
  if (!token) throw error(401, "não autenticado");

  try {
    await jwtVerify(token, segredo);
  } catch {
    throw error(401, "token inválido ou expirado");
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const resposta = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["image/*", "video/*"],
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {},
    });

    return json(resposta);
  } catch (e) {
    throw error(400, e instanceof Error ? e.message : "falha no upload");
  }
};
