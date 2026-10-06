const sharp = require("sharp");
const Anthropic = require("@anthropic-ai/sdk");

const MODELO_CLAUDE = "claude-opus-5-5";

async function imagenABase64(buffer) {
  const redimensionada = await sharp(buffer)
    .rotate()
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
  return redimensionada.toString("base64");
}

/** Envía la foto de la hoja de trabajo a Claude con `prompt` y devuelve el JSON que responde. */
async function leerHojaTrabajo(buffer, prompt) {
  const client = new Anthropic(); // usa ANTHROPIC_API_KEY del entorno
  const imgB64 = await imagenABase64(buffer);

  const resp = await client.beta.messages.create({
    model: MODELO_CLAUDE,
    max_tokens: 16000,
    output_config: { effort: "high" },
    // Si el modelo declina la solicitud, la API la reintenta con otro modelo.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imgB64 } },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  if (resp.stop_reason === "refusal") {
    throw new Error("La IA no pudo procesar la imagen. Intenta con otra foto de la hoja de trabajo.");
  }

  const texto = resp.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  // Por si la respuesta trae texto alrededor del JSON.
  const inicio = texto.indexOf("{");
  const fin = texto.lastIndexOf("}");
  const candidato = inicio !== -1 && fin > inicio ? texto.slice(inicio, fin + 1) : texto;

  try {
    return JSON.parse(candidato);
  } catch (e) {
    const error = new Error(`No pude interpretar la respuesta de la IA como JSON. Respuesta recibida: ${texto}`);
    error.cause = e;
    throw error;
  }
}

module.exports = { MODELO_CLAUDE, leerHojaTrabajo };
