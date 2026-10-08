import { useEffect, useState } from "react";

/**
 * Indicador de "trabajando": círculo que gira, barra animada, el mensaje de
 * la etapa en curso y los segundos transcurridos. Las etapas avanzan con el
 * tiempo (`desde` = segundo en que empieza cada una) y la última se queda
 * hasta que termina el proceso. No muestra porcentaje porque no se sabe
 * cuánto falta de verdad.
 */
export default function Cargando({ titulo, etapas = [] }) {
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    const inicio = Date.now();
    const id = setInterval(() => setSegundos(Math.floor((Date.now() - inicio) / 1000)), 250);
    return () => clearInterval(id);
  }, []);

  const etapa = [...etapas].reverse().find((e) => segundos >= e.desde);

  return (
    <div className="cargando-caja" role="status" aria-live="polite">
      <div className="cargando-fila">
        <span className="cargando-circulo" aria-hidden="true" />
        <div className="cargando-textos">
          <strong>{titulo}</strong>
          {etapa && <span>{etapa.texto}</span>}
        </div>
        <span className="cargando-tiempo">{segundos} s</span>
      </div>
      <div className="cargando-barra" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}

// Etapas de cada proceso (los tiempos son aproximados).
export const ETAPAS_LECTURA = [
  { desde: 0, texto: "Subiendo la foto de la hoja de trabajo…" },
  { desde: 2, texto: "La IA está leyendo la hoja…" },
  { desde: 8, texto: "Revisando campos escritos a mano…" },
  { desde: 14, texto: "Ordenando los datos para el formulario…" },
  { desde: 25, texto: "Está tardando un poco más de lo normal, ya casi…" },
];

export const ETAPAS_VISTA_PREVIA = [
  { desde: 0, texto: "Armando el informe con los datos y las fotos…" },
  { desde: 3, texto: "Convirtiendo el informe a PDF…" },
  { desde: 10, texto: "Preparando la vista previa…" },
  { desde: 25, texto: "Está tardando un poco más de lo normal, ya casi…" },
];

export const ETAPAS_DESCARGA = [
  { desde: 0, texto: "Preparando el archivo…" },
  { desde: 4, texto: "Generando el documento…" },
];
