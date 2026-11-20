// Al instalar o actualizar la extensión, se carga en las pestañas de Facebook/Messenger ya abiertas (sin F5).
chrome.runtime.onInstalled.addListener(async () => {
  const tabs = await chrome.tabs.query({ url: ['https://www.facebook.com/*', 'https://www.messenger.com/*'] });
  for (const t of tabs) {
    chrome.scripting.executeScript({ target: { tabId: t.id }, files: ['content.js'] }).catch(() => {});
  }
});
