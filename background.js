importScripts('modulos.js');

// Al instalar o actualizar, se carga en las pestañas ya abiertas de cada sitio (sin F5)
chrome.runtime.onInstalled.addListener(async () => {
  const tabs = await chrome.tabs.query({});
  for (const t of tabs) {
    const m = SCT_MODULOS.find((x) => x.re.test(t.url || ''));
    if (m) chrome.scripting.executeScript({ target: { tabId: t.id }, files: m.js }).catch(() => {});
  }
});
