# stitch-service

Microservicio Python para stitching de imágenes 360° equirectangulares.
Recibe 18 fotos JPEG con ángulos yaw/pitch conocidos y devuelve una imagen
panorámica `4096×2048px` lista para Pannellum.

## Cómo funciona

- **Proyección inversa vectorizada**: para cada píxel del canvas equirectangular
  se calcula el vector 3D en world space y se proyecta a cada uno de los 18 frames.
- **Blending gaussiano**: cuando varios frames cubren el mismo píxel, se pondera
  cada contribución con `exp(-2*(fx²+fy²))` para suavizar las costuras.
- **Paralelismo**: los 18 frames se procesan en paralelo con `ThreadPoolExecutor`.
- **Sampling bilineal**: `scipy.ndimage.map_coordinates` garantiza interpolación
  suave sin artefactos de píxeles.

## API

### `GET /health`
```json
{ "ok": true, "version": "1.0.0" }
```

### `POST /stitch`
**Body JSON:**
```json
{
  "frames": [
    { "image": "<base64 JPEG>", "yaw": 0, "pitch": 90 },
    ...18 frames en total...
  ],
  "output_width": 4096,
  "output_height": 2048,
  "fov_h": 65,
  "fov_v": 50
}
```

**Orden de los frames** (18 en total):
| Índice | yaw | pitch | Descripción |
|--------|-----|-------|-------------|
| 0      | 0°  | 35°   | Piso frente 1 |
| 1      | 0°  | 90°   | Frente 1 |
| 2      | 0°  | 145°  | Techo frente 1 |
| 3      | 60° | 35°   | Piso frente 2 |
| ...    | ... | ...   | ... |
| 17     | 300°| 145°  | Techo frente 6 |

**Respuesta 200:**
```json
{
  "image": "<base64 JPEG 4096x2048>",
  "width": 4096,
  "height": 2048,
  "processing_time_ms": 12500
}
```

## Desarrollo local

```bash
cd stitch-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Verificar:
```bash
curl http://localhost:8000/health
```

Ejecutar test con imágenes sintéticas:
```bash
python test_stitch.py
# Genera output_panorama.jpg con colores por ángulo
```

Ejecutar test con imágenes reales:
```bash
python test_stitch.py --frames-dir ./test_frames
# Los 18 JPEGs deben estar en orden: yaw0-piso, yaw0-frente, yaw0-techo, yaw60-piso...
```

## Deploy en Railway

### Opción A: Servicio separado (recomendado)

1. Crear un **nuevo servicio** en Railway (no el mismo proyecto Next.js).
2. Apuntar al repositorio y configurar el directorio raíz como `stitch-service/`.
3. Railway detectará el `Dockerfile` automáticamente.
4. Configurar la variable de entorno en el **servicio Next.js**:
   ```
   NEXT_PUBLIC_STITCH_SERVICE_URL=https://<nombre>.up.railway.app
   ```

### Opción B: Mismo proyecto Railway (monorepo)

El `railway.toml` en la raíz del proyecto ya referencia este servicio:
```toml
[build]
builder = "dockerfile"
dockerfilePath = "stitch-service/Dockerfile"
```

En Railway > Settings > Root Directory dejar vacío y elegir este toml
para el servicio de stitching.

### Variables de entorno

| Variable | Servicio | Descripción |
|----------|----------|-------------|
| `NEXT_PUBLIC_STITCH_SERVICE_URL` | Next.js | URL pública del servicio Python |

Sin esta variable, el frontend usa el stitching local (grilla simple) como fallback.

## Rendimiento esperado

| Hardware | 18 frames 640×360 | 18 frames 2560×1440 |
|----------|-------------------|----------------------|
| Railway Starter (512 MB) | ~3 s | ~25-40 s |
| Railway Pro (2 GB) | ~1 s | ~10-15 s |

Para producción con imágenes de alta resolución se recomienda usar
`output_width=2048, output_height=1024` en la primera versión y subir
a 4096×2048 si el plan de Railway lo permite.

## Dependencias

| Paquete | Uso |
|---------|-----|
| `fastapi` | Framework HTTP |
| `uvicorn` | Servidor ASGI |
| `numpy` | Álgebra lineal vectorizada |
| `Pillow` | Decodificación/codificación JPEG |
| `scipy` | Sampling bilineal (`map_coordinates`) |
