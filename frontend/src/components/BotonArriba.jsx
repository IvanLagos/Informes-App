import { useEffect, useState } from "react";

// Botón flotante para volver al inicio de la página; aparece al bajar.
export default function BotonArriba() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const revisar = () => setVisible(window.scrollY > 300);
    revisar();
    window.addEventListener("scroll", revisar, { passive: true });
    return () => window.removeEventListener("scroll", revisar);
  }, []);

  if (!visible) return null;
  return (
    <button
      type="button"
      className="boton-arriba"
      aria-label="Volver arriba"
      title="Volver arriba"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      ↑
    </button>
  );
}
