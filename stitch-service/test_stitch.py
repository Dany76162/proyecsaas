"""
Script de prueba para el microservicio de stitching.

Uso:
  # Con el servicio corriendo en localhost:8000
  python test_stitch.py

  # Usar carpeta con imágenes reales (18 JPEGs en orden yaw/pitch)
  python test_stitch.py --frames-dir ./test_frames

El orden esperado de los 18 frames:
  yaw=0   pitch=35 (piso)
  yaw=0   pitch=90 (frente)
  yaw=0   pitch=145 (techo)
  yaw=60  pitch=35
  yaw=60  pitch=90
  yaw=60  pitch=145
  ... (y así para yaw 120, 180, 240, 300)
"""

import argparse
import base64
import io
import json
import time
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

YAW_STEPS   = [0, 60, 120, 180, 240, 300]
PITCH_STEPS = [
    (35,  "PISO",   (80,  60,  200)),   # violeta
    (90,  "FRENTE", (40,  180,  80)),   # verde
    (145, "TECHO",  (220, 100,  40)),   # naranja
]

# Colores distintos por yaw (matiz azulado)
YAW_COLORS = [
    (220, 50,  50),   # 0°   rojo
    (220, 140, 40),   # 60°  naranja
    (200, 220, 40),   # 120° amarillo-verde
    (40,  220, 120),  # 180° verde-azul
    (40,  120, 220),  # 240° azul
    (140, 40,  220),  # 300° violeta
]


def make_test_image(yaw_deg: int, pitch_deg: int, yaw_idx: int, pitch_label: str,
                    size=(640, 360)) -> bytes:
    """Genera una imagen JPEG de color sólido con texto indicando el ángulo."""
    yaw_color   = YAW_COLORS[yaw_idx % len(YAW_COLORS)]
    pitch_color = PITCH_STEPS[[p[0] for p in PITCH_STEPS].index(pitch_deg)][2]

    # Mezcla 60% yaw + 40% pitch para visualizar ambas dimensiones
    r = int(yaw_color[0] * 0.6 + pitch_color[0] * 0.4)
    g = int(yaw_color[1] * 0.6 + pitch_color[1] * 0.4)
    b = int(yaw_color[2] * 0.6 + pitch_color[2] * 0.4)

    img = Image.new("RGB", size, color=(r, g, b))
    draw = ImageDraw.Draw(img)

    # Texto centrado
    label = f"yaw={yaw_deg}°\npitch={pitch_deg}° ({pitch_label})"
    draw.multiline_text(
        (size[0] // 2, size[1] // 2),
        label,
        fill=(255, 255, 255),
        anchor="mm",
        align="center",
    )

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


def load_frames_from_dir(frames_dir: Path) -> list[dict]:
    """
    Carga imágenes reales desde un directorio.
    Busca archivos con nombres que contengan el índice (1.jpg … 18.jpg)
    o simplemente los primeros 18 archivos JPEG en orden alfabético.
    """
    jpegs = sorted(frames_dir.glob("*.jpg")) + sorted(frames_dir.glob("*.jpeg"))
    if len(jpegs) < 18:
        raise ValueError(f"Se necesitan 18 JPEGs en {frames_dir}, se encontraron {len(jpegs)}")

    jpegs = jpegs[:18]
    frames = []
    for idx, path in enumerate(jpegs):
        yaw_idx   = idx // 3
        pitch_idx = idx % 3
        yaw   = YAW_STEPS[yaw_idx]
        pitch = PITCH_STEPS[pitch_idx][0]
        frames.append({
            "image": base64.b64encode(path.read_bytes()).decode("ascii"),
            "yaw":   yaw,
            "pitch": pitch,
        })
        print(f"  [{idx+1:02d}] {path.name}  →  yaw={yaw}° pitch={pitch}°")
    return frames


def generate_test_frames() -> list[dict]:
    """Genera 18 imágenes de color sólido para probar la geometría."""
    frames = []
    print("Generando 18 imagenes de prueba con colores por angulo...")
    for yi, yaw in enumerate(YAW_STEPS):
        for pitch_val, pitch_label, _ in PITCH_STEPS:
            jpeg = make_test_image(yaw, pitch_val, yi, pitch_label)
            frames.append({
                "image": base64.b64encode(jpeg).decode("ascii"),
                "yaw":   yaw,
                "pitch": pitch_val,
            })
    print(f"  {len(frames)} imagenes generadas.")
    return frames


def call_stitch_service(frames: list[dict], url: str) -> tuple[bytes, int]:
    payload = json.dumps({
        "frames":        frames,
        "output_width":  4096,
        "output_height": 2048,
        "fov_h":         65,
        "fov_v":         50,
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{url}/stitch",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    t0 = time.perf_counter()
    with urllib.request.urlopen(req, timeout=300) as resp:
        body = json.loads(resp.read())
    elapsed = int((time.perf_counter() - t0) * 1000)

    jpeg_bytes = base64.b64decode(body["image"])
    server_ms  = body.get("processing_time_ms", "?")
    print(f"  Tiempo servidor : {server_ms} ms")
    print(f"  Tiempo total    : {elapsed} ms (incluyendo red)")
    return jpeg_bytes, elapsed


def main():
    parser = argparse.ArgumentParser(description="Test del servicio de stitching 360°")
    parser.add_argument("--url",        default="http://localhost:8000", help="URL base del servicio")
    parser.add_argument("--frames-dir", type=Path, default=None,        help="Carpeta con 18 JPEGs reales")
    parser.add_argument("--output",     default="output_panorama.jpg",  help="Archivo de salida")
    args = parser.parse_args()

    # ── Health check ──────────────────────────────────────────────────────────
    print(f"\n[1] Verificando {args.url}/health …")
    try:
        with urllib.request.urlopen(f"{args.url}/health", timeout=10) as r:
            health = json.loads(r.read())
        print(f"    {health}")
    except Exception as e:
        print(f"    ERROR: {e}")
        print("    Asegúrate de que el servicio esté corriendo: uvicorn main:app --reload")
        return

    # ── Cargar / generar frames ───────────────────────────────────────────────
    print("\n[2] Preparando frames…")
    if args.frames_dir and args.frames_dir.exists():
        print(f"    Cargando desde {args.frames_dir}")
        frames = load_frames_from_dir(args.frames_dir)
    else:
        if args.frames_dir:
            print(f"    Directorio {args.frames_dir} no encontrado — usando imágenes generadas.")
        frames = generate_test_frames()

    # ── Llamar al servicio ────────────────────────────────────────────────────
    print(f"\n[3] Enviando 18 frames a {args.url}/stitch …")
    try:
        jpeg_bytes, _ = call_stitch_service(frames, args.url)
    except Exception as e:
        print(f"    ERROR: {e}")
        return

    # ── Guardar resultado ─────────────────────────────────────────────────────
    output_path = Path(args.output)
    output_path.write_bytes(jpeg_bytes)
    size_kb = len(jpeg_bytes) // 1024
    print(f"\n[4] Panorama guardado: {output_path}  ({size_kb} KB)")

    # Verificar dimensiones
    img = Image.open(output_path)
    print(f"    Dimensiones : {img.width}×{img.height} px")
    assert img.width  == 4096, f"Ancho inesperado: {img.width}"
    assert img.height == 2048, f"Alto inesperado: {img.height}"
    print("    Dimensiones OK (4096×2048)")
    print("\nListo. Abre output_panorama.jpg en Pannellum o cualquier visor equirectangular.")


if __name__ == "__main__":
    main()
