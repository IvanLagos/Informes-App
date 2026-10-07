# Informes App (Fernández Fica)

Aplicación web para generar informes técnicos (Word y PDF) a partir de la
foto del Pedido de Trabajo. Primero se elige el **cliente** y luego el **tipo
de informe** de ese cliente; los campos y las fotos que se piden dependen de
esa elección.

| Cliente | Tipos de informe |
| --- | --- |
| Cencosud | Próximamente |
| Hospital Gustavo Fricke | Mantenimiento preventivo UPS |

Los clientes están en `backend/src/tipos/index.js` (`CLIENTES`); cada tipo de
informe es un archivo en esa carpeta con `CLIENTE` = id del cliente.

## Uso

Doble clic en **`iniciar.bat`**. Se abren dos ventanas (backend y frontend) y
el navegador en `http://localhost:5174`. Para cerrar, cierra esas dos ventanas.

Pasos del asistente:

1. **Cliente y tipo de informe**.
2. **Hoja de trabajo**: se sube la foto del PT y la IA lee los datos. Esa
   misma foto queda como «Hoja de trabajo» en el registro fotográfico.
3. **Datos**: revisar/corregir. Lo que no está en la hoja queda en blanco.
4. **Fotos**: 4 fotos del trabajo con su título (la hoja de trabajo ya viene
   del paso 2).
5. **Revisar y descargar**: vista previa obligatoria; luego Word, PDF o ambos.

Ver también `Instructivo de uso - Informes App.docx`.

## Reglas del informe Fricke

- Atención: siempre **Eduardo Leiva**.
- N° de módulo **1**, bypass de mantenimiento **Si**, tarjeta SNMP **Si**.
- Prueba de autonomía realizada con resultado correcto; rutina completa.
- Recomendación por defecto: mantener limpieza y orden en sala.
- Ubicación = campo **DIRECC.** + ciudad de la hoja.
- Configuración = cantidad de voltajes de **V. ENTRADA** – cantidad de
  voltajes de **V. SALIDA** (ej. 3 y 3 → `3-3`).
- Baterías: modelo, cantidad y año del DETALLE (sin marca ni capacidad).
- Data de la UPS: en blanco si no viene escrita en la hoja.

## Configuración inicial (una sola vez)

1. Copiar `backend/.env.example` como `backend/.env` y poner la clave de la
   API de Anthropic (`ANTHROPIC_API_KEY=...`) y `PORT=8001`.
2. Instalar dependencias:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

## Publicar en Render

El archivo `render.yaml` ya trae la configuración (un solo servicio: el
backend entrega también la página). Corre con Docker (ver `Dockerfile`)
para tener LibreOffice, que convierte el informe a PDF. En Windows sin
LibreOffice, la conversión local usa el Word instalado.

1. En render.com: **New → Blueprint** y elegir este repositorio.
2. Completar las variables que pide:
   - `ANTHROPIC_API_KEY`: la clave de la API de Anthropic.
   - `APP_PASSWORD`: la contraseña para entrar a la página.
3. Al abrir la dirección que entrega Render, el navegador pide usuario
   (`ffica`) y contraseña (`APP_PASSWORD`).

Cada vez que se sube un cambio a `main`, Render vuelve a publicar la app.
En el plan gratuito el servicio se duerme sin uso y la primera visita
tarda ~1 minuto en cargar.

## Estructura

- `backend/src/tipos/` — un archivo por tipo de informe (campos, fotos,
  valores por defecto, instrucciones para la IA y armado del Word). Para
  agregar un tipo nuevo, crea su archivo y súmalo en `tipos/index.js`.
- `backend/plantillas/` — plantillas Word con los `{{CAMPOS}}` a reemplazar.
- `backend/scripts/crear_plantilla_fricke.py` — regenera la plantilla de
  Fricke desde el informe original si este cambia.
- `frontend/` — interfaz React/Vite.

## Costo

Cada lectura de hoja hace una llamada a la API de Anthropic (modelo
`claude-opus-5-5`), del orden de unos pocos centavos de dólar por informe.
