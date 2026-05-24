"""
Algoritmo de stitching equirectangular por proyección inversa con blending gaussiano.

Sistema de coordenadas:
  - yaw=0   → cámara apunta en dirección +X
  - yaw     → aumenta hacia la derecha (horario visto desde arriba)
  - pitch=90° → horizontal (frente)
  - pitch=35° → apunta al piso
  - pitch=145°→ apunta al techo

Rotación world→camera:
  1. Rotar -yaw alrededor del eje Z (vertical)
  2. Rotar -(pitch-90°) alrededor del eje Y (tilt)
"""

import io
import math
import base64
import numpy as np
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image
from scipy.ndimage import map_coordinates


def _rot_z(angle_rad: float) -> np.ndarray:
    """Matriz de rotación alrededor del eje Z."""
    c, s = math.cos(angle_rad), math.sin(angle_rad)
    return np.array([
        [c, -s, 0],
        [s,  c, 0],
        [0,  0, 1],
    ], dtype=np.float64)


def _rot_y(angle_rad: float) -> np.ndarray:
    """Matriz de rotación alrededor del eje Y."""
    c, s = math.cos(angle_rad), math.sin(angle_rad)
    return np.array([
        [ c, 0, s],
        [ 0, 1, 0],
        [-s, 0, c],
    ], dtype=np.float64)


def _decode_image(b64_string: str) -> np.ndarray:
    """Decodifica base64 → numpy array RGB float32 [H, W, 3]."""
    data = base64.b64decode(b64_string)
    img = Image.open(io.BytesIO(data)).convert("RGB")
    return np.array(img, dtype=np.float32)


def _build_rotation_matrix(yaw_deg: float, pitch_deg: float) -> np.ndarray:
    """
    Matriz 3×3 para rotar un vector world→camera.
    """
    yaw_rad = math.radians(yaw_deg)
    tilt_rad = math.radians(pitch_deg - 90.0)

    # Primero deshacemos el yaw, luego el tilt
    R = _rot_y(-tilt_rad) @ _rot_z(-yaw_rad)
    return R


def _process_frame(
    frame_idx: int,
    img_arr: np.ndarray,          # [H_img, W_img, 3] float32
    R: np.ndarray,                # [3, 3]
    world_pts: np.ndarray,        # [3, N] float64 — vectores esféricos world
    out_h: int,
    out_w: int,
    tan_h: float,
    tan_v: float,
) -> tuple[int, np.ndarray, np.ndarray, np.ndarray]:
    """
    Calcula la contribución de un único frame al canvas equirectangular.

    Retorna:
      (frame_idx, valid_pixel_indices, rgb_values [M,3], weights [M])
    """
    img_h, img_w = img_arr.shape[:2]
    N = out_h * out_w

    # Rotar todos los vectores al espacio de cámara
    # world_pts: [3, N] → cam_pts: [3, N]
    cam_pts = R @ world_pts  # [3, N]

    cx, cy, cz = cam_pts[0], cam_pts[1], cam_pts[2]

    # Sólo los puntos frente a la cámara
    front_mask = cz > 1e-6

    # Proyección rectilineal normalizada [-1, 1]
    fx = np.where(front_mask, cx / (cz * tan_h), np.inf)
    fy = np.where(front_mask, cy / (cz * tan_v), np.inf)

    # Dentro del frame
    in_frame = front_mask & (fx >= -1.0) & (fx <= 1.0) & (fy >= -1.0) & (fy <= 1.0)

    valid_idx = np.where(in_frame)[0]
    if valid_idx.size == 0:
        return frame_idx, valid_idx, np.empty((0, 3), dtype=np.float32), np.empty(0, dtype=np.float64)

    fx_v = fx[valid_idx]
    fy_v = fy[valid_idx]

    # Coordenadas de píxel en la imagen fuente
    u = (fx_v + 1.0) * 0.5 * (img_w - 1)   # columna
    v = (fy_v + 1.0) * 0.5 * (img_h - 1)   # fila

    # Peso gaussiano: mayor peso cerca del centro del frame
    weights = np.exp(-2.0 * (fx_v ** 2 + fy_v ** 2))

    # Sampling bilineal con scipy (opera canal a canal)
    coords_row = v  # [M]
    coords_col = u  # [M]

    rgb = np.empty((valid_idx.size, 3), dtype=np.float32)
    for ch in range(3):
        rgb[:, ch] = map_coordinates(
            img_arr[:, :, ch],
            [coords_row, coords_col],
            order=1,        # bilineal
            mode='nearest',
            prefilter=False,
        )

    return frame_idx, valid_idx, rgb, weights


