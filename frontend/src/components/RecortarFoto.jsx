import { useCallback, useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";

const ETAPAS = { SELECCION: "seleccion", ROTAR: "rotar", RECORTAR: "recortar", LISTO: "listo" };

// Alto del área de recorte: el ancho se calcula a partir del aspecto de cada
// foto para que el recuadro tenga la misma forma que la foto (evita dejar
// franjas negras a los costados cuando la foto es vertical).
const ALTO_AREA_RECORTE = 780;

function cargarImagen(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function dibujarRotado(canvas, img, anguloGrados) {
  const rad = (anguloGrados * Math.PI) / 180;
  const intercambiado = anguloGrados % 180 !== 0;
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  canvas.width = intercambiado ? h : w;
  canvas.height = intercambiado ? w : h;
  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(img, -w / 2, -h / 2);
  ctx.restore();
}

async function recortarComoBlob(imagenUrl, pixelCrop) {
  const img = await cargarImagen(imagenUrl);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(pixelCrop.width);
  canvas.height = Math.round(pixelCrop.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(
    img,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
}

function VistaRotada({ img, angulo }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) dibujarRotado(ref.current, img, angulo);
  }, [img, angulo]);
  return <canvas ref={ref} className="rotar-canvas" />;
}

/**
 * Input de foto con recorte manual: si la foto viene "de lado" primero se
 * gira, y luego se muestra un recuadro de recorte fijado a `aspecto`
 * (ancho/alto) que el usuario puede mover y hacer zoom antes de confirmar.
 * El resultado final ya viene recortado a esa proporción exacta.
 */
export default function RecortarFoto({ label, aspecto, onListo, inicialListo = false, notaListo = "", falta = false }) {
  const [etapa, setEtapa] = useState(inicialListo ? ETAPAS.LISTO : ETAPAS.SELECCION);
  const [imgOriginal, setImgOriginal] = useState(null);
  const [angulo, setAngulo] = useState(0);
  const [urlParaRecortar, setUrlParaRecortar] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const pixelCropRef = useRef(null);

  function manejarArchivo(e) {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    cargarImagen(url).then((img) => {
      setImgOriginal(img);
      setAngulo(0);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      if (img.naturalWidth > img.naturalHeight) {
        setEtapa(ETAPAS.ROTAR);
      } else {
        setUrlParaRecortar(url);
        setEtapa(ETAPAS.RECORTAR);
      }
    });
  }

  function confirmarRotacion() {
    const canvas = document.createElement("canvas");
    dibujarRotado(canvas, imgOriginal, angulo);
    canvas.toBlob(
      (blob) => {
        setUrlParaRecortar(URL.createObjectURL(blob));
        setEtapa(ETAPAS.RECORTAR);
      },
      "image/jpeg",
      0.95
    );
  }

  const onCropComplete = useCallback((_areaPorcentaje, areaPixeles) => {
    pixelCropRef.current = areaPixeles;
  }, []);

  async function confirmarRecorte() {
    if (!pixelCropRef.current) return;
    const blob = await recortarComoBlob(urlParaRecortar, pixelCropRef.current);
    // Si la imagen aún no terminaba de cargar, el recorte sale vacío: no avanzar.
    if (!blob) return;
    onListo(blob);
    setEtapa(ETAPAS.LISTO);
  }

  function elegirOtraFoto() {
    setEtapa(ETAPAS.SELECCION);
    setImgOriginal(null);
    setUrlParaRecortar(null);
  }

  const expandido = etapa === ETAPAS.ROTAR || etapa === ETAPAS.RECORTAR;
  // En rojo solo mientras espera la foto (al girar o recortar se ve el editor normal).
  const marcarFalta = falta && etapa === ETAPAS.SELECCION;

  return (
    <div
      className={`recortar-foto${expandido ? " recortar-foto--expandido" : ""}${marcarFalta ? " recortar-foto--falta" : ""}`}
    >
      <label>{label}</label>

      {etapa === ETAPAS.SELECCION && <input type="file" accept="image/*" onChange={manejarArchivo} />}
      {marcarFalta && <p className="recortar-falta">Falta subir esta foto.</p>}

      {etapa === ETAPAS.ROTAR && (
        <div className="rotar-preview">
          <VistaRotada img={imgOriginal} angulo={angulo} />
          <div className="rotar-botones">
            <button type="button" onClick={() => setAngulo((a) => (a - 90 + 360) % 360)}>
              Girar izquierda
            </button>
            <button type="button" onClick={() => setAngulo((a) => (a + 90) % 360)}>
              Girar derecha
            </button>
            <button type="button" className="principal" onClick={confirmarRotacion}>
              Continuar
            </button>
          </div>
        </div>
      )}

      {etapa === ETAPAS.RECORTAR && (
        <div className="recorte-editor">
          <div className="recorte-area" style={{ width: Math.round(ALTO_AREA_RECORTE * aspecto), height: ALTO_AREA_RECORTE }}>
            <Cropper
              image={urlParaRecortar}
              crop={crop}
              zoom={zoom}
              aspect={aspecto}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
          <div className="rotar-botones">
            <button type="button" onClick={elegirOtraFoto}>
              Elegir otra foto
            </button>
            <button type="button" className="principal" onClick={confirmarRecorte}>
              Confirmar recorte
            </button>
          </div>
        </div>
      )}

      {etapa === ETAPAS.LISTO && (
        <div className="rotar-botones">
          <p className="rotar-ok">Foto lista ✓{notaListo && <span className="rotar-nota"> {notaListo}</span>}</p>
          <button type="button" onClick={elegirOtraFoto}>
            Cambiar foto
          </button>
        </div>
      )}
    </div>
  );
}
