"""
Procesador de archivos DXF usando ezdxf (Versión 2.0).

Convierte entidades DXF en:
1. SVG embebible con vector-effect="non-scaling-stroke" para trazos ultrafinos constantes.
2. PlanoItems con metadata avanzada (asociación espacial texto-polígono, cálculo de área m², perímetro y bloques de mobiliario).
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
    ("furn",        "MOBILIARIO"),
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
    "PARED":          {"fill": "transparent", "stroke": "#475569", "opacity": 1.0,  "z": 10},
    "COLUMNA":        {"fill": "transparent", "stroke": "#64748b", "opacity": 1.0,  "z": 10},
    "AREA":           {"fill": "transparent", "stroke": "#64748b", "opacity": 0.5,  "z": 1},
    "SALA":           {"fill": "transparent", "stroke": "#64748b", "opacity": 0.9,  "z": 2},
    "LABORATORIO":    {"fill": "transparent", "stroke": "#10b981", "opacity": 0.8,  "z": 2},
    "OFICINA":        {"fill": "transparent", "stroke": "#f59e0b", "opacity": 0.8,  "z": 2},
    "BAÑO":           {"fill": "transparent", "stroke": "#6366f1", "opacity": 0.8,  "z": 2},
    "PASILLO":        {"fill": "transparent", "stroke": "#64748b", "opacity": 0.5,  "z": 1},
    "ESCALERA":       {"fill": "transparent", "stroke": "#ec4899", "opacity": 0.8,  "z": 2},
    "ASCENSOR":       {"fill": "transparent", "stroke": "#8b5cf6", "opacity": 0.8,  "z": 2},
    "SALA_SERVIDORES":{"fill": "transparent", "stroke": "#ef4444", "opacity": 0.8,  "z": 2},
    "DEPOSITO":       {"fill": "transparent", "stroke": "#eab308", "opacity": 0.8,  "z": 2},
    "COMEDOR":        {"fill": "transparent", "stroke": "#f97316", "opacity": 0.8,  "z": 2},
    "CAFETERIA":      {"fill": "transparent", "stroke": "#f97316", "opacity": 0.8,  "z": 2},
    "BIBLIOTECA":     {"fill": "transparent", "stroke": "#06b6d4", "opacity": 0.8,  "z": 2},
    "AUDITORIO":      {"fill": "transparent", "stroke": "#22c55e", "opacity": 0.8,  "z": 2},
    "SALA_REUNION":   {"fill": "transparent", "stroke": "#d946ef", "opacity": 0.8,  "z": 2},
    "CARPINTERIA":    {"fill": "transparent", "stroke": "#64748b", "opacity": 0.8,  "z": 8},
    "VENTANA":        {"fill": "transparent", "stroke": "#64748b", "opacity": 0.8,  "z": 8},
    "MOBILIARIO":     {"fill": "transparent", "stroke": "#64748b", "opacity": 0.8,  "z": 5},
    "EQUIPO":         {"fill": "transparent", "stroke": "#64748b", "opacity": 0.8,  "z": 5},
    "PROYECCION":     {"fill": "none",        "stroke": "#64748b", "opacity": 0.4,  "z": 3},
    "TEXTO":          {"fill": "#334155",     "stroke": "none",    "opacity": 1.0,  "z": 15},
    "COTA":           {"fill": "none",        "stroke": "#64748b", "opacity": 0.5,  "z": 4},
    "DEFAULT":        {"fill": "transparent", "stroke": "#64748b", "opacity": 0.7,  "z": 3},
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


def _is_point_in_polygon(x: float, y: float, poly: list[tuple[float, float]]) -> bool:
    """Ray-casting point-in-polygon para asociación espacial de textos a áreas."""
    n = len(poly)
    if n < 3:
        return False
    inside = False
    p1x, p1y = poly[0]
    for i in range(n + 1):
        p2x, p2y = poly[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside


def _calculate_area_and_perimeter(pts: list[tuple[float, float]]) -> tuple[float, float]:
    """Calcula área en m² y perímetro en metros mediante Shoelace."""
    n = len(pts)
    if n < 3:
        return 0.0, 0.0
    area = 0.0
    perimeter = 0.0
    for i in range(n):
        j = (i + 1) % n
        area += pts[i][0] * pts[j][1]
        area -= pts[j][0] * pts[i][1]
        dx = pts[j][0] - pts[i][0]
        dy = pts[j][1] - pts[i][1]
        perimeter += math.sqrt(dx * dx + dy * dy)
    area = abs(area) / 2.0
    return area, perimeter


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


def _calculate_smart_bounds(
    all_points: list[tuple[float, float]],
    priority_points: list[tuple[float, float]]
) -> tuple[float, float, float, float]:
    """
    Calcula el cuadro delimitador (bounding box) óptimo descartando
    outliers (puntos huérfanos o distantes del plano real) mediante el método IQR
    y dándoles prioridad a las capas estructurales.
    """
    pts = priority_points if len(priority_points) >= 10 else all_points
    if not pts:
        return 0.0, 0.0, 100.0, 100.0

    xs = sorted(p[0] for p in pts)
    ys = sorted(p[1] for p in pts)
    n = len(xs)

    if n < 15:
        min_x, max_x = xs[0], xs[-1]
        min_y, max_y = ys[0], ys[-1]
    else:
        # Método IQR (Rango Intercuartílico) para descartar ruido distante
        q25_idx = int(n * 0.25)
        q75_idx = int(n * 0.75)
        q25_x, q75_x = xs[q25_idx], xs[q75_idx]
        iqr_x = q75_x - q25_x

        q25_y, q75_y = ys[q25_idx], ys[q75_idx]
        iqr_y = q75_y - q25_y

        # Definir límites válidos excluyendo ruido fuera de 2.5 * IQR
        if iqr_x > 0 and (xs[-1] - xs[0]) > 2.5 * iqr_x:
            min_x = max(xs[0], q25_x - 2.5 * iqr_x)
            max_x = min(xs[-1], q75_x + 2.5 * iqr_x)
        else:
            min_x, max_x = xs[0], xs[-1]

        if iqr_y > 0 and (ys[-1] - ys[0]) > 2.5 * iqr_y:
            min_y = max(ys[0], q25_y - 2.5 * iqr_y)
            max_y = min(ys[-1], q75_y + 2.5 * iqr_y)
        else:
            min_y, max_y = ys[0], ys[-1]

    dx = max_x - min_x
    dy = max_y - min_y
    if dx <= 0: dx = 10.0
    if dy <= 0: dy = 10.0

    # Margen ajustado (1.5%) alrededor del contorno
    margin_x = dx * 0.015
    margin_y = dy * 0.015

    return min_x - margin_x, min_y - margin_y, max_x + margin_x, max_y + margin_y


def process_dxf_bytes(content: bytes, filename: str = "plano.dxf") -> ProcessedDxf:
    if not EZDXF_AVAILABLE:
        raise RuntimeError("ezdxf no está instalado. Ejecuta: pip install ezdxf")

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

    # ── Primera pasada: calcular bounds globales y prioritarios ──────────────
    all_points: list[tuple[float, float]] = []
    priority_points: list[tuple[float, float]] = []

    STRUCTURAL_TYPES = {
        "PARED", "COLUMNA", "AREA", "SALA", "OFICINA",
        "LABORATORIO", "BAÑO", "PASILLO", "MOBILIARIO", "CARPINTERIA"
    }

    for entity in msp:
        etype = entity.dxftype()
        layer = getattr(entity.dxf, "layer", "0")
        tipo = _layer_to_type(layer)
        is_priority = tipo in STRUCTURAL_TYPES
        try:
            pts: list[tuple[float, float]] = []
            if etype in ("LWPOLYLINE", "POLYLINE"):
                pts = _poly_to_points(entity)
            elif etype == "LINE":
                s, e_pt = entity.dxf.start, entity.dxf.end
                pts = [(s.x, s.y), (e_pt.x, e_pt.y)]
            elif etype in ("CIRCLE", "ARC"):
                cx, cy = entity.dxf.center.x, entity.dxf.center.y
                r = entity.dxf.radius
                pts = [(cx - r, cy - r), (cx + r, cy + r)]
            elif etype in ("TEXT", "MTEXT", "INSERT"):
                ip = entity.dxf.insert
                pts = [(ip.x, ip.y)]

            if pts:
                all_points.extend(pts)
                if is_priority:
                    priority_points.extend(pts)
        except Exception:
            continue

    if not all_points:
        return ProcessedDxf(
            svg="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>"
                "<text x='10' y='50' font-size='8'>Plano vacío</text></svg>",
            entities=[], min_x=0, min_y=0, max_x=100, max_y=100,
            width=100, height=100,
        )

    global_minx, global_miny, global_maxx, global_maxy = _calculate_smart_bounds(all_points, priority_points)

    width  = max(global_maxx - global_minx, 1.0)
    height = max(global_maxy - global_miny, 1.0)

    # Grosor de línea base ultra delgado (0.075px)
    base_sw = 0.075
    wall_sw  = 0.10
    thin_sw  = 0.05
    font_size = width * 0.008

    def tx(x: float) -> float:
        return x - global_minx

    def ty(y: float) -> float:
        return height - (y - global_miny)

    layers_z: dict[int, list[str]] = {}
    entities: list[DxfEntity] = []
    text_points: list[tuple[float, float, str]] = []
    polygon_entities: list[tuple[int, list[tuple[float, float]], DxfEntity]] = []
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

        if tipo == "PARED":
            sw = wall_sw
        elif tipo in ("TEXTO", "COTA"):
            sw = thin_sw
        else:
            sw = base_sw

        try:
            if etype in ("LWPOLYLINE", "POLYLINE"):
                pts = _poly_to_points(entity)
                if len(pts) < 2:
                    continue
                is_closed = bool(getattr(entity, "closed", False) or
                                 getattr(entity.dxf, "flags", 0) & 1)
                
                area_m2, perim_m = _calculate_area_and_perimeter(pts) if is_closed else (0.0, 0.0)

                # Usar transparent para polígonos cerrados (permite click sin tapar el mapa)
                svg_fill = "transparent" if is_closed else "none"
                tag = "polygon" if is_closed else "polyline"

                pts_str = " ".join(f"{tx(p[0]):.2f},{ty(p[1]):.2f}" for p in pts)
                
                # vector-effect="non-scaling-stroke" garantiza líneas ultrafinas y nítidas
                elem = (
                    f'<{tag} id="{elem_id}" data-layer="{layer}" data-tipo="{tipo}" '
                    f'data-area="{area_m2:.1f}" '
                    f'points="{pts_str}" fill="{svg_fill}" stroke="{stroke}" '
                    f'stroke-width="{sw:.2f}" vector-effect="non-scaling-stroke" opacity="{opacity}" '
                    f'stroke-linejoin="round" class="dxf-entity" />'
                )
                add_svg(z, elem)

                xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
                ent = DxfEntity(
                    tipo=tipo, nombre=None, capa=layer,
                    x=min(xs), y=min(ys),
                    ancho=max(xs)-min(xs), alto=max(ys)-min(ys),
                    svg_element=elem_id,
                    metadata={"area_m2": round(area_m2, 2), "perimetro_m": round(perim_m, 2)},
                )
                entities.append(ent)
                if is_closed and len(pts) >= 3:
                    polygon_entities.append((len(entities) - 1, pts, ent))

            elif etype == "LINE":
                s = entity.dxf.start
                e_pt = entity.dxf.end
                elem = (
                    f'<line id="{elem_id}" data-layer="{layer}" data-tipo="{tipo}" '
                    f'x1="{tx(s.x):.2f}" y1="{ty(s.y):.2f}" '
                    f'x2="{tx(e_pt.x):.2f}" y2="{ty(e_pt.y):.2f}" '
                    f'stroke="{stroke}" stroke-width="{sw:.2f}" vector-effect="non-scaling-stroke" opacity="{opacity}" '
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
                    f'fill="{fill}" stroke="{stroke}" stroke-width="{sw:.2f}" vector-effect="non-scaling-stroke" '
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
                    f'fill="none" stroke="{stroke}" stroke-width="{sw:.2f}" vector-effect="non-scaling-stroke" '
                    f'opacity="{opacity}" class="dxf-entity" />'
                )
                add_svg(z, elem)
                entities.append(DxfEntity(
                    tipo=tipo, nombre=None, capa=layer,
                    x=cx_d-r, y=cy_d-r, ancho=r*2, alto=r*2,
                    svg_element=elem_id,
                ))

            elif etype == "INSERT":
                # Bloque de mobiliario o equipamiento (escritorio, silla, ventana, etc.)
                ip = entity.dxf.insert
                block_name = getattr(entity.dxf, "name", "BLOQUE")
                block_tipo = "MOBILIARIO" if "mueble" in layer.lower() or "furn" in layer.lower() else (
                    "CARPINTERIA" if "door" in layer.lower() or "puerta" in layer.lower() else "EQUIPO"
                )
                # Tamaño sutil proporcional al plano
                bw = max(width * 0.008, 0.5)
                elem = (
                    f'<rect id="{elem_id}" data-layer="{layer}" data-tipo="{block_tipo}" '
                    f'data-texto="{block_name}" '
                    f'x="{tx(ip.x)-bw/2:.2f}" y="{ty(ip.y)-bw/2:.2f}" width="{bw:.2f}" height="{bw:.2f}" '
                    f'fill="transparent" stroke="none" vector-effect="non-scaling-stroke" '
                    f'class="dxf-entity dxf-block" />'
                )
                add_svg(5, elem)
                entities.append(DxfEntity(
                    tipo=block_tipo, nombre=block_name, capa=layer,
                    x=ip.x, y=ip.y, ancho=bw, alto=bw,
                    svg_element=elem_id, metadata={"bloque": block_name},
                ))

            elif etype == "TEXT":
                ip = entity.dxf.insert
                txt = (entity.dxf.text or "").strip()
                h = getattr(entity.dxf, "height", font_size) or font_size
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
                    text_points.append((ip.x, ip.y, txt[:200]))

            elif etype == "MTEXT":
                ip = entity.dxf.insert
                try:
                    plain_fn = getattr(entity, "plain_mtext", None) or getattr(entity, "plain_text", None)
                    txt = plain_fn() if callable(plain_fn) else (getattr(entity.dxf, "text", "") or "")
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
                    text_points.append((ip.x, ip.y, txt[:200]))

        except Exception:
            entity_idx += 1
            continue

        entity_idx += 1

    # ── Segunda pasada v2.0: Asociación Espacial Texto-Polígono ───────────────
    # Vincular textos que están dentro de polígonos para nombrarlos automáticamente
    for _, poly_pts, ent in polygon_entities:
        for tx_x, tx_y, text_val in text_points:
            if _is_point_in_polygon(tx_x, tx_y, poly_pts):
                if not ent.nombre:
                    ent.nombre = text_val
                    ent.metadata["texto_asociado"] = text_val
                elif text_val not in ent.nombre:
                    ent.metadata.setdefault("otros_textos", []).append(text_val)

    # ── Construir SVG final ───────────────────────────────────────────────────
    svg_parts: list[str] = []
    for z_level in sorted(layers_z.keys()):
        group_elems = "\n".join(layers_z[z_level])
        svg_parts.append(f'<g class="layer-z{z_level}">{group_elems}</g>')

    vb = f"0 0 {width:.2f} {height:.2f}"
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" '
        f'width="100%" height="100%" style="background:transparent">'
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
