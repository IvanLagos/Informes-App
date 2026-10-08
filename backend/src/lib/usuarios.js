/**
 * Cuentas de acceso: se guardan en DATA_DIR/usuarios.json (en Render,
 * DATA_DIR es el disco permanente; si no, el archivo se perdería en cada
 * reinicio). Las claves se guardan cifradas con bcrypt, nunca en texto plano.
 *
 * Perfiles: "tecnico" (genera informes) y "administrador" (además administra
 * las cuentas). Si no hay ninguna cuenta, se crea el administrador inicial
 * con ADMIN_EMAIL / ADMIN_PASSWORD.
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "..", "..", "datos");
const ARCHIVO = path.join(DATA_DIR, "usuarios.json");

const PERFILES = [
  { id: "tecnico", etiqueta: "Técnico" },
  { id: "administrador", etiqueta: "Administrador" },
];
const LARGO_MINIMO_CLAVE = 8;

let cache = null;

function leer() {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(ARCHIVO, "utf8"));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
    cache = [];
  }
  return cache;
}

// Escribe en un temporal y lo renombra: si el proceso se corta a medio
// camino, el archivo anterior queda intacto.
function guardar(usuarios) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const temporal = `${ARCHIVO}.tmp`;
  fs.writeFileSync(temporal, JSON.stringify(usuarios, null, 2));
  fs.renameSync(temporal, ARCHIVO);
  cache = usuarios;
}

const normalizarCorreo = (correo) => String(correo || "").trim().toLowerCase();

/** Lo que se puede mostrar de una cuenta (sin la clave). */
function publico(u) {
  const { hash, ...resto } = u;
  return resto;
}

function validarClave(clave) {
  if (String(clave || "").length < LARGO_MINIMO_CLAVE) {
    throw new Error(`La clave debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres.`);
  }
}

function validarPerfil(perfil) {
  if (!PERFILES.some((p) => p.id === perfil)) throw new Error("Perfil no válido.");
}

function inicializar() {
  const usuarios = leer();
  if (usuarios.length > 0) return;
  const correo = normalizarCorreo(process.env.ADMIN_EMAIL);
  const clave = process.env.ADMIN_PASSWORD;
  if (!correo || !clave) {
    console.warn("No hay cuentas: define ADMIN_EMAIL y ADMIN_PASSWORD para crear el administrador inicial.");
    return;
  }
  crear({ nombre: process.env.ADMIN_NOMBRE || "Administrador", correo, perfil: "administrador", clave });
  console.log(`Cuenta de administrador inicial creada: ${correo}`);
}

function listar() {
  return leer().map(publico);
}

function buscarPorId(id) {
  return leer().find((u) => u.id === id) || null;
}

function crear({ nombre, correo, perfil, clave }) {
  const usuarios = leer();
  correo = normalizarCorreo(correo);
  nombre = String(nombre || "").trim();
  if (!nombre) throw new Error("Falta el nombre.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new Error("Correo no válido.");
  if (usuarios.some((u) => u.correo === correo)) throw new Error("Ya existe una cuenta con ese correo.");
  validarPerfil(perfil);
  validarClave(clave);
  const usuario = {
    id: crypto.randomUUID(),
    nombre,
    correo,
    perfil,
    activo: true,
    hash: bcrypt.hashSync(clave, 12),
    creado: new Date().toISOString(),
    ultimoIngreso: null,
  };
  guardar([...usuarios, usuario]);
  return publico(usuario);
}

function actualizar(id, cambios) {
  const usuarios = leer();
  const actual = usuarios.find((u) => u.id === id);
  if (!actual) throw new Error("La cuenta no existe.");
  const nuevo = { ...actual };
  if (cambios.nombre !== undefined) {
    nuevo.nombre = String(cambios.nombre).trim();
    if (!nuevo.nombre) throw new Error("Falta el nombre.");
  }
  if (cambios.perfil !== undefined) {
    validarPerfil(cambios.perfil);
    nuevo.perfil = cambios.perfil;
  }
  if (cambios.activo !== undefined) nuevo.activo = Boolean(cambios.activo);
  if (cambios.clave) {
    validarClave(cambios.clave);
    nuevo.hash = bcrypt.hashSync(cambios.clave, 12);
    // Cambiar la clave invalida las sesiones abiertas con la clave anterior.
    nuevo.versionSesion = (actual.versionSesion || 0) + 1;
  }
  // Siempre debe quedar al menos un administrador activo.
  const quedanAdmins = usuarios.some((u) =>
    u.id === id ? nuevo.perfil === "administrador" && nuevo.activo : u.perfil === "administrador" && u.activo
  );
  if (!quedanAdmins) throw new Error("Debe quedar al menos un administrador activo.");
  guardar(usuarios.map((u) => (u.id === id ? nuevo : u)));
  return publico(nuevo);
}

function eliminar(id) {
  const usuarios = leer();
  const restantes = usuarios.filter((u) => u.id !== id);
  if (restantes.length === usuarios.length) throw new Error("La cuenta no existe.");
  if (!restantes.some((u) => u.perfil === "administrador" && u.activo)) {
    throw new Error("Debe quedar al menos un administrador activo.");
  }
  guardar(restantes);
}

// Hash fijo para comparar aunque el correo no exista: así la respuesta tarda
// lo mismo y no delata qué correos tienen cuenta.
const HASH_FICTICIO = bcrypt.hashSync("clave-que-no-existe", 12);

/** Devuelve la cuenta si el correo y la clave son correctos y está activa. */
function verificarCredenciales(correo, clave) {
  const usuario = leer().find((u) => u.correo === normalizarCorreo(correo));
  const correcta = bcrypt.compareSync(String(clave || ""), usuario ? usuario.hash : HASH_FICTICIO);
  if (!usuario || !correcta || !usuario.activo) return null;
  guardar(leer().map((u) => (u.id === usuario.id ? { ...u, ultimoIngreso: new Date().toISOString() } : u)));
  return buscarPorId(usuario.id);
}

function verificarClaveActual(id, clave) {
  const usuario = buscarPorId(id);
  return Boolean(usuario && bcrypt.compareSync(String(clave || ""), usuario.hash));
}

module.exports = {
  PERFILES,
  LARGO_MINIMO_CLAVE,
  inicializar,
  listar,
  buscarPorId,
  crear,
  actualizar,
  eliminar,
  verificarCredenciales,
  verificarClaveActual,
  publico,
};
