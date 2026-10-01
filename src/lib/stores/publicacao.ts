import { writable, get } from "svelte/store";
import { api } from "$lib/api/client";
import { API_URL } from "$lib/config";
import { comprimirImagem } from "$lib/imagens";
import { upload } from "@vercel/blob/client";

const MOSTRAR_CONCLUIDO_MS = 4000;

export type StatusPublicacao = "ocioso" | "enviando" | "concluido" | "erro";
export type TipoPublicacao = "criar" | "editar";

export interface DadosAnuncio {
  nome: string;
  endereco: string;
  cidade: string;
  categoria: string | null;
  capacidade_hospedes: number;
  quartos: number;
  banheiros: number;
  preco_base_noite: number;
  descricao: string | null;
  comodidades: string[];
}

export interface VideoEdicao {
  atual: string | null; // vídeo que já está no servidor (null = sem vídeo ou removido)
  novo: File | null; // vídeo escolhido para substituir
}

export interface AreaComumEnvio {
  fotos: (string | File)[]; // string = já está no servidor (ou vem de outro anúncio), File = precisa subir
  videoAtual: string | null;
  videoNovo: File | null;
}

interface Trabalho {
  tipo: TipoPublicacao;
  imovelId: string | null;
  dados: DadosAnuncio;
  fotos: (string | File)[]; // string = já está no servidor, File = precisa subir
  urlsFotos: (string | null)[]; // resultado de cada foto, na mesma ordem
  videoAtual: string | null;
  videoNovo: File | null;
  urlVideoNovo: string | null;
  // Área comum do condomínio
  enviarArea: boolean; // false = não mexe na área comum
  areaFotos: (string | File)[];
  areaUrlsFotos: (string | null)[];
  areaVideoAtual: string | null;
  areaVideoNovo: File | null;
  areaUrlVideoNovo: string | null;
}

interface EstadoPublicacao {
  status: StatusPublicacao;
  tipo: TipoPublicacao;
  percentual: number;
  mensagem: string;
  erro: string;
  nomeImovel: string;
  concluidas: number; // sobe 1 a cada publicação/edição concluída (as telas usam para recarregar)
}

const inicial: EstadoPublicacao = {
  status: "ocioso",
  tipo: "criar",
  percentual: 0,
  mensagem: "",
  erro: "",
  nomeImovel: "",
  concluidas: 0,
};

const { subscribe, update } = writable<EstadoPublicacao>(inicial);

let trabalho: Trabalho | null = null;
let temporizador: ReturnType<typeof setTimeout> | null = null;

function atualizar(parcial: Partial<EstadoPublicacao>) {
  update((e) => ({ ...e, ...parcial }));
}

function tamanhoNovo(lista: (string | File)[]): number {
  return lista.reduce((soma, f) => soma + (f instanceof File ? f.size : 0), 0);
}

function tamanhoJaEnviado(
  lista: (string | File)[],
  urls: (string | null)[],
): number {
  let soma = 0;
  lista.forEach((f, i) => {
    if (f instanceof File && urls[i] !== null) soma += f.size;
  });
  return soma;
}

function enviarComProgresso(
  arquivo: File,
  aoProgredir: (fracao: number) => void,
  aoTerminarEnvio: () => void,
): Promise<string> {
  const token = localStorage.getItem("atrios_token") ?? "";

  return upload(arquivo.name, arquivo, {
    access: "public",
    handleUploadUrl: `${API_URL}/uploads?token=${encodeURIComponent(token)}`,
    onUploadProgress: ({ percentage }) => {
      aoProgredir(percentage / 100);
      if (percentage >= 100) aoTerminarEnvio();
    },
  }).then((blob) => blob.url);
}

