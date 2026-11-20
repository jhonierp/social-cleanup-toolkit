// Módulo WhatsApp Web (web.whatsapp.com)
(() => {
  const H = globalThis.SCT_H;
  const RE_MENU_CHAT = /(men[uú] (del|de) chat|chat context menu|abrir el men[uú]|open chat context menu|m[aá]s opciones|more options)/i;
  const RE_OPCION = {
    eliminar: /^(eliminar chat|borrar chat|delete chat)$/i,
    archivar: /^(archivar chat|archive chat)$/i,
  };
  const RE_CONFIRMAR = /^(eliminar chat|eliminar|borrar chat|delete chat|delete)$/i;
  const RE_SALTAR = /^(archivados|archived|chats archivados|archived chats)$/i;
  const SEL_MENU = '[role="application"] [role="button"], [role="menu"] [role="menuitem"], [role="menu"] [role="button"], li[role="button"], li [role="button"], [data-animate-dropdown-item] [role="button"], [role="menuitem"]';
  const saltar = new Set();

  function filas() {
    const panel = document.querySelector('#pane-side') || document.querySelector('[aria-label*="Lista de chats" i], [aria-label*="Chat list" i]');
    if (!panel) return [];
    return [...panel.querySelectorAll('[role="listitem"], [role="row"]')].filter(H.visible);
  }

  function botonConfirmar() {
    const capas = [...document.querySelectorAll('[role="dialog"], [data-animate-modal-popup], [data-animate-modal-body]')].filter(H.visible);
    for (const d of capas.reverse()) {
      const bs = [...d.querySelectorAll('[role="button"], button')].filter(H.visible).reverse();
      const b = bs.find((x) => RE_CONFIRMAR.test(H.texto(x)) || RE_CONFIRMAR.test(H.label(x)));
      if (b) return b;
    }
    return null;
  }

  async function abrirMenu(fila) {
    // 1) clic derecho sobre el chat (WhatsApp Web abre su menú contextual)
    H.clicDerecho(fila.querySelector('[role="gridcell"]') || fila.firstElementChild || fila);
    if (await H.esperarElemento(() => H.buscarClicable(/./, document, SEL_MENU), 1200)) return true;
    // 2) flechita "v" que aparece al pasar el mouse
    H.hover(fila);
    const flecha = await H.esperarElemento(() => {
      const bs = [...fila.querySelectorAll('[role="button"], button, [data-icon="down"], [data-icon*="chevron"]')].filter(H.visible);
      return bs.find((b) => RE_MENU_CHAT.test(H.label(b))) || bs.find((b) => /down|chevron/.test(b.getAttribute('data-icon') || ''))?.closest('[role="button"], button') || null;
    }, 1500);
    if (!flecha) return false;
    flecha.click();
    return !!(await H.esperarElemento(() => H.buscarClicable(/./, document, SEL_MENU), 1500));
  }

  globalThis.SCT_ADAPTERS.whatsapp = {
    id: 'whatsapp',
    nombre: 'WhatsApp',
    url: 'https://web.whatsapp.com/',
    dominio: () => location.hostname === 'web.whatsapp.com',
    enPagina: () => location.hostname === 'web.whatsapp.com',
    ayuda: 'Abre web.whatsapp.com e inicia sesión.',
    modos: {
      eliminar: { etiqueta: 'Eliminar', contador: 'eliminados', color: '#e41e3f', permanente: true },
      archivar: { etiqueta: 'Archivar', contador: 'archivados', color: '#25d366', permanente: false },
    },

    async procesarUno(modo) {
      H.escape();
      await H.esperar(250);
      const todas = filas();
      const candidatas = todas.filter((f) => !RE_SALTAR.test(H.clave(f)) && !saltar.has(H.clave(f)));
      if (!candidatas.length) {
        const p = document.querySelector('#pane-side');
        if (p && p.scrollTop + p.clientHeight < p.scrollHeight - 5) { p.scrollBy(0, 500); return 'scroll'; }
        return 'sin_items';
      }

      const fila = candidatas[0];
      const nombre = H.clave(fila);
      if (!(await abrirMenu(fila))) {
        H.log('no se abrió el menú del chat:', nombre);
        saltar.add(nombre);
        return 'saltado:' + nombre;
      }

      const opcion = await H.esperarElemento(() => H.buscarClicable(RE_OPCION[modo], document, SEL_MENU), 2000);
      if (!opcion) {
        // p. ej. en grupos aparece "Salir del grupo" en vez de "Eliminar chat"
        H.log('opciones del menú:', [...document.querySelectorAll(SEL_MENU)].filter(H.visible).map(H.texto));
        H.escape();
        saltar.add(nombre);
        return 'saltado:' + nombre;
      }
      opcion.click();

      if (modo === 'eliminar') {
        const ok = await H.esperarElemento(botonConfirmar, 3000);
        if (!ok) { H.escape(); return 'sin_confirmacion'; }
        ok.click();
      }
      // WhatsApp reutiliza las filas: esperamos a que ese nombre ya no esté en la lista
      await H.esperarElemento(() => !filas().some((f) => H.clave(f) === nombre) || null, 6000);
      return 'ok';
    },
  };
})();
