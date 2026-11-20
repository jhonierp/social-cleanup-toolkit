// Módulo TikTok (tiktok.com): quita tus "compartidos" (republicaciones / reposts)
// Solo trabaja en TU PERFIL, pestaña "Republicaciones". En cualquier otra página no hace nada.
(() => {
  const H = globalThis.SCT_H;
  const RE_TAB_REPOSTS = /^(republicaciones|reposts?|compartidos)$/i;
  const RE_QUITAR = /(eliminar republicaci[oó]n|quitar republicaci[oó]n|deshacer republicaci[oó]n|eliminar repost|quitar repost|remove repost|undo repost|delete repost)/i;
  const RE_COMPARTIR = /^(compartir|share)\b/i;
  const procesados = new Set();
  let urlPerfil = null;

  const enPerfil = () => /^\/@[^/]+\/?$/.test(location.pathname);
  const enVideo = () => /\/video\/\d+/.test(location.pathname);

  function pestanaReposts() {
    const tabs = [...document.querySelectorAll('[role="tab"], [data-e2e*="repost-tab"], [data-e2e*="tab"]')].filter(H.visible);
    return tabs.find((t) => RE_TAB_REPOSTS.test(H.texto(t)) || /repost/.test(t.getAttribute('data-e2e') || '')) || null;
  }
  const repostsActiva = () => {
    const t = pestanaReposts();
    return !!t && (t.getAttribute('aria-selected') === 'true' || /active|selected/i.test(t.className || ''));
  };

  // Usuario dueño del perfil abierto, p. ej. "@jhonierp"
  const duenoPerfil = () => decodeURIComponent(location.pathname.split('/')[1] || '').toLowerCase();

  function enlacesDeVideos() {
    // Los compartidos son videos de OTRAS cuentas: sus enlaces son /@otro/video/…
    // Los videos subidos por ti (/@tuusuario/video/…) se ignoran siempre.
    const yo = duenoPerfil();
    const main = document.querySelector('main, [data-e2e="user-page"], #main-content-others_homepage') || document.body;
    return [...main.querySelectorAll('a[href*="/video/"]')]
      .filter((a) => H.visible(a) && !a.closest('[data-e2e*="browse"], nav, aside, header'))
      .filter((a) => {
        const autor = decodeURIComponent(new URL(a.href, location.href).pathname.split('/')[1] || '').toLowerCase();
        return autor && autor !== yo;
      })
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

  // Vuelve a la cuadrícula: solo con el botón de cerrar del visor o con "atrás" del navegador
  async function volverAlPerfil() {
    const x = document.querySelector('[data-e2e="browse-close"]');
    if (x && H.visible(x)) x.click();
    else if (enVideo()) history.back();
    await H.esperarElemento(() => (enPerfil() && !document.querySelector('[data-e2e="browse-close"]')) || null, 5000);
    if (!enPerfil() && urlPerfil) location.href = urlPerfil;
  }

  globalThis.SCT_ADAPTERS.tiktok = {
    id: 'tiktok',
    nombre: 'TikTok',
    url: 'https://www.tiktok.com/profile',
    dominio: () => /(^|\.)tiktok\.com$/.test(location.hostname),
    enPagina: () => enPerfil(),
    ayuda: 'Ve a TU perfil de TikTok y abre la pestaña "Republicaciones".',
    modos: {
      quitar: { etiqueta: 'Quitar compartidos', contador: 'quitados', color: '#fe2c55', permanente: false },
    },

    async procesarUno() {
      if (!enPerfil()) return 'no_perfil';
      urlPerfil = location.href;

      if (!repostsActiva()) {
        const t = pestanaReposts();
        if (!t) {
          H.log('no encontré la pestaña Republicaciones. Pestañas:', [...document.querySelectorAll('[role="tab"]')].map(H.texto));
          return 'sin_pestana';
        }
        t.click();
        // Esperamos a que carguen los videos compartidos (de otras cuentas)
        await H.esperarElemento(() => enlacesDeVideos()[0] || null, 6000);
      }

      const links = enlacesDeVideos();
      if (!links.length) {
        const antes = document.documentElement.scrollHeight;
        window.scrollBy(0, 800);
        await H.esperar(1500);
        return document.documentElement.scrollHeight > antes || enlacesDeVideos().length ? 'scroll' : 'sin_items';
      }

      const link = links[0];
      const id = link.href.split('?')[0];
      procesados.add(id);
      link.scrollIntoView({ block: 'center' });
      link.click();

      if (!(await H.esperarElemento(() => botonCompartir(), 6000))) {
        H.log('no se abrió el video o no veo el botón Compartir:', id);
        await volverAlPerfil();
        return 'sin_video';
      }
      await H.esperar(500);

      let quitar = H.buscarClicable(RE_QUITAR);
      if (!quitar) {
        botonCompartir().click();
        quitar = await H.esperarElemento(() => H.buscarClicable(RE_QUITAR), 2500);
      }
      if (!quitar) {
        H.log('opciones visibles tras Compartir:',
          [...document.querySelectorAll('[role="button"], button, [data-e2e*="share"]')].filter(H.visible).map((b) => H.texto(b) || H.label(b) || b.getAttribute('data-e2e')).filter(Boolean).slice(0, 40));
        await volverAlPerfil();
        return 'saltado:' + id.split('/').pop();
      }
      quitar.click();
      await H.esperar(1000);
      await volverAlPerfil();
      return 'ok';
    },
  };
})();
