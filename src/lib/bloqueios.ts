/** Impede o gesto de "puxar para recarregar" e o zoom por gesto (double-tap) do WebView */
export function bloquearGestosDoSistema() {
  let ultimoToqueEm = 0;

  // Bloqueia o double-tap-to-zoom
  document.addEventListener(
    "touchend",
    (e) => {
      const agora = Date.now();
      if (agora - ultimoToqueEm <= 300) e.preventDefault();
      ultimoToqueEm = agora;
    },
    { passive: false },
  );

  // Bloqueia o "puxar para recarregar": só impede quando o dedo desce
  // com a página já no topo, sem atrapalhar a rolagem normal
  let inicioY = 0;

  document.addEventListener(
    "touchstart",
    (e) => {
      inicioY = e.touches[0].clientY;
    },
    { passive: true },
  );

  document.addEventListener(
    "touchmove",
    (e) => {
      const atualY = e.touches[0].clientY;
      const descendo = atualY > inicioY;
      const noTopo = window.scrollY <= 0;

      if (descendo && noTopo) e.preventDefault();
    },
    { passive: false },
  );
}
