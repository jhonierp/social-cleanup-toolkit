# Social Cleanup Toolkit

Extensión multiuso para navegadores basados en Chromium (Opera, Chrome, Edge, Brave) con herramientas de **limpieza masiva para redes sociales**. Automatiza los clics que harías a mano, uno por uno, mientras tú la vigilas.

| Módulo | Sitio | Acciones |
|---|---|---|
| **Messenger** | `facebook.com/messages`, `messenger.com` | Eliminar chats · Archivar chats |
| **WhatsApp** | `web.whatsapp.com` | Eliminar chats · Archivar chats |
| **TikTok** | `tiktok.com` (perfil → *Publicaciones compartidas*) | Quitar compartidos (reposts) |

> ⚠️ **Eliminar chats es permanente.** No se pueden recuperar. Si solo quieres limpiar la bandeja, usa **Archivar**. Quitar una republicación de TikTok no borra el video original.

## Funciones

- **Selector de módulo** en el popup: Messenger, WhatsApp o TikTok. Si no estás en ese sitio, ofrece un botón para abrirlo.
- **Contadores** por acción (eliminados, archivados, quitados) en la sesión.
- **Interruptor de encendido/apagado** global.
- **Panel flotante** en la esquina inferior izquierda de cada sitio con las mismas opciones.
- **Iniciar / Detener** en cualquier momento.
- **Salta lo que no aplica:** Marketplace, *Archivados*, solicitudes de mensajes, grupos de WhatsApp sin opción de eliminar, videos de TikTok sin republicación, etc.
- **Se carga sola** en las pestañas ya abiertas (no hace falta F5).
- **Confirmación única por módulo** antes de una acción permanente.
- Interfaces en **español o inglés**.

## Instalación

1. Clona el repositorio:
   ```bash
   git clone https://github.com/jhonierp/social-cleanup-toolkit.git
   ```
2. Abre la página de extensiones: `opera://extensions`, `chrome://extensions` o `edge://extensions`.
3. Activa el **Modo de desarrollador**.
4. Pulsa **Cargar extensión sin empaquetar** y selecciona la carpeta del proyecto (la que contiene `manifest.json`).
5. Fija el ícono en la barra de extensiones.

## Uso

### Messenger / WhatsApp
1. Abre `facebook.com/messages` o `web.whatsapp.com` (con sesión iniciada).
2. Clic en el ícono → elige el módulo → elige **Eliminar** o **Archivar**.
3. Pulsa **Iniciar**. Procesa el primer chat de la lista, espera 1,5 s y sigue.

### TikTok — quitar compartidos
1. Abre `tiktok.com` y entra a **tu perfil** (si no estás en la pestaña **Publicaciones compartidas**, la abre sola).
2. Clic en el ícono → módulo **TikTok** → **Iniciar**.
3. Abre el primer video compartido, pulsa la etiqueta **"Lo compartiste"** (eso lo quita) y pasa al siguiente con la flecha **⌄**. Ignora siempre tus propios videos.
4. Termina cuando ya no hay más videos o tras 5 seguidos sin "Lo compartiste".

Pulsa **Detener** cuando quieras. Se detiene sola cuando no quedan elementos o tras 8 fallos seguidos.

Recomendación: la primera vez prueba con 2 o 3 elementos (en Messenger/WhatsApp, mejor con **Archivar**) para comprobar que funciona con tu versión del sitio.

## Estructura

```
social-cleanup-toolkit/
├── manifest.json          # Manifest V3
├── background.js          # Service worker: inyecta los scripts en pestañas ya abiertas
├── modulos.js             # Lista de módulos (id, URL, scripts) compartida por popup y background
├── content.js             # Núcleo: panel flotante, ciclo, contadores, mensajes con el popup
├── adapters/
│   ├── helpers.js         # Utilidades comunes (esperas, hover, clic derecho, búsqueda por texto)
│   ├── messenger.js       # Módulo Messenger
│   ├── whatsapp.js        # Módulo WhatsApp Web
│   └── tiktok.js          # Módulo TikTok
├── popup.html / popup.js  # Menú del ícono: interruptor, selector de módulo, modos y contadores
└── icon*.png
```

