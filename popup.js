const $ = (id) => document.getElementById(id);
let tab = null;
let moduloTab = null;     // módulo del sitio de la pestaña actual
let seleccionado = null;  // módulo elegido en el popup
let inyectado = false;

function el(tag, attrs = {}, txt) {
  const e = document.createElement(tag);
  Object.assign(e, attrs);
  if (txt != null) e.textContent = txt;
  return e;
}

function pintarActivo(on) {
  $('activo').checked = on;
  $('txtActivo').textContent = on ? 'Encendida' : 'Apagada';
}

function pintarModulos() {
  const cont = $('mods');
  cont.replaceChildren();
  for (const m of SCT_MODULOS) {
    const b = el('button', { className: 'mod' + (m.id === seleccionado ? ' on' : '') }, m.nombre);
    b.style.setProperty('--c', m.color);
    b.onclick = () => { seleccionado = m.id; chrome.storage.local.set({ moduloElegido: m.id }); refrescar(); };
    cont.append(b);
  }
}

function pintarAbrir() {
  const m = SCT_MODULOS.find((x) => x.id === seleccionado);
  const fuera = seleccionado !== moduloTab;
  $('abrir').style.display = fuera ? 'block' : 'none';
  $('panelModulo').style.display = fuera ? 'none' : 'block';
  if (fuera) {
    $('abrir').textContent = `Abrir ${m.nombre}`;
    $('estado').textContent = `Para usar ${m.nombre}, ábrelo en esta pestaña.`;
    $('iniciar').disabled = true;
    $('detener').disabled = true;
  }
}

function pintarEstado(r) {
  $('estado').textContent = r.texto;
  const cs = $('contadores'); cs.replaceChildren();
  const ms = $('modos'); ms.replaceChildren();
  for (const [k, v] of Object.entries(r.modos)) {
    const c = el('div', { className: 'contador' });
    const n = el('div', { className: 'num' }, r.cuenta[k] ?? 0); n.style.color = v.color;
    c.append(n, el('div', { className: 'lbl' }, v.contador));
    cs.append(c);
    const b = el('button', { className: 'b', disabled: r.corriendo }, v.etiqueta);
    if (r.modo === k) b.style.background = v.color;
    b.onclick = async () => {
      await chrome.storage.local.set({ [`${r.modulo}_modo`]: k });
      chrome.tabs.sendMessage(tab.id, { cmd: 'modo', modo: k }).catch(() => {});
      setTimeout(refrescar, 150);
    };
    ms.append(b);
  }
  ms.style.display = Object.keys(r.modos).length > 1 ? 'flex' : 'none';
  $('iniciar').disabled = !r.activo || r.corriendo;
  $('detener').disabled = !r.corriendo;
}

async function refrescar() {
  pintarModulos();
  pintarAbrir();
  if (!tab || seleccionado !== moduloTab) return;
  try {
    pintarEstado(await chrome.tabs.sendMessage(tab.id, { cmd: 'estado' }));
  } catch (e) {
    // La página no tiene el script (se abrió antes de instalar): lo cargamos sin F5
    const m = SCT_MODULOS.find((x) => x.id === moduloTab);
    if (m && !inyectado) {
      inyectado = true;
      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: m.js });
        $('estado').textContent = 'Cargando en la página…';
        setTimeout(refrescar, 400);
        return;
      } catch (_) {}
    }
    $('estado').textContent = 'No pude cargarme en esta página. Recárgala (F5).';
    $('iniciar').disabled = true;
    $('detener').disabled = true;
  }
}

async function init() {
  const { activo = true, moduloElegido } = await chrome.storage.local.get(['activo', 'moduloElegido']);
  pintarActivo(activo);
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  moduloTab = SCT_MODULOS.find((m) => m.re.test((tab && tab.url) || ''))?.id || null;
  seleccionado = moduloTab || moduloElegido || SCT_MODULOS[0].id;
  await refrescar();
  setInterval(refrescar, 1000);
}

$('activo').addEventListener('change', async (e) => {
  await chrome.storage.local.set({ activo: e.target.checked });
  pintarActivo(e.target.checked);
  setTimeout(refrescar, 200);
});

$('abrir').addEventListener('click', () => {
  const m = SCT_MODULOS.find((x) => x.id === seleccionado);
  chrome.tabs.update(tab.id, { url: m.url });
  window.close();
});

$('iniciar').addEventListener('click', async () => {
  await chrome.tabs.sendMessage(tab.id, { cmd: 'iniciar' }).catch(() => {});
  window.close(); // si hace falta confirmar, el aviso aparece en la página
});

$('detener').addEventListener('click', async () => {
  await chrome.tabs.sendMessage(tab.id, { cmd: 'detener' }).catch(() => {});
  refrescar();
});

init();
