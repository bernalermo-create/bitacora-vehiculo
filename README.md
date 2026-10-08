# Bitácora de vehículo

Bitácora de mantenimiento (varios vehículos, cuenta regresiva, recordatorios, gastos y fotos de facturas) en un solo archivo HTML. Los datos se guardan en el dispositivo y se sincronizan con **tu propia** hoja de Google Sheets.

## Activar la sincronización (una sola vez)

1. Crea una hoja de Google nueva ("Bitácora Vehículo").
2. **Extensiones → Apps Script**, pega todo `apps-script/Code.gs` y cambia `CLAVE` por una clave larga.
3. **Implementar → Nueva implementación → Aplicación web** — Ejecutar como *Yo*, acceso *Cualquier usuario*. Autoriza Sheets y Drive y copia la URL `/exec`.
4. En la app, botón ☁ → pega la URL y la clave.
5. En otro dispositivo: ☁ → **Copiar enlace para otro dispositivo** y ábrelo allí.

Las pestañas `Vehiculos` y `Servicios` de la hoja son los datos reales; puedes mirarlas o corregir algo a mano.

Tus datos nunca están en este repositorio: viven en tu navegador y en tu hoja.
