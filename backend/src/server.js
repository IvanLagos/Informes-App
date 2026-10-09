const fs = require("fs");
const path = require("path");
// backend/.env, sin importar desde qué carpeta se arranque (en Render las
// variables vienen del panel y este archivo no existe).
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const express = require("express");
const cors = require("cors");
const informeRoutes = require("./routes/informe");
const cuentas = require("./routes/cuentas");
const usuarios = require("./lib/usuarios");
const { requiereSesion } = require("./lib/sesion");

usuarios.inicializar();

const app = express();
// Detrás del proxy de Render (y de Cloudflare): confiar en el primer salto
// para leer bien la IP del visitante (la usa el límite de intentos de ingreso).
app.set("trust proxy", 1);
// exposedHeaders: para que el navegador pueda leer el nombre del archivo generado.
app.use(cors({ exposedHeaders: ["Content-Disposition"] }));
app.use(express.json());

// Libre de contraseña para que Render pueda revisar que el servicio está vivo.
// cuentasPersistentes: si las cuentas sobreviven a un reinicio (disco permanente).
app.get("/api/health", (req, res) => res.json({ ok: true, cuentasPersistentes: usuarios.DISCO_PERMANENTE }));

// Ingreso con cuenta propia de cada técnico. La página se entrega libre (es
// la pantalla de ingreso); todo lo que genera informes exige sesión.
app.use("/api/sesion", cuentas.sesion);
app.use("/api/admin", cuentas.admin);
app.use("/api", requiereSesion, informeRoutes);

// En producción el backend también entrega la página (frontend ya compilado).
const DIST = path.join(__dirname, "..", "..", "frontend", "dist");
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) return next();
    res.sendFile(path.join(DIST, "index.html"));
  });
}

const PORT = process.env.PORT || 8001;
app.listen(PORT, () => {
  console.log(`Backend escuchando en http://localhost:${PORT}`);
});
