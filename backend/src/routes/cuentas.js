const express = require("express");
const rateLimit = require("express-rate-limit").default;

const usuarios = require("../lib/usuarios");
const { crearToken, requiereSesion, sesionValida, requiereAdministrador } = require("../lib/sesion");

// Frena a quien intenta adivinar claves: 8 intentos fallidos por IP cada 15 minutos.
const limiteIngreso = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos fallidos. Espera 15 minutos y vuelve a intentar." },
});

// Responde el error de validación (correo repetido, clave corta, etc.) como 400.
function conErrores(fn) {
  return (req, res) => {
    try {
      fn(req, res);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  };
}

const sesion = express.Router();

sesion.post("/login", limiteIngreso, (req, res) => {
  const { correo, clave } = req.body || {};
  const usuario = usuarios.verificarCredenciales(correo, clave);
  if (!usuario) return res.status(401).json({ error: "Correo o clave incorrectos." });
  res.json({ token: crearToken(usuario), usuario: usuarios.publico(usuario) });
});

sesion.get("/yo", sesionValida, (req, res) => {
  res.json({ usuario: usuarios.publico(req.usuario) });
});

sesion.post(
  "/cambiar-clave",
  sesionValida,
  conErrores((req, res) => {
    const { claveActual, claveNueva } = req.body || {};
    const usuario = usuarios.cambiarClavePropia(req.usuario.id, claveActual, claveNueva);
    // La clave nueva invalida el token anterior: se entrega uno nuevo.
    res.json({ token: crearToken(usuarios.buscarPorId(usuario.id)), usuario });
  })
);

const admin = express.Router();
admin.use(requiereSesion, requiereAdministrador);

admin.get("/usuarios", (req, res) => {
  res.json({ usuarios: usuarios.listar(), perfiles: usuarios.PERFILES, largoMinimoClave: usuarios.LARGO_MINIMO_CLAVE });
});

admin.post(
  "/usuarios",
  conErrores((req, res) => {
    const { nombre, correo, perfil, clave } = req.body || {};
    res.status(201).json({ usuario: usuarios.crear({ nombre, correo, perfil, clave }) });
  })
);

admin.patch(
  "/usuarios/:id",
  conErrores((req, res) => {
    const { nombre, perfil, activo, clave } = req.body || {};
    // La clave que asigna un administrador es temporal: se cambia al entrar.
    res.json({ usuario: usuarios.actualizar(req.params.id, { nombre, perfil, activo, clave, debeCambiarClave: true }) });
  })
);

admin.delete(
  "/usuarios/:id",
  conErrores((req, res) => {
    if (req.params.id === req.usuario.id) return res.status(400).json({ error: "No puedes eliminar tu propia cuenta." });
    usuarios.eliminar(req.params.id);
    res.json({ ok: true });
  })
);

module.exports = { sesion, admin };
