// Núcleo de Social Cleanup Toolkit: panel, ciclo, contadores y mensajes con el popup.
// Cada sitio aporta su módulo en adapters/*.js (se cargan antes que este archivo).
(() => {
  const H = globalThis.SCT_H;
  const A = Object.values(globalThis.SCT_ADAPTERS || {}).find((a) => a.dominio());
  if (!H || !A) return;

  // Cada inyección reemplaza a la anterior (por ejemplo, tras recargar la extensión sin F5)
  const yo = {};
  window.__sctInstancia = yo;
  const viva = () => window.__sctInstancia === yo;
  document.getElementById('sct-panel')?.remove();

  const PAUSA_MS = 1500;   // pausa entre elementos
  const MAX_FALLOS = 8;    // fallos seguidos antes de parar
  const MAX_SCROLLS = 15;  // scrolls seguidos sin encontrar nada antes de terminar

  const modos = Object.keys(A.modos);
  let modo = modos[0];
  let activo = true;
  let corriendo = false;
  let yaConfirmado = false;
  let ultimoEstado = 'Listo para empezar.';
  const cuenta = Object.fromEntries(modos.map((m) => [m, 0]));
  const K = (k) => `${A.id}_${k}`;   // claves de storage por módulo

  async function ciclo() {
    let fallos = 0, scrolls = 0;
    while (corriendo && viva()) {
      let r;
      try { r = await A.procesarUno(modo); } catch (e) { H.log(e); r = 'error'; }
      if (!corriendo || !viva()) break;
      if (r === 'ok') { cuenta[modo]++; fallos = 0; scrolls = 0; estado('Trabajando…'); }
      else if (r === 'scroll') { if (++scrolls > MAX_SCROLLS) { estado('Listo: no encontré más elementos.'); break; } estado('Buscando más…'); }
      else if (r === 'sigue') { fallos = 0; estado('Trabajando…'); }
      else if (r === 'sin_items') { estado('Listo: no quedan elementos visibles.'); break; }
      else if (r.startsWith('saltado:')) { estado(`Salté "${r.slice(8)}" (no tiene esa opción).`); }
      else {
        fallos++;
        estado(`No pude con uno (${r}). Reintento ${fallos}/${MAX_FALLOS}`);
        if (fallos >= MAX_FALLOS) { estado(`Detenido tras ${MAX_FALLOS} fallos (${r}).`); break; }
      }
      await H.esperar(PAUSA_MS);
    }
    corriendo = false;
    pintar();
  }

  // ---- Panel flotante (sin innerHTML: algunas webs lo bloquean con Trusted Types) ----
  function h(tag, css, txt, attrs) {
    const el = document.createElement(tag);
    if (css) el.style.cssText = css;
    if (txt != null) el.textContent = txt;
    if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  const btnCss = 'flex:1;padding:6px;border:0;border-radius:6px;color:#fff;cursor:pointer;background:#3a3b3c;font:inherit';
  const panel = h('div',
    'position:fixed;bottom:16px;left:16px;z-index:2147483647;background:#1c1e21;color:#fff;' +
    'font:13px system-ui,sans-serif;padding:12px;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.4);width:260px',
    null, { id: 'sct-panel' });
  const nums = h('div', 'display:flex;gap:8px;margin-bottom:8px');
  const elNum = {};
  for (const m of modos) {
    const c = h('div', 'flex:1;background:#242526;border-radius:8px;padding:6px;text-align:center');
    elNum[m] = h('div', `font-size:20px;font-weight:700;color:${A.modos[m].color}`, '0');
    c.append(elNum[m], h('div', 'opacity:.7;font-size:11px', A.modos[m].contador));
    nums.append(c);
  }
  const filaModos = h('div', 'display:flex;gap:6px;margin-bottom:8px');
  const elModo = {};
  for (const m of modos) {
    elModo[m] = h('button', btnCss, A.modos[m].etiqueta);
    elModo[m].onclick = () => cambiarModo(m);
    filaModos.append(elModo[m]);
  }
  if (modos.length < 2) filaModos.style.display = 'none';
  const elEstado = h('div', 'margin-bottom:8px;opacity:.85;min-height:16px');
  const bIniciar = h('button', btnCss.replace('#3a3b3c', '#31a24c'), 'Iniciar');
  const bDetener = h('button', btnCss, 'Detener');
  bIniciar.onclick = () => iniciar();
  bDetener.onclick = () => detener();
  const filaBtns = h('div', 'display:flex;gap:6px');
  filaBtns.append(bIniciar, bDetener);
  panel.append(h('div', 'font-weight:600;margin-bottom:8px', `Social Cleanup Toolkit · ${A.nombre}`), nums, filaModos, elEstado, filaBtns);

  function pintar() {
    elEstado.textContent = ultimoEstado;
    for (const m of modos) {
      elNum[m].textContent = cuenta[m];
      elModo[m].style.background = modo === m ? A.modos[m].color : '#3a3b3c';
      elModo[m].disabled = corriendo;
      elModo[m].style.opacity = corriendo && modo !== m ? '.4' : '1';
    }
    bIniciar.disabled = corriendo; bIniciar.style.opacity = corriendo ? '.4' : '1';
    bDetener.disabled = !corriendo; bDetener.style.opacity = corriendo ? '1' : '.4';
  }
  function estado(t) { ultimoEstado = t; pintar(); }

  function cambiarModo(m) {
    if (corriendo || !A.modos[m]) return;
    modo = m;
    chrome.storage.local.set({ [K('modo')]: m });
    estado(`Modo: ${A.modos[m].etiqueta}${A.modos[m].permanente ? ' (permanente)' : ''}.`);
  }

  function iniciar() {
    if (corriendo || !activo || !A.enPagina()) return;
    // Solo se pregunta una vez (por módulo) antes de una acción permanente
    if (A.modos[modo].permanente && !yaConfirmado) {
      if (!window.confirm(`Esto hará "${A.modos[modo].etiqueta}" de forma PERMANENTE en ${A.nombre}. Si aceptas, no se volverá a preguntar. ¿Continuar?`)) return;
      yaConfirmado = true;
      chrome.storage.local.set({ [K('confirmado')]: true });
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

  let reloj = null;
  function sincronizar() {
    if (!viva()) { corriendo = false; clearInterval(reloj); panel.remove(); return; }
    const mostrar = activo && A.enPagina();
    if (mostrar && !panel.isConnected) document.body.appendChild(panel);
    if (!mostrar && panel.isConnected) { corriendo = false; panel.remove(); }
  }

  chrome.storage.local.get(['activo', K('modo'), K('confirmado')]).then((s) => {
    activo = s.activo !== false;
    if (A.modos[s[K('modo')]]) modo = s[K('modo')];
    yaConfirmado = !!s[K('confirmado')];
    pintar(); sincronizar();
  });
  chrome.storage.onChanged.addListener((c) => {
    if (!viva()) return;
    if (c[K('modo')] && !corriendo && A.modos[c[K('modo')].newValue]) { modo = c[K('modo')].newValue; pintar(); }
    if (c.activo) {
      activo = c.activo.newValue !== false;
      if (!activo) { corriendo = false; ultimoEstado = 'Apagada.'; pintar(); }
      sincronizar();
    }
  });

  chrome.runtime.onMessage.addListener((msg, _s, responder) => {
    if (!viva()) return;
    if (msg.cmd === 'iniciar') setTimeout(iniciar, 0);
    if (msg.cmd === 'detener') detener();
    if (msg.cmd === 'modo') cambiarModo(msg.modo);
    let texto = ultimoEstado;
    if (!activo) texto = 'La extensión está apagada.';
    else if (!A.enPagina()) texto = A.ayuda;
    responder({
      modulo: A.id, nombre: A.nombre, activo, corriendo, modo, cuenta, texto,
      modos: Object.fromEntries(modos.map((m) => [m, { etiqueta: A.modos[m].etiqueta, contador: A.modos[m].contador, color: A.modos[m].color }])),
    });
  });

  pintar();
  sincronizar();
  reloj = setInterval(sincronizar, 1000);
})();
