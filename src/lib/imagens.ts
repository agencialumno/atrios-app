export async function comprimirImagem(
  arquivo: File,
  larguraMaxima = 1280, // era 1600
  qualidade = 0.75, // era 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();

    leitor.onload = (evento) => {
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;

        if (width > larguraMaxima) {
          height = (height * larguraMaxima) / width;
          width = larguraMaxima;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Não foi possível processar a imagem"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Falha ao comprimir imagem"));
              return;
            }
            resolve(
              new File([blob], arquivo.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              }),
            );
          },
          "image/jpeg",
          qualidade,
        );
      };

      img.onerror = () => reject(new Error("Falha ao carregar imagem"));
      img.src = evento.target?.result as string;
    };

    leitor.onerror = () => reject(new Error("Falha ao ler arquivo"));
    leitor.readAsDataURL(arquivo);
  });
}
