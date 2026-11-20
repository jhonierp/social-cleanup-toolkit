// Utilidades compartidas por todos los módulos (se cargan antes que cada adaptador)
(() => {
  const H = {};
  H.esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  H.texto = (el) => (el ? (el.innerText || el.textContent || '').trim() : '');
  H.visible = (el) => !!(el && el.isConnected && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
  H.clave = (el) => H.texto(el).split('\n')[0].trim();
  H.label = (el) => (el.getAttribute('aria-label') || '').trim();

  H.esperarElemento = async (fn, timeout = 4000) => {
    const fin = Date.now() + timeout;
    while (Date.now() < fin) {
      const el = fn();
      if (el) return el;
      await H.esperar(150);
    }
    return null;
  };

  H.centro = (el) => {
    const r = el.getBoundingClientRect();
    return { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
  };

  H.hover = (el) => {
    const op = { bubbles: true, ...H.centro(el) };
    for (const o of [el, el.querySelector('a'), el.firstElementChild].filter(Boolean)) {
      for (const t of ['pointerover', 'pointerenter', 'mouseover', 'mouseenter', 'pointermove', 'mousemove']) {
        o.dispatchEvent(new (t.startsWith('pointer') ? PointerEvent : MouseEvent)(t, op));
      }
    }
  };

  H.clicDerecho = (el) => {
    const op = { bubbles: true, cancelable: true, button: 2, buttons: 2, ...H.centro(el) };
    el.dispatchEvent(new PointerEvent('pointerdown', op));
    el.dispatchEvent(new MouseEvent('mousedown', op));
    el.dispatchEvent(new MouseEvent('contextmenu', op));
  };

  H.escape = () => {
    for (const t of ['keydown', 'keyup']) {
      document.activeElement?.dispatchEvent(new KeyboardEvent(t, { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
      document.body.dispatchEvent(new KeyboardEvent(t, { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
    }
  };

  // Busca un elemento clicable visible cuyo texto o aria-label cumpla la expresión
  H.buscarClicable = (re, raiz = document, sel = '[role="menuitem"], [role="button"], button, li, a') => {
    const els = [...raiz.querySelectorAll(sel)].filter(H.visible);
    return els.find((e) => re.test(H.texto(e)) || re.test(H.label(e))) || null;
  };

  H.log = (...a) => console.log('[Social Cleanup]', ...a);

  globalThis.SCT_H = H;
  globalThis.SCT_ADAPTERS = globalThis.SCT_ADAPTERS || {};
})();
