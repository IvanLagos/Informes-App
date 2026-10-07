"""
Ajuste único (07-10-2026) de la plantilla de Cencosud que se armó a mano en
Word a partir de la de Fricke:

- "Información cliente": los datos de ejemplo pasan a ser {{LOCAL}},
  {{DIRECCION_CLIENTE}} y {{ATENCION_CLIENTE}}.
- Índice: agrega "Información cliente" y la nueva sección de checklist.
- Agrega la sección "Registro de hoja check list de asistencia técnica" con 3
  fotos (una por página) antes de la firma.

Edita el archivo en su lugar; no correrlo dos veces (agregaría la sección de
nuevo). De aquí en adelante la plantilla se edita en Word.
"""
import re
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from crear_plantilla_fricke import RE_PARRAFO, RE_TEXTO, elementos_cuerpo, textos_de  # noqa: E402

PLANTILLA = Path(__file__).resolve().parent.parent / "plantillas" / "Cencosud_Mantencion Preventiva.docx"

TITULO_CHECKLIST = "Registro de hoja check list de asistencia técnica"
MARCADOR_CHECKLIST = "_TocChecklist"
MARCADOR_INFO_CLIENTE = "_Toc168562684"  # ya existe en el título "Información cliente"


def cambiar_linea_indice(p, numero=None, nombre=None, pagina=None, marcador=None):
    textos = [t for t in RE_TEXTO.finditer(p) if t.group(2).strip()]
    reemplazos = []
    if numero is not None:
        reemplazos.append((textos[0], str(numero)))
    if nombre is not None:
        reemplazos.append((textos[1], nombre))
    if pagina is not None:
        reemplazos.append((textos[-1], str(pagina)))
    for t, valor in sorted(reemplazos, key=lambda r: r[0].start(), reverse=True):
        p = p[: t.start(2)] + valor + p[t.end(2):]
    if marcador:
        p = re.sub(r"PAGEREF \S+", f"PAGEREF {marcador}", p)
    return re.sub(r' w14:(paraId|textId)="[^"]*"', "", p)


def numero_de(p):
    return int([t.group(2) for t in RE_TEXTO.finditer(p) if t.group(2).strip()][0])


def ajustar(doc):
    # 1. Datos de "Información cliente" -> marcadores.
    for ejemplo, token in (
        (": E524 Easy Linares", ": {{LOCAL}}"),
        (": Januario Espinoza 1183, Linares", ": {{DIRECCION_CLIENTE}}"),
        (": Leonardo Norambuena", ": {{ATENCION_CLIENTE}}"),
    ):
        if f">{ejemplo}<" not in doc:
            raise SystemExit(f"No encontré «{ejemplo}» en la plantilla (¿ya se ajustó?).")
        doc = doc.replace(f">{ejemplo}<", f">{token}<", 1)

    # 2. Sección de checklist: después de la foto de la hoja, antes de la firma.
    cuerpo_ini = doc.find("<w:body>") + len("<w:body>")
    elementos = elementos_cuerpo(doc[cuerpo_ini:])
    i_hoja = max(i for i, e in enumerate(elementos) if textos_de(e) == "Registro de hoja de trabajo")
    foto_hoja = next(e for e in elementos[i_hoja + 1 :] if "<w:drawing" in e)

    # Cada página del checklist parte en página nueva con "salto de página
    # antes" (un párrafo de salto aparte deja hojas en blanco si la foto llena
    # la página).
    def foto(n, pagina_nueva):
        f = re.sub(r' w14:(paraId|textId)="[^"]*"', "", foto_hoja)
        f = re.sub(r' wp14:(anchorId|editId)="[^"]*"', "", f)
        f = re.sub(r'<wp:docPr id="\d+" name="[^"]*"', f'<wp:docPr id="{3100 + n}" name="Checklist {n}"', f)
        f = re.sub(r'<pic:cNvPr id="\d+" name="[^"]*"', f'<pic:cNvPr id="{3100 + n}" name="Checklist {n}"', f)
        if pagina_nueva:
            f = f.replace("<w:pPr>", "<w:pPr><w:pageBreakBefore/>", 1) if "<w:pPr>" in f else re.sub(
                r"(<w:p\b[^>]*>)", r"\1<w:pPr><w:pageBreakBefore/></w:pPr>", f, count=1
            )
        return f

    titulo = (
        '<w:p><w:pPr><w:pStyle w:val="Ttulo1"/><w:pageBreakBefore/></w:pPr>'
        f'<w:bookmarkStart w:id="902" w:name="{MARCADOR_CHECKLIST}"/>'
        f"<w:r><w:t>{TITULO_CHECKLIST}</w:t></w:r>"
        '<w:bookmarkEnd w:id="902"/></w:p>'
    )
    seccion = titulo + foto(1, False) + foto(2, True) + foto(3, True)
    pos = doc.find(foto_hoja, cuerpo_ini) + len(foto_hoja)
    doc = doc[:pos] + seccion + doc[pos:]

    # 3. Índice: "Información cliente" tras Objetivo (las siguientes +1) y el
    #    checklist al final (3 páginas después de la hoja de trabajo).
    lineas = [m for m in RE_PARRAFO.finditer(doc) if "TDC1" in m.group(0) and "PAGEREF" in m.group(0)]
    objetivo, ultima = lineas[0], lineas[-1]
    pagina_hoja = int([t.group(2) for t in RE_TEXTO.finditer(ultima.group(0)) if t.group(2).strip()][-1])
    nueva_checklist = cambiar_linea_indice(
        ultima.group(0), numero_de(ultima.group(0)) + 2, TITULO_CHECKLIST, pagina_hoja + 1, MARCADOR_CHECKLIST
    )
    doc = doc[: ultima.end()] + nueva_checklist + doc[ultima.end():]
    # La línea nueva se copia de la 2ª (la 1ª trae además el inicio del campo
    # del índice, que no debe repetirse).
    base_info = lineas[1].group(0)
    for m in reversed(lineas[1:]):
        p = m.group(0)
        doc = doc[: m.start()] + cambiar_linea_indice(p, numero_de(p) + 1) + doc[m.end():]
    pagina_obj = int([t.group(2) for t in RE_TEXTO.finditer(objetivo.group(0)) if t.group(2).strip()][-1])
    nueva_info = cambiar_linea_indice(base_info, 2, "Información cliente", pagina_obj, MARCADOR_INFO_CLIENTE)
    return doc[: objetivo.end()] + nueva_info + doc[objetivo.end():]


def main():
    temporal = PLANTILLA.with_suffix(".tmp.docx")
    with zipfile.ZipFile(PLANTILLA) as zin, zipfile.ZipFile(temporal, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            datos = zin.read(item.filename)
            if item.filename == "word/document.xml":
                datos = ajustar(datos.decode("utf-8")).encode("utf-8")
            zout.writestr(item, datos)
    temporal.replace(PLANTILLA)
    print(f"Plantilla ajustada: {PLANTILLA}")


if __name__ == "__main__":
    main()
