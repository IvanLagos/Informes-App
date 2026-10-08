/**
 * Sesiones con token firmado (JWT), válido 12 horas. En cada solicitud se
 * vuelve a revisar la cuenta: si la desactivaron, la borraron o le cambiaron
 * la clave, el token deja de servir de inmediato.
 */
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const usuarios = require("./usuarios");

// En Render JWT_SECRET viene del panel. En local, si no está, se inventa una
// al arrancar (las sesiones se pierden al reiniciar, lo que da igual en local).
const SECRETO = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
const DURACION = "12h";

function crearToken(usuario) {
  return jwt.sign({ sub: usuario.id, v: usuario.versionSesion || 0 }, SECRETO, { expiresIn: DURACION });
}

/** Exige sesión válida; deja la cuenta en req.usuario. */
function requiereSesion(req, res, next) {
  const [tipo, token] = (req.headers.authorization || "").split(" ");
  if (tipo !== "Bearer" || !token) return res.status(401).json({ error: "Debes iniciar sesión." });
  try {
    const datos = jwt.verify(token, SECRETO);
    const usuario = usuarios.buscarPorId(datos.sub);
    if (!usuario || !usuario.activo || (usuario.versionSesion || 0) !== datos.v) {
      return res.status(401).json({ error: "Tu sesión ya no es válida. Inicia sesión de nuevo." });
    }
    req.usuario = usuario;
    next();
  } catch {
    res.status(401).json({ error: "Tu sesión expiró. Inicia sesión de nuevo." });
  }
}

function requiereAdministrador(req, res, next) {
  if (req.usuario?.perfil !== "administrador") {
    return res.status(403).json({ error: "Solo un administrador puede hacer esto." });
  }
  next();
}

module.exports = { crearToken, requiereSesion, requiereAdministrador };
