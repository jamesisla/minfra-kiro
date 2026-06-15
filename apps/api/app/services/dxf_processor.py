"""
Procesador de archivos DXF usando ezdxf.

Convierte entidades DXF en:
1. SVG embebible para el visor web con stroke-width proporcional al viewport
2. PlanoItems con metadata (tipo, capa, bbox, nombre)
"""
import json
import math
import os
import tempfile
from dataclasses import dataclass, field
from typing import Any

try:
    import ezdxf
    from ezdxf import recover
    from ezdxf.layouts import Modelspace
    EZDXF_AVAILABLE = True
except ImportError:
    EZDXF_AVAILABLE = False


# ── Mapeo de capas a tipos semánticos ─────────────────────────────────────────
# Soporta nombres en español e inglés, parciales (keyword in layer_lower)

LAYER_TYPE_MAP: list[tuple[str, str]] = [
    # Paredes y estructura
    ("muro",        "PARED"),
    ("wall",        "PARED"),
    ("tabique",     "PARED"),
    ("partition",   "PARED"),
    ("estruct",     "PARED"),
    ("columna",     "COLUMNA"),
    ("column",      "COLUMNA"),
    # Áreas / espacios (polígonos que definen recintos)
    ("area",        "AREA"),
    ("espacio",     "AREA"),
    ("recinto",     "AREA"),
    ("room",        "AREA"),
    ("space",       "AREA"),
    # Tipos de recintos
    ("sala",        "SALA"),
    ("aula",        "SALA"),
    ("clase",       "SALA"),
    ("classroom",   "SALA"),
    ("lab",         "LABORATORIO"),
    ("laboratorio", "LABORATORIO"),
    ("oficina",     "OFICINA"),
    ("office",      "OFICINA"),
    ("despacho",    "OFICINA"),
    ("sanitario",   "BAÑO"),
    ("bano",        "BAÑO"),
    ("baño",        "BAÑO"),
    ("toilet",      "BAÑO"),
    ("wc",          "BAÑO"),
    ("aseo",        "BAÑO"),
    ("pasillo",     "PASILLO"),
    ("corredor",    "PASILLO"),
    ("corridor",    "PASILLO"),
    ("hall",        "PASILLO"),
    ("escalera",    "ESCALERA"),
    ("stair",       "ESCALERA"),
    ("ascensor",    "ASCENSOR"),
    ("elevator",    "ASCENSOR"),
    ("lift",        "ASCENSOR"),
    ("servidor",    "SALA_SERVIDORES"),
    ("server",      "SALA_SERVIDORES"),
    ("deposito",    "DEPOSITO"),
    ("almacen",     "DEPOSITO"),
    ("storage",     "DEPOSITO"),
    ("comedor",     "COMEDOR"),
    ("cafeteria",   "CAFETERIA"),
    ("biblioteca",  "BIBLIOTECA"),
    ("library",     "BIBLIOTECA"),
    ("auditorio",   "AUDITORIO"),
    ("auditorium",  "AUDITORIO"),
    ("reunion",     "SALA_REUNION"),
    ("meeting",     "SALA_REUNION"),
    # Elementos arquitectónicos
    ("carpinteria", "CARPINTERIA"),  # puertas/ventanas
    ("door",        "CARPINTERIA"),
    ("window",      "VENTANA"),
    ("ventana",     "VENTANA"),
    ("mueble",      "MOBILIARIO"),
    ("furniture",   "MOBILIARIO"),
    ("equip",       "EQUIPO"),
    ("proyeccion",  "PROYECCION"),
    # Texto/cotas
    ("text",        "TEXTO"),
    ("texto",       "TEXTO"),
    ("cota",        "COTA"),
    ("dim",         "COTA"),
    ("anno",        "TEXTO"),
    ("nota",        "TEXTO"),
]

# ── Estilos visuales por tipo ──────────────────────────────────────────────────

