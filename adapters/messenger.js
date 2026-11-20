// Módulo Messenger (facebook.com/messages y messenger.com)
(() => {
  const H = globalThis.SCT_H;
  const RE_MAS_OPCIONES = /(m[aá]s opciones|more options|men[uú]|menu|opciones del chat|chat settings)/i;
  const RE_OPCION = {
    eliminar: /^(eliminar chat|eliminar conversaci[oó]n|delete chat|delete conversation)$/i,
    archivar: /^(archivar chat|archivar conversaci[oó]n|archivar|archive chat|archive conversation|archive)$/i,
  };
  const RE_CONFIRMAR = /^(eliminar chat|eliminar|delete chat|delete)$/i;
  const RE_SALTAR = /^(marketplace|chats archivados|archived chats|solicitudes de mensajes|message requests)$/i;
  const saltar = new Set();

  function filas() {
    const lista =
      document.querySelector('[role="grid"][aria-label*="Chat" i]') ||
      document.querySelector('[role="navigation"] [role="grid"]') ||
      document.querySelector('[role="grid"]');
    if (!lista) return [];
    return [...lista.querySelectorAll('[role="row"]')].filter(H.visible);
  }

  function botonMas(fila) {
    const bs = [...fila.querySelectorAll('[aria-haspopup="menu"], [role="button"][aria-label], [aria-label][tabindex]')];
    return bs.find((b) => RE_MAS_OPCIONES.test(H.label(b))) || bs.find((b) => b.getAttribute('aria-haspopup') === 'menu') || null;
  }

  function botonConfirmar() {
    for (const d of [...document.querySelectorAll('[role="dialog"]')].filter(H.visible).reverse()) {
      const bs = [...d.querySelectorAll('[role="button"], button')].filter(H.visible).reverse();
      const b = bs.find((x) => RE_CONFIRMAR.test(H.texto(x)) || RE_CONFIRMAR.test(H.label(x)));
      if (b) return b;
    }
    return null;
  }

  globalThis.SCT_ADAPTERS.messenger = {
    id: 'messenger',
    nombre: 'Messenger',
    url: 'https://www.facebook.com/messages/t/',
    dominio: () => /(^|\.)(facebook|messenger)\.com$/.test(location.hostname),
    enPagina: () => location.hostname === 'www.messenger.com' || location.pathname.startsWith('/messages'),
    ayuda: 'Ve a facebook.com/messages para usarla.',
    modos: {
      eliminar: { etiqueta: 'Eliminar', contador: 'eliminados', color: '#e41e3f', permanente: true },
      archivar: { etiqueta: 'Archivar', contador: 'archivados', color: '#1877f2', permanente: false },
    },

    async procesarUno(modo) {
      H.escape();
      await H.esperar(200);
      const todas = filas();
      const candidatas = todas.filter((f) => !RE_SALTAR.test(H.clave(f)) && !saltar.has(H.clave(f)));
      if (!candidatas.length) {
        const lista = todas[0]?.closest('[role="grid"]');
        if (lista && lista.scrollTop + lista.clientHeight < lista.scrollHeight - 5) { lista.scrollBy(0, 400); return 'scroll'; }
        return 'sin_items';
      }

      let fila = null, mas = null;
      for (const f of candidatas.slice(0, 6)) {
        f.scrollIntoView({ block: 'nearest' });
        H.hover(f);
        mas = await H.esperarElemento(() => botonMas(f), 1500);
        if (mas) { fila = f; break; }
        H.log('fila sin botón "…":', H.clave(f), [...f.querySelectorAll('[aria-label]')].map(H.label));
      }
      if (!mas) { candidatas[0].closest('[role="grid"]')?.scrollBy(0, 300); return 'sin_boton'; }
      mas.click();

      const opcion = await H.esperarElemento(() => H.buscarClicable(RE_OPCION[modo], document, '[role="menuitem"], [role="menu"] [role="button"]'), 3000);
      if (!opcion) {
        H.log('opciones del menú:', [...document.querySelectorAll('[role="menuitem"]')].map(H.texto));
        H.escape();
        saltar.add(H.clave(fila));
        return 'saltado:' + H.clave(fila);
      }
      opcion.click();

      if (modo === 'eliminar') {
        const ok = await H.esperarElemento(botonConfirmar, 3000);
        if (!ok) { H.escape(); return 'sin_confirmacion'; }
        ok.click();
      }
      await H.esperarElemento(() => !document.body.contains(fila) || null, 5000);
      return 'ok';
    },
  };
})();
