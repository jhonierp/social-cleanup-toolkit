(() => {
  // Cada inyección reemplaza a la anterior (por ejemplo, tras recargar la extensión sin F5)
  const yo = {};
  window.__bcmInstancia = yo;
  const viva = () => window.__bcmInstancia === yo;
  const viejo = document.getElementById('bcm-panel');
  if (viejo) viejo.remove();

  // Textos que buscamos (español e inglés)
  const RE_MAS_OPCIONES = /(m[aá]s opciones|more options|men[uú]|menu|opciones del chat|chat settings)/i;
  const RE_OPCION = {
    eliminar: /^(eliminar chat|eliminar conversaci[oó]n|delete chat|delete conversation)$/i,
    archivar: /^(archivar chat|archivar conversaci[oó]n|archivar|archive chat|archive conversation|archive)$/i,
  };
  const RE_CONFIRMAR = /^(eliminar chat|eliminar|delete chat|delete)$/i;

  // Filas que no son chats normales y se saltan siempre
  const RE_SALTAR = /^(marketplace|chats archivados|archived chats|solicitudes de mensajes|message requests)$/i;
  const saltar = new Set();             // filas que fallaron en esta sesión y se saltan
  const clave = (f) => (f.innerText || '').split('\n')[0].trim();

  const PAUSA_MS = 1500;   // pausa entre chats
  const MAX_FALLOS = 8;    // intentos fallidos seguidos antes de parar

  let corriendo = false;
  let activo = true;
  let modo = 'eliminar';
  const cuenta = { eliminar: 0, archivar: 0 };
  let ultimoEstado = 'Listo para empezar.';
  let yaConfirmado = false;

  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  const texto = (el) => (el.innerText || el.textContent || '').trim();
  const visible = (el) => !!(el && el.offsetParent !== null && el.getClientRects().length);
  const accion = () => (modo === 'eliminar' ? 'Eliminando' : 'Archivando');

  async function esperarElemento(fn, timeout = 4000) {
    const fin = Date.now() + timeout;
    while (Date.now() < fin) {
      const el = fn();
      if (el) return el;
      await esperar(150);
    }
    return null;
  }

  function filasDeChats() {
    const lista =
      document.querySelector('[role="grid"][aria-label*="Chat" i]') ||
      document.querySelector('[role="navigation"] [role="grid"]') ||
      document.querySelector('[role="grid"]');
    if (!lista) return [];
    return [...lista.querySelectorAll('[role="row"]')].filter(visible);
  }

  function botonMasOpciones(fila) {
    const botones = [...fila.querySelectorAll('[aria-haspopup="menu"], [role="button"][aria-label], [aria-label][tabindex]')];
    return (
      botones.find((b) => RE_MAS_OPCIONES.test(b.getAttribute('aria-label') || '')) ||
      botones.find((b) => b.getAttribute('aria-haspopup') === 'menu') ||
      null
    );
  }

  function opcionDelMenu() {
    const items = [...document.querySelectorAll('[role="menuitem"], [role="menu"] [role="button"]')];
    return items.find((i) => visible(i) && RE_OPCION[modo].test(texto(i))) || null;
  }

  function botonConfirmar() {
    const dialogos = [...document.querySelectorAll('[role="dialog"]')].filter(visible);
    for (const d of dialogos.reverse()) {
      const botones = [...d.querySelectorAll('[role="button"], button')].filter(visible);
      const b = botones.reverse().find(
        (x) => RE_CONFIRMAR.test(texto(x)) || RE_CONFIRMAR.test(x.getAttribute('aria-label') || '')
      );
      if (b) return b;
    }
    return null;
  }

  function hover(el) {
    const r = el.getBoundingClientRect();
    const op = { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
    const objetivos = [el, el.querySelector('a'), el.firstElementChild].filter(Boolean);
    for (const o of objetivos) {
      for (const tipo of ['pointerover', 'pointerenter', 'mouseover', 'mouseenter', 'pointermove', 'mousemove']) {
        const E = tipo.startsWith('pointer') ? PointerEvent : MouseEvent;
        o.dispatchEvent(new E(tipo, op));
      }
    }
  }

  function cerrarMenus() {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  }

  async function procesarUno() {
    cerrarMenus();
    await esperar(200);
    const todas = filasDeChats();
    const filas = todas.filter((f) => !RE_SALTAR.test(clave(f)) && !saltar.has(clave(f)));
    if (!filas.length) {
      if (todas.length) {
        const lista = todas[0].closest('[role="grid"]');
        if (lista && lista.scrollTop + lista.clientHeight < lista.scrollHeight - 5) {
          lista.scrollBy(0, 400);
          return 'scroll';
        }
      }
      return 'sin_chats';
    }

    // Probamos las primeras filas: si una no muestra el botón "…", pasamos a la siguiente
    let fila = null, mas = null;
    for (const f of filas.slice(0, 6)) {
      f.scrollIntoView({ block: 'nearest' });
      hover(f);
      mas = await esperarElemento(() => botonMasOpciones(f), 1500);
      if (mas) { fila = f; break; }
      console.log('[Social Cleanup] fila sin botón "…":', (f.innerText || '').slice(0, 60),
        [...f.querySelectorAll('[aria-label]')].map((x) => x.getAttribute('aria-label')));
    }
    if (!mas) {
      // Hacemos scroll en la lista para que Facebook cargue/renueve las filas
      const lista = filas[0].closest('[role="grid"]');
      if (lista) lista.scrollBy(0, 300);
      return 'sin_boton';
    }
    mas.click();

    const opcion = await esperarElemento(opcionDelMenu, 3000);
    if (!opcion) {
      console.log('[Social Cleanup] opciones del menú:',
        [...document.querySelectorAll('[role="menuitem"]')].map((i) => (i.innerText || '').trim()));
      cerrarMenus();
      saltar.add(clave(fila));
      return 'saltado:' + clave(fila);
    }
    opcion.click();

    if (modo === 'eliminar') {
      const confirmar = await esperarElemento(botonConfirmar, 3000);
      if (!confirmar) { cerrarMenus(); return 'sin_confirmacion'; }
      confirmar.click();
    }

    await esperarElemento(() => !document.body.contains(fila) || null, 5000);
    return 'ok';
  }

  async function ciclo() {
    let fallos = 0;
    while (corriendo && viva()) {
      const r = await procesarUno();
      if (!corriendo) break;
      if (r === 'ok') {
        cuenta[modo]++;
        fallos = 0;
        estado(`${accion()}…`);
      } else if (r === 'scroll') {
        estado('Buscando más chats…');
      } else if (r.startsWith('saltado:')) {
        estado(`Salté "${r.slice(8)}" (no tiene esa opción).`);
      } else if (r === 'sin_chats') {
        estado('Listo: no quedan chats visibles.');
        break;
      } else {
        fallos++;
        estado(`No pude con un chat (${r}). Reintento ${fallos}/${MAX_FALLOS}`);
        if (fallos >= MAX_FALLOS) {
          estado(`Detenido tras ${MAX_FALLOS} fallos (${r}).`);
          break;
        }
      }
      await esperar(PAUSA_MS);
    }
    corriendo = false;
    actualizarPanel();
  }

  // ---- Panel flotante ----
  const panel = document.createElement('div');
  panel.id = 'bcm-panel';
  panel.style.cssText =
    'position:fixed;bottom:16px;left:16px;z-index:2147483647;background:#1c1e21;color:#fff;' +
    'font:13px system-ui,sans-serif;padding:12px;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.4);width:250px';
  // Construimos el panel sin innerHTML (Facebook bloquea innerHTML con Trusted Types)
  function h(tag, css, txt, attrs) {
    const el = document.createElement(tag);
    if (css) el.style.cssText = css;
    if (txt != null) el.textContent = txt;
    if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  const cajaNum = (id, color, etiqueta) => {
    const c = h('div', 'flex:1;background:#242526;border-radius:8px;padding:6px;text-align:center');
    c.append(h('div', `font-size:20px;font-weight:700;color:${color}`, '0', { id }),
             h('div', 'opacity:.7;font-size:11px', etiqueta));
    return c;
  };
  const btnCss = 'flex:1;padding:6px;border:0;border-radius:6px;color:#fff;cursor:pointer;background:#3a3b3c';
  const filaNums = h('div', 'display:flex;gap:8px;margin-bottom:8px');
  filaNums.append(cajaNum('bcm-n-eliminar', '#ff6b81', 'eliminados'), cajaNum('bcm-n-archivar', '#4dabf7', 'archivados'));
  const filaModos = h('div', 'display:flex;gap:6px;margin-bottom:8px');
  filaModos.append(h('button', btnCss, 'Eliminar', { id: 'bcm-m-eliminar' }), h('button', btnCss, 'Archivar', { id: 'bcm-m-archivar' }));
  const filaBotones = h('div', 'display:flex;gap:6px');
  filaBotones.append(h('button', btnCss.replace('#3a3b3c', '#31a24c'), 'Iniciar', { id: 'bcm-iniciar' }),
                     h('button', btnCss, 'Detener', { id: 'bcm-detener' }));
  panel.append(
    h('div', 'font-weight:600;margin-bottom:8px', 'Social Cleanup Toolkit · Messenger'),
    filaNums, filaModos,
    h('div', 'margin-bottom:8px;opacity:.85;min-height:16px', '', { id: 'bcm-estado' }),
    filaBotones
  );

  const q = (s) => panel.querySelector(s);
  function estado(t) { ultimoEstado = t; actualizarPanel(); }
  function actualizarPanel() {
    q('#bcm-estado').textContent = ultimoEstado;
    q('#bcm-n-eliminar').textContent = cuenta.eliminar;
    q('#bcm-n-archivar').textContent = cuenta.archivar;
    for (const m of ['eliminar', 'archivar']) {
      const b = q('#bcm-m-' + m);
      b.style.background = modo === m ? (m === 'eliminar' ? '#e41e3f' : '#1877f2') : '#3a3b3c';
      b.disabled = corriendo;
      b.style.opacity = corriendo && modo !== m ? '.4' : '1';
    }
    q('#bcm-iniciar').disabled = corriendo;
    q('#bcm-iniciar').style.opacity = corriendo ? '.4' : '1';
    q('#bcm-detener').disabled = !corriendo;
    q('#bcm-detener').style.opacity = corriendo ? '1' : '.4';
  }

  function cambiarModo(m) {
    if (corriendo || !RE_OPCION[m]) return;
    modo = m;
    chrome.storage.local.set({ modo: m });
    estado(m === 'eliminar' ? 'Modo: eliminar (permanente).' : 'Modo: archivar (se puede deshacer).');
  }

  function iniciar() {
    if (corriendo || !activo || !enMensajes()) return;
    // Solo se pregunta la primera vez que se elimina en esta página; archivar no pregunta
    if (modo === 'eliminar' && !yaConfirmado) {
      if (!window.confirm('Esto ELIMINARÁ tus chats de forma PERMANENTE. Si aceptas, no se volverá a preguntar. ¿Continuar?')) return;
      yaConfirmado = true;
      chrome.storage.local.set({ yaConfirmado: true });
    }
    corriendo = true;
    estado('Empezando…');
    ciclo();
  }
  function detener() {
    if (!corriendo) return;
    corriendo = false;
    estado('Detenido.');
  }

  q('#bcm-m-eliminar').onclick = () => cambiarModo('eliminar');
  q('#bcm-m-archivar').onclick = () => cambiarModo('archivar');
  q('#bcm-iniciar').onclick = iniciar;
  q('#bcm-detener').onclick = detener;

  function enMensajes() {
    return location.hostname === 'www.messenger.com' || location.pathname.startsWith('/messages');
  }
  let reloj = null;
  function sincronizarPanel() {
    if (!viva()) { corriendo = false; clearInterval(reloj); if (panel.isConnected) panel.remove(); return; }
    const mostrar = activo && enMensajes();
    if (mostrar && !panel.isConnected) document.body.appendChild(panel);
    if (!mostrar && panel.isConnected) { corriendo = false; panel.remove(); }
  }

  // Encendido / apagado y modo desde el botón de la barra
  chrome.storage.local.get(['activo', 'modo', 'yaConfirmado']).then(({ activo: a = true, modo: m = 'eliminar', yaConfirmado: c = false }) => {
    activo = a; modo = m; yaConfirmado = c; actualizarPanel(); sincronizarPanel();
  });
  chrome.storage.onChanged.addListener((c) => {
    if (c.modo && !corriendo) { modo = c.modo.newValue; actualizarPanel(); }
    if (c.activo) {
      activo = c.activo.newValue;
      if (!activo) { corriendo = false; ultimoEstado = 'Apagada.'; actualizarPanel(); }
      sincronizarPanel();
    }
  });

  chrome.runtime.onMessage.addListener((msg, _sender, responder) => {
    if (!viva()) return;
    if (msg.cmd === 'iniciar') setTimeout(iniciar, 0);
    if (msg.cmd === 'detener') detener();
    if (msg.cmd === 'modo') cambiarModo(msg.modo);
    let t = ultimoEstado;
    if (!activo) t = 'La extensión está apagada.';
    else if (!enMensajes()) t = 'Ve a facebook.com/messages para usarla.';
    responder({ activo, corriendo, modo, cuenta, texto: t });
  });

  actualizarPanel();
  sincronizarPanel();
  reloj = setInterval(sincronizarPanel, 1000);
})();