async function executar() {
  if (!trabalho) return;
  const job = trabalho;

  if (temporizador) clearTimeout(temporizador);
  atualizar({ status: "enviando", erro: "", mensagem: "Preparando o envio" });

  const bytesArquivos =
    tamanhoNovo(job.fotos) +
    (job.videoNovo?.size ?? 0) +
    (job.enviarArea
      ? tamanhoNovo(job.areaFotos) + (job.areaVideoNovo?.size ?? 0)
      : 0);
  const pesoSalvar = Math.max(bytesArquivos * 0.03, 50_000);
  const pesoTotal = bytesArquivos + pesoSalvar;

  // O que já foi enviado numa tentativa anterior não conta de novo
  let feito =
    tamanhoJaEnviado(job.fotos, job.urlsFotos) +
    tamanhoJaEnviado(job.areaFotos, job.areaUrlsFotos);
  if (job.videoNovo && job.urlVideoNovo) feito += job.videoNovo.size;
  if (job.areaVideoNovo && job.areaUrlVideoNovo)
    feito += job.areaVideoNovo.size;

  const mostrar = (parcial = 0) =>
    atualizar({
      percentual: Math.min(99, ((feito + parcial) / pesoTotal) * 100),
    });

  const subirFotos = async (
    lista: (string | File)[],
    urls: (string | null)[],
    complemento: string,
  ) => {
    const novas = lista.filter((f) => f instanceof File).length;

    for (let i = 0; i < lista.length; i++) {
      const foto = lista[i];
      if (!(foto instanceof File) || urls[i] !== null) continue;

      const ordem = lista
        .slice(0, i + 1)
        .filter((f) => f instanceof File).length;
      atualizar({
        mensagem: `Enviando foto ${ordem} de ${novas}${complemento}`,
      });

      let pronta = foto;
      try {
        pronta = await comprimirImagem(foto);
      } catch {
        // formato que o navegador não abre: envia o original mesmo
      }

      const url = await enviarComProgresso(
        pronta,
        (f) => mostrar(f * 0.95 * foto.size),
        () => {},
      );
      urls[i] = url;
      feito += foto.size;
      mostrar();
    }
  };

  const subirVideo = async (video: File, mensagem: string): Promise<string> => {
    atualizar({ mensagem });

    const url = await enviarComProgresso(
      video,
      (f) => mostrar(f * 0.95 * video.size),
      () =>
        atualizar({
          mensagem: "Otimizando o vídeo, pode levar alguns minutos",
        }),
    );
    feito += video.size;
    mostrar();
    return url;
  };

  try {
    mostrar();

    await subirFotos(job.fotos, job.urlsFotos, "");

    if (job.videoNovo && !job.urlVideoNovo) {
      job.urlVideoNovo = await subirVideo(
        job.videoNovo,
        "Enviando o vídeo do tour",
      );
    }

    if (job.enviarArea) {
      await subirFotos(job.areaFotos, job.areaUrlsFotos, " da área comum");

      if (job.areaVideoNovo && !job.areaUrlVideoNovo) {
        job.areaUrlVideoNovo = await subirVideo(
          job.areaVideoNovo,
          "Enviando o vídeo da área comum",
        );
      }
    }

    atualizar({
      mensagem:
        job.tipo === "editar" ? "Salvando as alterações" : "Salvando o anúncio",
    });

    const fotosFinais = job.urlsFotos.filter((u): u is string => u !== null);
    const videoFinal = job.videoNovo ? job.urlVideoNovo : job.videoAtual;
    const corpo: Record<string, unknown> = {
      ...job.dados,
      fotos: fotosFinais,
      video_tour: videoFinal,
    };

    // Só manda a área comum quando ela foi informada ou alterada
    if (job.enviarArea) {
      corpo.area_comum_fotos = job.areaUrlsFotos.filter(
        (u): u is string => u !== null,
      );
      corpo.area_comum_video = job.areaVideoNovo
        ? job.areaUrlVideoNovo
        : job.areaVideoAtual;
    }

    if (job.tipo === "editar" && job.imovelId) {
      await api(`/imoveis/${job.imovelId}`, {
        method: "PUT",
        autenticado: true,
        body: corpo,
      });
    } else {
      await api("/imoveis", {
        method: "POST",
        autenticado: true,
        body: corpo,
      });
    }

    trabalho = null;
    update((e) => ({
      ...e,
      status: "concluido",
      percentual: 100,
      mensagem:
        job.tipo === "editar" ? "Alterações salvas" : "Anúncio publicado",
      concluidas: e.concluidas + 1,
    }));

    temporizador = setTimeout(() => {
      if (get(publicacao).status === "concluido") descartar();
    }, MOSTRAR_CONCLUIDO_MS);
  } catch (e) {
    atualizar({
      status: "erro",
      erro: e instanceof Error ? e.message : "Algo deu errado",
    });
  }
}

function comecar(job: Trabalho): boolean {
  if (get(publicacao).status === "enviando") return false;

  if (temporizador) clearTimeout(temporizador);
  trabalho = job;

  update((e) => ({
    ...inicial,
    concluidas: e.concluidas,
    tipo: job.tipo,
    nomeImovel: job.dados.nome,
    status: "enviando",
  }));

  executar();
  return true;
}

function montar(
  tipo: TipoPublicacao,
  imovelId: string | null,
  dados: DadosAnuncio,
  fotos: (string | File)[],
  video: VideoEdicao,
  area: AreaComumEnvio | null,
): Trabalho {
  const areaFotos = area?.fotos ?? [];

  return {
    tipo,
    imovelId,
    dados,
    fotos,
    urlsFotos: fotos.map((f) => (typeof f === "string" ? f : null)),
    videoAtual: video.atual,
    videoNovo: video.novo,
    urlVideoNovo: null,
    enviarArea: area !== null,
    areaFotos,
    areaUrlsFotos: areaFotos.map((f) => (typeof f === "string" ? f : null)),
    areaVideoAtual: area?.videoAtual ?? null,
    areaVideoNovo: area?.videoNovo ?? null,
    areaUrlVideoNovo: null,
  };
}

function iniciar(
  dados: DadosAnuncio,
  fotos: File[],
  video: File | null,
  area: AreaComumEnvio | null = null,
): boolean {
  const temArea =
    !!area && (area.fotos.length > 0 || !!area.videoAtual || !!area.videoNovo);

  return comecar(
    montar(
      "criar",
      null,
      dados,
      fotos,
      { atual: null, novo: video },
      temArea ? area : null,
    ),
  );
}

// area = null: não mexe na área comum que já está salva
function iniciarEdicao(
  imovelId: string,
  dados: DadosAnuncio,
  fotos: (string | File)[],
  video: VideoEdicao,
  area: AreaComumEnvio | null = null,
): boolean {
  return comecar(montar("editar", imovelId, dados, fotos, video, area));
}

function tentarNovamente() {
  if (trabalho && get(publicacao).status === "erro") executar();
}

function descartar() {
  trabalho = null;
  if (temporizador) clearTimeout(temporizador);
  update((e) => ({ ...inicial, concluidas: e.concluidas }));
}

export const publicacao = {
  subscribe,
  iniciar,
  iniciarEdicao,
  tentarNovamente,
  descartar,
};