## Arquitectura

Cada sitio carga `helpers.js` + **su adaptador** + `content.js`. El adaptador se registra en `globalThis.SCT_ADAPTERS` con esta forma:

```js
SCT_ADAPTERS.miSitio = {
  id: 'miSitio',
  nombre: 'Mi sitio',
  url: 'https://...',            // a dónde lleva el botón "Abrir"
  dominio: () => boolean,        // ¿esta pestaña es de este sitio?
  enPagina: () => boolean,       // ¿estamos en la página donde se puede trabajar?
  ayuda: 'Texto si no está en la página correcta',
  modos: {
    eliminar: { etiqueta: 'Eliminar', contador: 'eliminados', color: '#e41e3f', permanente: true },
  },
  async procesarUno(modo) {
    // procesa UN elemento y devuelve:
    // 'ok' | 'scroll' | 'sin_items' | 'saltado:<nombre>' | '<código de error>'
  },
};
```

`content.js` se encarga del resto (panel, ciclo, pausas, contadores, confirmación, popup).

### Agregar un módulo nuevo
1. Crea `adapters/<sitio>.js` con la forma de arriba.
2. Agrégalo en `modulos.js`.
3. Agrega su entrada en `content_scripts` y `host_permissions` de `manifest.json`.

## Ajustes

Al inicio de `content.js`: `PAUSA_MS` (pausa entre elementos, 1500 ms), `MAX_FALLOS` (8) y `MAX_SCROLLS` (15).
Los textos que busca cada sitio están como expresiones regulares (`RE_...`) al inicio de cada adaptador.

## Solución de problemas

| Mensaje | Causa probable | Qué hacer |
|---|---|---|
| `sin_boton` | No aparece el botón **…** del chat | El sitio cambió: abre la consola (`Ctrl+Shift+J`), busca líneas `[Social Cleanup]` y ajusta las `RE_...` del adaptador. |
| `Salté "..."` | Ese elemento no tiene la opción | Normal (Marketplace, grupos de WhatsApp, videos sin republicación). |
| `sin_confirmacion` | No encontró el botón del diálogo | Ajusta `RE_CONFIRMAR`. |
| `sin_video` (TikTok) | No se abrió el visor del video | Sube `PAUSA_MS` o revisa la consola. |
| No aparece el panel | Extensión apagada o página incorrecta | Enciéndela y entra a la página indicada en el popup. |

Después de editar el código, pulsa **recargar** en la tarjeta de la extensión.

## Limitaciones

- Depende de la estructura actual de cada sitio, que cambia con frecuencia; puede requerir ajustar los textos que busca.
- Eliminar un chat solo lo borra **de tu cuenta**; la otra persona conserva su copia.
- En WhatsApp, los grupos no se pueden eliminar sin salir primero: se saltan.
- Los contadores se reinician al recargar la página.
- Automatizar acciones puede ir en contra de las condiciones de uso de estos sitios. Úsala bajo tu responsabilidad y con tus propias cuentas.

## Permisos

| Permiso | Uso |
|---|---|
| `storage` | Guardar encendido/apagado, módulo y modo elegidos, y la confirmación única. |
| `scripting` | Cargar los scripts en pestañas ya abiertas sin recargar. |
| `host_permissions` | Funcionar solo en facebook.com, messenger.com, web.whatsapp.com y tiktok.com. |

La extensión no envía datos a ningún servidor: todo ocurre en tu navegador.

## Changelog

- **2.1.0** — TikTok: usa la etiqueta "Lo compartiste" y la flecha del visor; ya no se apaga al abrir un video ni entra a tus videos subidos.
- **2.0.0** — Arquitectura por módulos; nuevos módulos **WhatsApp Web** y **TikTok** (quitar compartidos); selector de módulo en el popup.
- **1.4.1** — Módulo Messenger: eliminar/archivar, contadores, saltar filas especiales, carga sin F5.