def stitch_panorama(
    frames: list[dict],   # lista de {"image": str_b64, "yaw": float, "pitch": float}
    out_w: int = 4096,
    out_h: int = 2048,
    fov_h: float = 65.0,
    fov_v: float = 50.0,
) -> bytes:
    """
    Recibe 18 frames con ángulos conocidos y devuelve una imagen equirectangular
    en bytes JPEG lista para Pannellum.
    """
    tan_h = math.tan(math.radians(fov_h / 2.0))
    tan_v = math.tan(math.radians(fov_v / 2.0))

    # ── 1. Construir los vectores esféricos del canvas de salida ──────────────
    # Cada píxel (x, y) del equirectangular corresponde a un vector 3D en world space.
    xs = np.arange(out_w, dtype=np.float64)
    ys = np.arange(out_h, dtype=np.float64)
    xg, yg = np.meshgrid(xs, ys)  # [out_h, out_w]

    lon = (xg / out_w) * (2.0 * math.pi) - math.pi    # [-π, π]
    lat = math.pi / 2.0 - (yg / out_h) * math.pi      # [π/2, -π/2]

    cos_lat = np.cos(lat)
    wx = cos_lat * np.cos(lon)   # [H, W]
    wy = cos_lat * np.sin(lon)
    wz = np.sin(lat)

    # Aplanar a [3, N]
    N = out_h * out_w
    world_pts = np.stack([wx.ravel(), wy.ravel(), wz.ravel()], axis=0)  # [3, N]

    # ── 2. Decodificar imágenes y preparar matrices de rotación ───────────────
    images = []
    rotations = []
    for frame in frames:
        img_arr = _decode_image(frame["image"])
        images.append(img_arr)
        R = _build_rotation_matrix(frame["yaw"], frame["pitch"])
        rotations.append(R)

    # ── 3. Acumuladores para blending ─────────────────────────────────────────
    accum_rgb = np.zeros((N, 3), dtype=np.float64)
    accum_w   = np.zeros(N,      dtype=np.float64)

    # ── 4. Procesar frames en paralelo ────────────────────────────────────────
    with ThreadPoolExecutor() as pool:
        futures = {
            pool.submit(
                _process_frame,
                i, images[i], rotations[i],
                world_pts, out_h, out_w, tan_h, tan_v,
            ): i
            for i in range(len(frames))
        }

        for future in as_completed(futures):
            _, valid_idx, rgb, weights = future.result()
            if valid_idx.size == 0:
                continue
            # Acumular contribución ponderada
            np.add.at(accum_rgb, valid_idx, rgb * weights[:, np.newaxis])
            np.add.at(accum_w,   valid_idx, weights)

    # ── 5. Normalizar ─────────────────────────────────────────────────────────
    safe_w = np.where(accum_w > 0, accum_w, 1.0)
    result = (accum_rgb / safe_w[:, np.newaxis]).astype(np.uint8)
    result[accum_w == 0] = 0  # píxeles sin cobertura → negro

    # ── 6. Codificar a JPEG ───────────────────────────────────────────────────
    img_out = Image.fromarray(result.reshape(out_h, out_w, 3), mode="RGB")
    buf = io.BytesIO()
    img_out.save(buf, format="JPEG", quality=90, optimize=True)
    return buf.getvalue()
