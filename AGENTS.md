# AGENTS.md — Bitácora Vehículo

Bitácora de mantenimiento de vehículos del usuario (Mazda 2 y otros): un único
archivo HTML autocontenido (`Bitacora-Vehiculo.html`) con cuenta regresiva en
vivo, recordatorios por fecha/kilometraje, gastos y 8 temas visuales (azul, esmeralda, amoled, claro, papel, bento, showroom, medianoche). Todo el
HTML, CSS y JS vive en ese archivo — sin build, sin framework, sin `package.json`.

## Arquitectura (desde 2026-10-08)

- **Frontend**: `index.html` (`Bitacora-Vehiculo.html` solo redirige a él; antes era al revés,
  PWABuilder/Play necesitan la app en la raíz). Publicado en GitHub Pages del repo `bernalermo-create/bitacora-vehiculo`.
- **Backend**: `apps-script/Code.gs`, Google Apps Script *container-bound* a una
  hoja de Google ("Bitácora Vehículo"). Pestañas `Vehiculos`, `Servicios`
  (fuente de verdad, legibles/editables a mano) y `Config` (rev, nextId…).
  Fotos de facturas en una carpeta de Drive (`Bitacora Vehiculo - facturas`);
  en la hoja solo va el ID del archivo.
- **Protocolo**: todas las llamadas son `POST` con `Content-Type: text/plain`
  (evita el preflight CORS que Apps Script no responde) y cuerpo JSON
  `{action, key, ...}`. Acciones: `get`, `save` (con `baseRev`), `photo_put`,
  `photo_get`, `photo_del`. Autenticación = `CLAVE` compartida (constante en
  `Code.gs`, nunca en el repo); la URL `/exec` + clave se guardan en
  `localStorage['bitacora-cloud']` de cada dispositivo (enlace `#cfg=` para
  copiarlos a otro dispositivo).
- **Sincronización**: local primero (`localStorage['bitacora-vehiculo-v1']`),
  luego push con control de revisión optimista. Cambios locales sin subir =
  `localStorage['bitacora-dirty']`. Si la nube avanzó mientras había cambios
  locales → hoja de conflicto (el usuario elige). Si no hay cambios locales,
  se adopta lo que haya en la hoja (así también se ven ediciones manuales).
- **Modelo v2**: `{vehicles[], records[{vehicleId, foto}], nextId, nextVid, rev}`.
  `migrate()` convierte el formato v1 (`{vehicle, records}`) automáticamente.
- Los datos reales del usuario viven en su navegador y en SU hoja de Google —
  **nunca en este repo** (el seed es genérico a propósito; el repo es público).

## Reglas

1. **Sin build ni dependencias nuevas.** Único recurso externo: Google Fonts.
2. **Todo en el único archivo HTML** (más `apps-script/Code.gs` para el backend).
3. **Cambios quirúrgicos**; colores solo vía variables CSS de tema.
4. **No hardcodees datos personales ni claves.** La URL /exec del usuario SÍ está fija en `DEFAULT_CLOUD_URL` (decisión del usuario 2026-10-08; el repo es público, por eso la clave debe ser larga y Code.gs frena intentos fallidos).
5b. PWA: `manifest.webmanifest`, `sw.js` (red primero, nunca cachea POST) e `icons/` son necesarios para instalar la app / generar el APK con PWABuilder. Sube `CACHE` en sw.js al cambiar el cascarón.
5. Si cambias `Code.gs`, el usuario debe redesplegar: Implementar → Administrar
   implementaciones → Editar → Nueva versión (la URL no cambia).
6. Haz copia en `versiones/` (ignorada por git) antes de cambios grandes.

## Cómo verificar cambios

No hay pruebas automatizadas. Probado el 2026-10-08 con un servidor Node que
ejecuta el `Code.gs` real contra una hoja/Drive simulados en memoria (escenarios:
migración v1→v2, nube vacía, dispositivo nuevo, conflicto, sin conexión, clave
mala, edición manual en la hoja, fotos, varios vehículos, borrado). Para repetir:
levanta un servidor que sirva el HTML y simule `POST /exec`, apunta
`localStorage['bitacora-cloud']` a él y revisa la consola (sin errores).
Además: alternar los 4 temas y abrir un `.ics` exportado.

## Tema "Papel" (2026-10-08)
Inspirado en DESIGN.md (estilo cartel crema + azul, plano, píldoras solo con contorno, serif en el título),
adaptado a app móvil: acento #0060E0 (algo más oscuro que #006eff para contraste ≥4.5 sobre crema), texto de
peso normal (no 300), rojo/verde/ámbar de estado conservados porque son funcionales, fuentes libres
(Inter + Cormorant Garamond) en lugar de las comerciales Editorial New / Founders Grotesk. No copiar marca ni
ilustraciones de "Drive Capital". Se define con `[data-theme="papel"]` (variables + bloque de overrides).

## Sin exportación .ics (2026-10-08)
El usuario quitó los botones ".ics" y "Recordatorios" (y antes el de Google Calendar): no los necesita.
Se eliminó todo el código de exportación a calendario. El campo `lastIcsSyncAt` sigue existiendo en el modelo
y en Code.gs solo por compatibilidad con datos ya guardados; no se usa. Si se quieren avisos de vencimiento
fuera de la app, la opción acordada es un disparador diario en Apps Script que envíe correo.

## Tema "Bento" (2026-10-08)
Inspirado en la guía de estilo "Bevel" de styles.refero.design (claro, tarjetas azul-niebla #EBF0F8, esquinas de 24px,
anillos de progreso, controles oscuros en píldora #1F2025, acento #415EEE). Solo inspiración visual: nombre propio
"Bento", sin marca ni imágenes de terceros. Los anillos de las 3 tarjetas de estado usan `.t-ring` (display:contents
en los demás temas, así no cambian). Estados: rojo/ámbar/verde con tonos oscurecidos para contraste de texto.

## Temas "Showroom" y "Medianoche" (2026-10-08)
Opcionales, elegidos de styles.refero.design como inspiración (estilos de Tesla y Linear; solo paleta/estructura,
nombres propios, sin marcas ni imágenes). Showroom: blanco/gris + un solo azul #3E6AE1, radios 4–6px, plano.
Medianoche: casi negro #08090A, bordes finos, un único acento lima #E4F222 (texto de botón oscuro), radios 8–12px.
Ambos viven en `[data-theme="..."]` con variables + overrides, igual que Papel y Bento.

## Pantalla de bienvenida (2026-10-08)
`openWelcomeSheet()`: 3 pasos + aviso "tus datos se guardan solo en este teléfono". Sale UNA vez (flag
`localStorage['bitacora-welcome']`) solo si la instalación es nueva (`state.pristine`) y no hay nube configurada;
nunca a quien ya tiene datos propios. Botones: Empezar / "Ya tengo nube: conectar" (abre la hoja de nube).
