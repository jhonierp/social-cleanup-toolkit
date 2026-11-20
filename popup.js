const $ = (id) => document.getElementById(id);
let tabId = null;
let tabUrl = '';
let inyectado = false;
const URL_OK = /^https:\/\/www\.(facebook|messenger)\.com\//;

function pintarActivo(on) {
  $('activo').checked = on;
  $('txtActivo').textContent = on ? 'Encendida' : 'Apagada';
}
function pintarModo(m, bloqueado) {
  $('m-eliminar').classList.toggle('on', m === 'eliminar');
  $('m-archivar').classList.toggle('on', m === 'archivar');
  $('m-eliminar').disabled = bloqueado;
  $('m-archivar').disabled = bloqueado;
}

async function pedirEstado() {
  if (!tabId) return;
  try {
    const r = await chrome.tabs.sendMessage(tabId, { cmd: 'estado' });
    $('estado').textContent = r.texto;
    $('n-eliminar').textContent = r.cuenta.eliminar;
    $('n-archivar').textContent = r.cuenta.archivar;
    pintarModo(r.modo, r.corriendo);
    $('iniciar').disabled = !r.activo || r.corriendo;
    $('detener').disabled = !r.corriendo;
  } catch (e) {
    // La página no tiene el script (p. ej. se abrió antes de instalar): lo cargamos sin F5
    if (!inyectado && URL_OK.test(tabUrl)) {
      inyectado = true;
      try {
        await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
        setTimeout(pedirEstado, 300);
        $('estado').textContent = 'Cargando en la página…';
        return;
      } catch (_) {}
    }
    $('estado').textContent = URL_OK.test(tabUrl)
      ? 'No pude cargarme en esta página. Recárgala (F5).'
      : 'Abre facebook.com/messages para usarla.';
    $('iniciar').disabled = true;
    $('detener').disabled = true;
  }
}

async function init() {
  const { activo = true, modo = 'eliminar' } = await chrome.storage.local.get(['activo', 'modo']);
  pintarActivo(activo);
  pintarModo(modo, false);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab ? tab.id : null;
  tabUrl = (tab && tab.url) || '';
  await pedirEstado();
  setInterval(pedirEstado, 1000);
}

$('activo').addEventListener('change', async (e) => {
  await chrome.storage.local.set({ activo: e.target.checked });
  pintarActivo(e.target.checked);
  setTimeout(pedirEstado, 200);
});

for (const m of ['eliminar', 'archivar']) {
  $('m-' + m).addEventListener('click', async () => {
    await chrome.storage.local.set({ modo: m });
    pintarModo(m, false);
    if (tabId) chrome.tabs.sendMessage(tabId, { cmd: 'modo', modo: m }).catch(() => {});
    setTimeout(pedirEstado, 200);
  });
}

$('iniciar').addEventListener('click', async () => {
  if (!tabId) return;
  await chrome.tabs.sendMessage(tabId, { cmd: 'iniciar' }).catch(() => {});
  window.close(); // la confirmación aparece en la página de Messenger
});

$('detener').addEventListener('click', async () => {
  if (!tabId) return;
  await chrome.tabs.sendMessage(tabId, { cmd: 'detener' }).catch(() => {});
  pedirEstado();
});

init();
