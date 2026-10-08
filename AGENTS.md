# AGENTS.md — Bitácora Vehículo

Bitácora de mantenimiento de vehículos del usuario (Mazda 2 y otros): un único
archivo HTML autocontenido (`Bitacora-Vehiculo.html`) con cuenta regresiva en
vivo, recordatorios por fecha/kilometraje, gastos y 4 temas visuales. Todo el
HTML, CSS y JS vive en ese archivo — sin build, sin framework, sin `package.json`.

## Arquitectura (desde 2026-10-08)

- **Frontend**: `Bitacora-Vehiculo.html` (`index.html` solo redirige a él para
  GitHub Pages). Publicado en GitHub Pages del repo `bernalermo-create/bitacora-vehiculo`.
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
4. **No hardcodees datos personales, claves ni la URL /exec** en el repo.
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
