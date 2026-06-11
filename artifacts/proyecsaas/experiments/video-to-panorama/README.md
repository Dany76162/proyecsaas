# Fase 2A - Prototipo Local Video a Panorama

Este experimento valida si un video grabado con celular, desde un punto fijo girando 360 grados, puede convertirse en una panoramica navegable de mejor calidad usando FFmpeg y OpenCV.

No esta integrado con Raices Pilot. No toca Propiedades, Prisma, R2, APIs, visor, catalogo ni ficha publica.

## Objetivo

Procesar videos locales de prueba y generar:

- frames extraidos;
- frames seleccionados;
- panorama final si OpenCV logra stitch;
- preview reducido;
- recorte opcional si el stitch deja bordes negros utiles de remover;
- fallback diagnostico si el stitch falla;
- `report.json`;
- `report.md`.

## Instalacion

Requisitos del sistema:

- Python 3.10 o superior;
- FFmpeg instalado y disponible en PATH;
- FFprobe instalado y disponible en PATH.

Crear entorno local opcional:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Uso

Colocar un video en `samples/` y ejecutar:

```bash
python process_video.py --input ./samples/living.mp4 --output ./outputs/living
```

Opciones utiles:

```bash
python process_video.py --input ./samples/living.mp4 --output ./outputs/living --fps 1 --max-frames 120
```

```bash
python process_video.py --input ./samples/living.mp4 --output ./outputs/living --blur-threshold 80 --dark-threshold 35 --similarity-threshold 6
```

## Pipeline

1. Valida que exista el video.
2. Lee metadatos con FFprobe.
3. Extrae frames con FFmpeg a baja frecuencia.
4. Calcula blur score con varianza de Laplaciano.
5. Calcula brillo promedio.
6. Detecta frames oscuros.
7. Detecta frames demasiado parecidos al anterior.
8. Selecciona un subconjunto util.
9. Intenta stitching con OpenCV Stitcher.
10. Analiza area negra, bordes vacios y bounding box de contenido util.
11. Si el recorte es razonable, genera `panorama_cropped.jpg` y `preview_cropped.jpg`.
12. Si falla, genera un fallback horizontal solo para diagnostico.
13. Escribe reportes JSON y Markdown.

## Interpretacion de resultados

El reporte final marca:

- `APTO`: stitch exitoso y suficientes frames utiles.
- `APTO CON OBSERVACIONES`: hay resultado, pero con advertencias.
- `NO APTO`: no se logro una panoramica confiable.

Metricas visuales nuevas:

- `black_area_percent`: porcentaje de pixeles negros o casi negros.
- `useful_content_bbox`: caja aproximada de contenido util.
- `useful_content_percent`: porcentaje aproximado de contenido no negro.
- `cropped_generated`: indica si se genero recorte.
- `cropped_size`: tamano del recorte.
- `quality_score`: score simple de 0 a 100.
- `quality_warnings`: advertencias visuales post-stitching.

Mensajes frecuentes:

- El video esta demasiado movido.
- Hay poca textura para unir la panoramica.
- El video esta demasiado oscuro.
- No se detectaron suficientes frames utiles.
- No se pudo generar una panoramica confiable.
- El stitching funciono, pero quedaron zonas negras amplias.
- La panoramica necesita recorte antes de usarse comercialmente.

## Limitaciones

Este prototipo no promete una esfera 360 real. Busca validar si una panoramica horizontal navegable puede mejorar claramente la Fase 1.

OpenCV puede fallar con:

- paredes lisas;
- poca luz;
- mucho blur;
- desplazamiento del usuario;
- giros demasiado rapidos;
- videos con pocos puntos reconocibles.

## Proximos pasos si funciona

Si 5 a 10 videos reales dan resultados aceptables:

1. definir limites de calidad;
2. crear worker `video-to-panorama`;
3. agregar cola async;
4. subir temporales a R2;
5. guardar solo imagen final como `PANORAMA`;
6. integrar estado de job en Propiedades.