TYPE_STYLES: dict[str, dict] = {
    "PARED":          {"fill": "none",    "stroke": "#1e293b", "opacity": 1.0,  "z": 10},
    "COLUMNA":        {"fill": "#94a3b8", "stroke": "#475569", "opacity": 1.0,  "z": 10},
    "AREA":           {"fill": "#f1f5f9", "stroke": "#cbd5e1", "opacity": 0.6,  "z": 1},
    "SALA":           {"fill": "#dbeafe", "stroke": "#93c5fd", "opacity": 0.7,  "z": 2},
    "LABORATORIO":    {"fill": "#d1fae5", "stroke": "#6ee7b7", "opacity": 0.7,  "z": 2},
    "OFICINA":        {"fill": "#fef3c7", "stroke": "#fcd34d", "opacity": 0.7,  "z": 2},
    "BAÑO":           {"fill": "#e0e7ff", "stroke": "#a5b4fc", "opacity": 0.7,  "z": 2},
    "PASILLO":        {"fill": "#f3f4f6", "stroke": "#d1d5db", "opacity": 0.5,  "z": 1},
    "ESCALERA":       {"fill": "#fce7f3", "stroke": "#f9a8d4", "opacity": 0.7,  "z": 2},
    "ASCENSOR":       {"fill": "#ede9fe", "stroke": "#c4b5fd", "opacity": 0.7,  "z": 2},
    "SALA_SERVIDORES":{"fill": "#fee2e2", "stroke": "#fca5a5", "opacity": 0.7,  "z": 2},
    "DEPOSITO":       {"fill": "#fef9c3", "stroke": "#fde047", "opacity": 0.7,  "z": 2},
    "COMEDOR":        {"fill": "#ffedd5", "stroke": "#fdba74", "opacity": 0.7,  "z": 2},
    "CAFETERIA":      {"fill": "#ffedd5", "stroke": "#fdba74", "opacity": 0.7,  "z": 2},
    "BIBLIOTECA":     {"fill": "#cffafe", "stroke": "#67e8f9", "opacity": 0.7,  "z": 2},
    "AUDITORIO":      {"fill": "#f0fdf4", "stroke": "#86efac", "opacity": 0.7,  "z": 2},
    "SALA_REUNION":   {"fill": "#fdf4ff", "stroke": "#e879f9", "opacity": 0.7,  "z": 2},
    "CARPINTERIA":    {"fill": "#fed7aa", "stroke": "#fb923c", "opacity": 0.9,  "z": 8},
    "VENTANA":        {"fill": "#bae6fd", "stroke": "#38bdf8", "opacity": 0.8,  "z": 8},
    "MOBILIARIO":     {"fill": "#e2e8f0", "stroke": "#94a3b8", "opacity": 0.6,  "z": 5},
    "EQUIPO":         {"fill": "#fde68a", "stroke": "#f59e0b", "opacity": 0.7,  "z": 5},
    "PROYECCION":     {"fill": "none",    "stroke": "#94a3b8", "opacity": 0.4,  "z": 3},
    "TEXTO":          {"fill": "#1e293b", "stroke": "none",    "opacity": 1.0,  "z": 15},
    "COTA":           {"fill": "none",    "stroke": "#94a3b8", "opacity": 0.5,  "z": 4},
    "DEFAULT":        {"fill": "none",    "stroke": "#64748b", "opacity": 0.6,  "z": 3},
}

TYPE_LABELS: dict[str, str] = {
    "PARED":           "Pared / Muro",
    "COLUMNA":         "Columna",
    "AREA":            "Área / Recinto",
    "SALA":            "Sala",
    "LABORATORIO":     "Laboratorio",
    "OFICINA":         "Oficina",
    "BAÑO":            "Baño / Sanitario",
    "PASILLO":         "Pasillo / Corredor",
    "ESCALERA":        "Escalera",
    "ASCENSOR":        "Ascensor",
    "SALA_SERVIDORES": "Sala de Servidores",
    "DEPOSITO":        "Depósito",
    "COMEDOR":         "Comedor",
    "CAFETERIA":       "Cafetería",
    "BIBLIOTECA":      "Biblioteca",
    "AUDITORIO":       "Auditorio",
    "SALA_REUNION":    "Sala de Reuniones",
    "CARPINTERIA":     "Carpintería (puerta/ventana)",
    "VENTANA":         "Ventana",
    "MOBILIARIO":      "Mobiliario",
    "EQUIPO":          "Equipo",
    "PROYECCION":      "Proyección",
    "TEXTO":           "Texto / Rótulo",
    "COTA":            "Cota / Dimensión",
    "DEFAULT":         "Elemento general",
}


