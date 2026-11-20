// Lista de módulos compartida por el popup y el service worker
const SCT_MODULOS = [
  { id: 'messenger', nombre: 'Messenger', url: 'https://www.facebook.com/messages/t/', color: '#0866ff',
    re: /^https:\/\/www\.(facebook|messenger)\.com\//, js: ['adapters/helpers.js', 'adapters/messenger.js', 'content.js'] },
  { id: 'whatsapp', nombre: 'WhatsApp', url: 'https://web.whatsapp.com/', color: '#25d366',
    re: /^https:\/\/web\.whatsapp\.com\//, js: ['adapters/helpers.js', 'adapters/whatsapp.js', 'content.js'] },
  { id: 'tiktok', nombre: 'TikTok', url: 'https://www.tiktok.com/profile', color: '#fe2c55',
    re: /^https:\/\/([a-z0-9-]+\.)?tiktok\.com\//, js: ['adapters/helpers.js', 'adapters/tiktok.js', 'content.js'] },
];
