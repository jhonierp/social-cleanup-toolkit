// Módulo TikTok (tiktok.com): quita tus "compartidos" (republicaciones / reposts)
(() => {
  const H = globalThis.SCT_H;
  const RE_QUITAR = /(eliminar republicaci[oó]n|quitar republicaci[oó]n|deshacer republicaci[oó]n|eliminar repost|quitar repost|remove repost|undo repost)/i;
  const RE_COMPARTIR = /^(compartir|share)\b/i;
  const RE_CERRAR = /^(cerrar|close)$/i;
  const procesados = new Set();

  const enVideoAbierto = () => /\/video\//.test(location.pathname) || !!document.querySelector('[data-e2e="browse-close"], [data-e2e*="browse-video"]');

  function enlacesDeVideos() {
    return [...document.querySelectorAll('a[href*="/video/"]')]
      .filter((a) => H.visible(a) && !a.closest('[data-e2e*="browse"]'))
      .filter((a) => !procesados.has(a.href.split('?')[0]));
  }

  function botonCompartir() {
    const cands = [...document.querySelectorAll('[data-e2e*="share"], button, [role="button"]')].filter(H.visible);
    return (
      cands.find((b) => /share-icon|share-btn|video-share|browse-share/.test(b.getAttribute('data-e2e') || '')) ||
      cands.find((b) => RE_COMPARTIR.test(H.label(b)) || RE_COMPARTIR.test(H.texto(b))) ||
      null
    );
  }

  async function cerrarVideo() {
    const x = [...document.querySelectorAll('[data-e2e="browse-close"], button, [role="button"]')]
      .filter(H.visible)
      .find((b) => b.getAttribute('data-e2e') === 'browse-close' || RE_CERRAR.test(H.label(b)));
    if (x) x.click(); else H.escape();
    await H.esperarElemento(() => !document.querySelector('[data-e2e="browse-close"]') || null, 3000);
  }

  globalThis.SCT_ADAPTERS.tiktok = {
    id: 'tiktok',
    nombre: 'TikTok',
    url: 'https://www.tiktok.com/profile',
    dominio: () => /(^|\.)tiktok\.com$/.test(location.hostname),
    enPagina: () => /(^|\.)tiktok\.com$/.test(location.hostname),
    ayuda: 'Abre tiktok.com, ve a tu perfil y entra a la pestaña "Republicaciones".',
    modos: {
      quitar: { etiqueta: 'Quitar compartidos', contador: 'quitados', color: '#fe2c55', permanente: false },
    },

    async procesarUno() {
      H.escape();
      await H.esperar(250);
      if (enVideoAbierto()) await cerrarVideo();

      const links = enlacesDeVideos();
      if (!links.length) {
        const antes = document.documentElement.scrollHeight;
        window.scrollBy(0, 800);
        await H.esperar(1200);
        return document.documentElement.scrollHeight > antes || enlacesDeVideos().length ? 'scroll' : 'sin_items';
      }

      const link = links[0];
      const id = link.href.split('?')[0];
      procesados.add(id);
      link.scrollIntoView({ block: 'center' });
      link.click();

      if (!(await H.esperarElemento(() => (enVideoAbierto() && botonCompartir()) || null, 6000))) {
        return 'sin_video';
      }
      await H.esperar(400);

      // A veces el botón "Quitar republicación" está a la vista; si no, está dentro de Compartir
      let quitar = H.buscarClicable(RE_QUITAR);
      if (!quitar) {
        botonCompartir().click();
        quitar = await H.esperarElemento(() => H.buscarClicable(RE_QUITAR), 2500);
      }
      if (!quitar) {
        H.log('este video no muestra "Quitar republicación":', id);
        await cerrarVideo();
        return 'saltado:' + id.split('/').pop();
      }
      quitar.click();
      await H.esperar(800);
      await cerrarVideo();
      return 'ok';
    },
  };
})();