def _layer_to_type(layer_name: str) -> str:
    lower = layer_name.lower()
    for keyword, tipo in LAYER_TYPE_MAP:
        if keyword in lower:
            return tipo
    return "DEFAULT"


def _poly_to_points(entity) -> list[tuple[float, float]]:
    try:
        return [(v[0], v[1]) for v in entity.get_points()]
    except Exception:
        try:
            return [(v.dxf.x, v.dxf.y) for v in entity.vertices]
        except Exception:
            return []


@dataclass
class DxfEntity:
    tipo: str
    nombre: str | None
    capa: str
    x: float
    y: float
    ancho: float
    alto: float
    svg_element: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ProcessedDxf:
    svg: str
    entities: list[DxfEntity]
    min_x: float
    min_y: float
    max_x: float
    max_y: float
    width: float
    height: float


def process_dxf_bytes(content: bytes, filename: str = "plano.dxf") -> ProcessedDxf:
    if not EZDXF_AVAILABLE:
        raise RuntimeError("ezdxf no está instalado. Ejecuta: pip install ezdxf")

    # Escribir a archivo temporal — más robusto que streams
    doc = None
    last_error: Exception | None = None
    with tempfile.NamedTemporaryFile(suffix=".dxf", delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name
    try:
        try:
            doc, _ = recover.readfile(tmp_path)
        except Exception as e:
            last_error = e
        if doc is None:
            try:
                doc = ezdxf.readfile(tmp_path)
            except Exception as e:
                last_error = e
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass

    if doc is None:
        raise RuntimeError(f"No se pudo leer el archivo DXF: {last_error}") from last_error

    msp: Modelspace = doc.modelspace()

    # ── Primera pasada: calcular bounds globales ───────────────────────────────
    all_points: list[tuple[float, float]] = []

    for entity in msp:
        etype = entity.dxftype()
        try:
            if etype in ("LWPOLYLINE", "POLYLINE"):
                pts = _poly_to_points(entity)
                all_points.extend(pts)
            elif etype == "LINE":
                s, e_pt = entity.dxf.start, entity.dxf.end
                all_points.extend([(s.x, s.y), (e_pt.x, e_pt.y)])
            elif etype in ("CIRCLE", "ARC"):
                cx, cy = entity.dxf.center.x, entity.dxf.center.y
                r = entity.dxf.radius
                all_points.extend([(cx - r, cy - r), (cx + r, cy + r)])
            elif etype in ("TEXT", "MTEXT", "INSERT"):
                ip = entity.dxf.insert
                all_points.append((ip.x, ip.y))
        except Exception:
            continue

    if not all_points:
        return ProcessedDxf(
            svg="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>"
                "<text x='10' y='50' font-size='8'>Plano vacío</text></svg>",
            entities=[], min_x=0, min_y=0, max_x=100, max_y=100,
            width=100, height=100,
        )

    global_minx = min(p[0] for p in all_points)
    global_miny = min(p[1] for p in all_points)
    global_maxx = max(p[0] for p in all_points)
    global_maxy = max(p[1] for p in all_points)

    # Margen del 2%
    margin_x = (global_maxx - global_minx) * 0.02
    margin_y = (global_maxy - global_miny) * 0.02
    global_minx -= margin_x
    global_miny -= margin_y
    global_maxx += margin_x
    global_maxy += margin_y

    width  = max(global_maxx - global_minx, 1.0)
    height = max(global_maxy - global_miny, 1.0)

    # stroke-width proporcional: ~0.15% del ancho del plano → siempre visible
    base_sw = width * 0.0015
    wall_sw  = base_sw * 2.5
    thin_sw  = base_sw * 0.8
    # font-size proporcional
    font_size = width * 0.008

    def tx(x: float) -> float:
        return x - global_minx

    def ty(y: float) -> float:
        return height - (y - global_miny)  # invertir Y

    # ── Segunda pasada: generar elementos SVG agrupados por z-order ───────────
    # Acumulamos por z para pintar en orden correcto (muros encima de áreas)
    layers_z: dict[int, list[str]] = {}
    entities: list[DxfEntity] = []
    entity_idx = 0

    def add_svg(z: int, elem: str) -> None:
        layers_z.setdefault(z, []).append(elem)

    for entity in msp:
        etype = entity.dxftype()
        layer = getattr(entity.dxf, "layer", "0")
        tipo = _layer_to_type(layer)
        style = TYPE_STYLES.get(tipo, TYPE_STYLES["DEFAULT"])
        fill    = style["fill"]
        stroke  = style["stroke"]
        opacity = style["opacity"]
        z       = style["z"]
        elem_id = f"e{entity_idx}"

        # Calcular stroke-width según tipo
        if tipo == "PARED":
            sw = wall_sw
        elif tipo in ("TEXTO", "COTA"):
            sw = thin_sw
        else:
            sw = base_sw

        try:
            if etype == "LWPOLYLINE":
                pts = _poly_to_points(entity)
                if len(pts) < 2:
                    continue
                is_closed = bool(getattr(entity, "closed", False) or
                                 getattr(entity.dxf, "flags", 0) & 1)
                # Si es AREA/recinto cerrado → rellenar
                if is_closed and tipo in (
                    "AREA","SALA","LABORATORIO","OFICINA","BAÑO","PASILLO",
                    "ESCALERA","ASCENSOR","SALA_SERVIDORES","DEPOSITO",
                    "COMEDOR","CAFETERIA","BIBLIOTECA","AUDITORIO","SALA_REUNION","PARED",
                ):
                    svg_fill = fill
                    tag = "polygon"
                else:
                    svg_fill = fill if is_closed else "none"
                    tag = "polygon" if is_closed else "polyline"

                pts_str = " ".join(f"{tx(p[0]):.2f},{ty(p[1]):.2f}" for p in pts)
                elem = (
                    f'<{tag} id="{elem_id}" data-layer="{layer}" data-tipo="{tipo}" '
                    f'points="{pts_str}" fill="{svg_fill}" stroke="{stroke}" '
                    f'stroke-width="{sw:.3f}" opacity="{opacity}" '
                    f'stroke-linejoin="round" class="dxf-entity" />'
                )
                add_svg(z, elem)

                xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
                entities.append(DxfEntity(
                    tipo=tipo, nombre=None, capa=layer,
                    x=min(xs), y=min(ys),
                    ancho=max(xs)-min(xs), alto=max(ys)-min(ys),
                    svg_element=elem_id,
                ))

            elif etype == "LINE":
                s = entity.dxf.start
                e_pt = entity.dxf.end
                elem = (
                    f'<line id="{elem_id}" data-layer="{layer}" data-tipo="{tipo}" '
                    f'x1="{tx(s.x):.2f}" y1="{ty(s.y):.2f}" '
                    f'x2="{tx(e_pt.x):.2f}" y2="{ty(e_pt.y):.2f}" '
                    f'stroke="{stroke}" stroke-width="{sw:.3f}" opacity="{opacity}" '
                    f'class="dxf-entity" />'
                )
                add_svg(z, elem)
                entities.append(DxfEntity(
                    tipo=tipo, nombre=None, capa=layer,
                    x=min(s.x, e_pt.x), y=min(s.y, e_pt.y),
                    ancho=abs(e_pt.x - s.x), alto=abs(e_pt.y - s.y),
                    svg_element=elem_id,
                ))

            elif etype == "CIRCLE":
                cx_d, cy_d = entity.dxf.center.x, entity.dxf.center.y
                r = entity.dxf.radius
                elem = (
                    f'<circle id="{elem_id}" data-layer="{layer}" data-tipo="{tipo}" '
                    f'cx="{tx(cx_d):.2f}" cy="{ty(cy_d):.2f}" r="{r:.2f}" '
                    f'fill="{fill}" stroke="{stroke}" stroke-width="{sw:.3f}" '
                    f'opacity="{opacity}" class="dxf-entity" />'
                )
                add_svg(z, elem)
                entities.append(DxfEntity(
                    tipo=tipo, nombre=None, capa=layer,
                    x=cx_d-r, y=cy_d-r, ancho=r*2, alto=r*2,
                    svg_element=elem_id,
                ))

            elif etype == "ARC":
                cx_d, cy_d = entity.dxf.center.x, entity.dxf.center.y
                r = entity.dxf.radius
                sa = math.radians(entity.dxf.start_angle)
                ea = math.radians(entity.dxf.end_angle)
                sx_ = tx(cx_d) + r * math.cos(sa)
                sy_ = ty(cy_d) - r * math.sin(sa)
                ex_ = tx(cx_d) + r * math.cos(ea)
                ey_ = ty(cy_d) - r * math.sin(ea)
                diff = entity.dxf.end_angle - entity.dxf.start_angle
                if diff < 0:
                    diff += 360
                large = 1 if diff > 180 else 0
                elem = (
                    f'<path id="{elem_id}" data-layer="{layer}" data-tipo="{tipo}" '
                    f'd="M {sx_:.2f} {sy_:.2f} A {r:.2f} {r:.2f} 0 {large} 0 {ex_:.2f} {ey_:.2f}" '
                    f'fill="none" stroke="{stroke}" stroke-width="{sw:.3f}" '
                    f'opacity="{opacity}" class="dxf-entity" />'
                )
                add_svg(z, elem)
                entities.append(DxfEntity(
                    tipo=tipo, nombre=None, capa=layer,
                    x=cx_d-r, y=cy_d-r, ancho=r*2, alto=r*2,
                    svg_element=elem_id,
                ))

            elif etype == "TEXT":
                ip = entity.dxf.insert
                txt = (entity.dxf.text or "").strip()
                h = getattr(entity.dxf, "height", font_size) or font_size
                # Escalar texto para que sea legible
                display_h = max(h, font_size * 0.5)
                if txt:
                    elem = (
                        f'<text id="{elem_id}" data-layer="{layer}" data-tipo="TEXTO" '
                        f'data-texto="{txt[:100]}" '
                        f'x="{tx(ip.x):.2f}" y="{ty(ip.y):.2f}" '
                        f'font-size="{display_h:.2f}" fill="{stroke}" '
                        f'opacity="{opacity}" class="dxf-entity dxf-text" >'
                        f'{txt[:80]}</text>'
                    )
                    add_svg(z, elem)
                    entities.append(DxfEntity(
                        tipo="TEXTO", nombre=txt[:200], capa=layer,
                        x=ip.x, y=ip.y, ancho=len(txt)*display_h*0.6, alto=display_h,
                        svg_element=elem_id, metadata={"texto": txt[:200]},
                    ))

            elif etype == "MTEXT":
                ip = entity.dxf.insert
                try:
                    txt = entity.plain_mtext() or ""
                except Exception:
                    txt = getattr(entity.dxf, "text", "") or ""
                txt = txt.strip()
                h = getattr(entity.dxf, "char_height", font_size) or font_size
                display_h = max(h, font_size * 0.5)
                if txt:
                    txt_short = txt[:80].replace("\n", " ")
                    elem = (
                        f'<text id="{elem_id}" data-layer="{layer}" data-tipo="TEXTO" '
                        f'data-texto="{txt_short}" '
                        f'x="{tx(ip.x):.2f}" y="{ty(ip.y):.2f}" '
                        f'font-size="{display_h:.2f}" fill="{stroke}" '
                        f'opacity="{opacity}" class="dxf-entity dxf-text" >'
                        f'{txt_short}</text>'
                    )
                    add_svg(z, elem)
                    entities.append(DxfEntity(
                        tipo="TEXTO", nombre=txt[:200], capa=layer,
                        x=ip.x, y=ip.y, ancho=50, alto=display_h,
                        svg_element=elem_id, metadata={"texto": txt[:200]},
                    ))

        except Exception:
            entity_idx += 1
            continue

        entity_idx += 1

    # ── Construir SVG final ordenado por z ─────────────────────────────────────
    svg_parts: list[str] = []
    for z_level in sorted(layers_z.keys()):
        group_elems = "\n".join(layers_z[z_level])
        svg_parts.append(f'<g class="layer-z{z_level}">{group_elems}</g>')

    vb = f"0 0 {width:.2f} {height:.2f}"
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" '
        f'width="100%" height="100%" style="background:#f8fafc">'
        + "\n".join(svg_parts)
        + "</svg>"
    )

    return ProcessedDxf(
        svg=svg,
        entities=entities,
        min_x=global_minx,
        min_y=global_miny,
        max_x=global_maxx,
        max_y=global_maxy,
        width=width,
        height=height,
    )
