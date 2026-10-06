const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
// backend/.env, sin importar desde qué carpeta se arranque (en Render las
// variables vienen del panel y este archivo no existe).
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const express = require("express");
const cors = require("cors");
const informeRoutes = require("./routes/informe");

const app = express();
// exposedHeaders: para que el navegador pueda leer el nombre del archivo generado.
app.use(cors({ exposedHeaders: ["Content-Disposition"] }));
app.use(express.json());

// Libre de contraseña para que Render pueda revisar que el servicio está vivo.
app.get("/api/health", (req, res) => res.json({ ok: true }));

function iguales(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

// Si APP_PASSWORD está definida (en Render), toda la app pide usuario y
// contraseña con la ventana de acceso del navegador. En local no se define.
const APP_PASSWORD = process.env.APP_PASSWORD;
const APP_USUARIO = process.env.APP_USUARIO || "ffica";
if (APP_PASSWORD) {
  app.use((req, res, next) => {
    const [tipo, credenciales] = (req.headers.authorization || "").split(" ");
    if (tipo === "Basic" && credenciales) {
      const texto = Buffer.from(credenciales, "base64").toString();
      const separador = texto.indexOf(":");
      const usuario = texto.slice(0, separador);
      const clave = texto.slice(separador + 1);
      if (iguales(usuario, APP_USUARIO) && iguales(clave, APP_PASSWORD)) return next();
    }
    res.setHeader("WWW-Authenticate", 'Basic realm="Informes App", charset="UTF-8"');
    res.status(401).send("Acceso restringido.");
  });
}

app.use("/api", informeRoutes);

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
