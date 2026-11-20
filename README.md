# Social Cleanup Toolkit

Extensión multiuso para navegadores basados en Chromium (Opera, Chrome, Edge, Brave) con herramientas de limpieza para redes sociales.

**Módulo actual — Messenger:** elimina o archiva automáticamente tus chats, uno por uno, desde `facebook.com/messages` o `messenger.com`.

Facebook no ofrece una opción para borrar todos los chats de una vez; esta extensión automatiza los clics que harías a mano (menú **…** → **Eliminar chat** → **Confirmar**) mientras tú la vigilas.

> ⚠️ **Eliminar es permanente.** Los chats eliminados no se pueden recuperar. Si solo quieres limpiar la bandeja, usa el modo **Archivar**.

## Funciones (módulo Messenger)

- **Dos modos:** Eliminar (permanente) o Archivar (se puede deshacer desde *Chats archivados*).
- **Contadores** de chats eliminados y archivados en la sesión.
- **Interruptor de encendido/apagado** desde el ícono de la barra.
- **Panel flotante** en la esquina inferior izquierda de Messenger con las mismas opciones.
- **Iniciar / Detener** en cualquier momento.
- **Salta filas especiales** como *Marketplace*, *Chats archivados* o *Solicitudes de mensajes*, y cualquier chat cuyo menú no tenga la opción.
- **Se carga sola** en las pestañas de Facebook ya abiertas (no hace falta recargar con F5).
- **Confirmación única:** pide confirmar la primera vez que vas a eliminar y luego no vuelve a preguntar.
- Interfaz de Facebook en **español o inglés**.

## Instalación

1. Clona o descarga este repositorio.
   ```bash
   git clone https://github.com/jhonierp/social-cleanup-toolkit.git
   ```
2. Abre la página de extensiones de tu navegador:
   - Opera: `opera://extensions`
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. Activa el **Modo de desarrollador**.
4. Pulsa **Cargar extensión sin empaquetar** (*Load unpacked*) y selecciona la carpeta del proyecto (la que contiene `manifest.json`).
5. Fija el ícono rojo en la barra de extensiones para tenerlo a mano.

## Uso

1. Entra a <https://www.facebook.com/messages/t/> o <https://www.messenger.com>.
2. Haz clic en el ícono de la extensión (o usa el panel de abajo a la izquierda).
3. Elige el modo **Eliminar** o **Archivar**.
4. Pulsa **Iniciar**. La extensión procesa el primer chat de la lista, espera 1,5 s y sigue con el siguiente.
5. Pulsa **Detener** cuando quieras. Se detiene sola cuando no quedan chats o tras 8 fallos seguidos.

Recomendación: la primera vez, prueba con **Archivar** en 2 o 3 chats para comprobar que funciona con tu versión de Facebook.

## Estructura

```
social-cleanup-toolkit/
├── manifest.json    # Manifest V3: permisos, popup, content script y service worker
├── background.js    # Inyecta el script en pestañas de Facebook abiertas al instalar/actualizar
├── content.js       # Lógica principal: panel flotante, búsqueda de botones y ciclo de borrado/archivado
├── popup.html       # Menú del ícono de la barra
├── popup.js         # Interruptor, modo, contadores e Iniciar/Detener desde el popup
└── icon*.png        # Íconos 16, 32, 48 y 128 px
```

## Cómo funciona

`content.js` recorre la lista de chats (`[role="grid"] [role="row"]`) y, para cada fila:

1. Simula el paso del mouse para que Facebook muestre el botón **…** (*Más opciones*).
2. Abre el menú y busca la opción **Eliminar chat** / **Archivar chat** por su texto.
3. En modo eliminar, pulsa el botón de confirmación del diálogo.
4. Espera a que la fila desaparezca y pasa a la siguiente.

El panel se construye con `document.createElement` (sin `innerHTML`), porque Facebook aplica *Trusted Types* y bloquea `innerHTML` incluso en extensiones.

### Ajustes

Al inicio de `content.js` puedes cambiar:

| Constante | Valor por defecto | Para qué sirve |
|---|---|---|
| `PAUSA_MS` | `1500` | Pausa entre chats (ms). Súbela si Facebook va lento. |
| `MAX_FALLOS` | `8` | Fallos seguidos antes de detenerse. |
| `RE_MAS_OPCIONES` | — | Textos del botón **…** |
| `RE_OPCION` | — | Textos de *Eliminar chat* / *Archivar chat* |
| `RE_CONFIRMAR` | — | Texto del botón de confirmación |
| `RE_SALTAR` | — | Filas que se saltan siempre (Marketplace, etc.) |

## Solución de problemas

| Mensaje en el panel | Causa probable | Qué hacer |
|---|---|---|
| `sin_boton` | No aparece el botón **…** al pasar el mouse | Facebook cambió la página: revisa la consola (`Ctrl+Shift+J`), busca líneas `[Social Cleanup]` y ajusta `RE_MAS_OPCIONES`. |
| `Salté "..."` | Ese chat no tiene la opción en su menú | Normal (por ejemplo, Marketplace). |
| `sin_confirmacion` | No encontró el botón del diálogo | Ajusta `RE_CONFIRMAR`. |
| No aparece el panel | La extensión está apagada o la pestaña no es de mensajes | Enciéndela desde el ícono y entra a `facebook.com/messages`. |

Después de editar el código, pulsa **recargar** en la tarjeta de la extensión en `opera://extensions`.

## Limitaciones

- Depende de la estructura actual de la web de Facebook, que cambia con frecuencia; puede requerir ajustar los textos que busca.
- Al eliminar un chat solo se borra **de tu cuenta**; la otra persona conserva su copia.
- Los contadores se reinician al recargar la página.
- Automatizar acciones en Facebook puede ir en contra de sus condiciones de uso. Úsala bajo tu responsabilidad y con tu propia cuenta.

## Permisos

| Permiso | Uso |
|---|---|
| `storage` | Guardar encendido/apagado, modo y la confirmación única. |
| `scripting` | Cargar el script en pestañas ya abiertas sin recargar. |
| `host_permissions` (`facebook.com`, `messenger.com`) | Funcionar solo en esos sitios. |

La extensión no envía datos a ningún servidor: todo ocurre en tu navegador.

## Hoja de ruta

- [x] Messenger: eliminar y archivar chats en lote
- [ ] Más módulos (otras redes y bandejas de mensajes)

## Versión

**1.4.1**
