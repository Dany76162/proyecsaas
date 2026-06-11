#!/usr/bin/env python
"""Prototipo local Fase 2A: video de celular a panoramica con FFmpeg + OpenCV."""

from __future__ import annotations

import argparse
import json
import math
import shutil
import subprocess
import sys
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


@dataclass
class FrameMetrics:
    filename: str
    width: int
    height: int
    blur_score: float
    brightness: float
    too_blurry: bool
    too_dark: bool
    too_similar: bool
    selected: bool


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convierte un video local de giro 360 en una panoramica experimental usando FFmpeg + OpenCV.",
    )
    parser.add_argument("--input", required=True, help="Ruta al video local de entrada.")
    parser.add_argument("--output", required=True, help="Carpeta de salida del procesamiento.")
    parser.add_argument("--fps", type=float, default=1.0, help="Frames por segundo a extraer con FFmpeg. Default: 1.")
    parser.add_argument("--max-frames", type=int, default=120, help="Maximo de frames a extraer. Default: 120.")
    parser.add_argument("--max-stitch-frames", type=int, default=30, help="Maximo de frames seleccionados para stitching. Default: 30.")
    parser.add_argument("--blur-threshold", type=float, default=75.0, help="Umbral minimo de nitidez. Default: 75.")
    parser.add_argument("--dark-threshold", type=float, default=30.0, help="Brillo minimo promedio. Default: 30.")
    parser.add_argument("--similarity-threshold", type=int, default=5, help="Distancia minima de hash entre frames consecutivos. Default: 5.")
    parser.add_argument("--stitch-width", type=int, default=1200, help="Ancho maximo por frame para stitching. Default: 1200.")
    parser.add_argument("--keep-existing", action="store_true", help="No borrar la carpeta de salida si ya existe.")
    return parser.parse_args()


def run_command(command: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, capture_output=True, text=True, check=False)


def require_binary(name: str) -> None:
    if shutil.which(name) is None:
        raise RuntimeError(f"No se encontro {name} en PATH. Instalalo antes de correr el prototipo.")


def load_cv2():
    try:
        import cv2  # type: ignore
        import numpy as np  # type: ignore
    except ImportError as exc:
        raise RuntimeError("Faltan dependencias Python. Ejecuta: pip install -r requirements.txt") from exc
    return cv2, np


def get_video_metadata(input_path: Path) -> dict[str, Any]:
    command = [
        "ffprobe",
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height,duration,avg_frame_rate,codec_name",
        "-of",
        "json",
        str(input_path),
    ]
    result = run_command(command)
    if result.returncode != 0:
        raise RuntimeError(f"No se pudieron leer metadatos del video: {result.stderr.strip()}")

    data = json.loads(result.stdout or "{}")
    streams = data.get("streams") or []
    if not streams:
        raise RuntimeError("No se encontro stream de video en el archivo.")

    stream = streams[0]
    duration_raw = stream.get("duration")
    duration = float(duration_raw) if duration_raw not in (None, "N/A") else None
    return {
        "width": int(stream.get("width") or 0),
        "height": int(stream.get("height") or 0),
        "duration_seconds": duration,
        "avg_frame_rate": stream.get("avg_frame_rate"),
        "codec": stream.get("codec_name"),
    }


def prepare_output(output_dir: Path, keep_existing: bool) -> dict[str, Path]:
    if output_dir.exists() and not keep_existing:
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    paths = {
        "frames": output_dir / "frames_extracted",
        "selected": output_dir / "frames_selected",
        "diagnostics": output_dir / "diagnostics",
    }
    for path in paths.values():
        path.mkdir(parents=True, exist_ok=True)
    return paths


def extract_frames(input_path: Path, frames_dir: Path, fps: float, max_frames: int) -> list[Path]:
    output_pattern = frames_dir / "frame_%06d.jpg"
    command = [
        "ffmpeg",
        "-y",
        "-i",
        str(input_path),
        "-vf",
        f"fps={fps}",
        "-frames:v",
        str(max_frames),
        "-q:v",
        "2",
        str(output_pattern),
    ]
    result = run_command(command)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg no pudo extraer frames: {result.stderr.strip()}")
    return sorted(frames_dir.glob("frame_*.jpg"))


def average_hash(gray: Any, cv2: Any, np: Any) -> Any:
    small = cv2.resize(gray, (8, 8), interpolation=cv2.INTER_AREA)
    return small > small.mean()


def hash_distance(a: Any | None, b: Any, np: Any) -> int | None:
    if a is None:
        return None
    return int(np.count_nonzero(a != b))


def build_adaptive_thresholds(initial_threshold: float) -> list[float]:
    fallback_thresholds = [60.0, 50.0, 40.0, 30.0, 20.0]
    thresholds = [float(initial_threshold)]
    thresholds.extend(threshold for threshold in fallback_thresholds if threshold < initial_threshold)
    return list(dict.fromkeys(thresholds))


def frame_quality_score(blur_score: float, brightness: float) -> float:
    brightness_penalty = max(0.0, 55.0 - brightness) * 0.35
    return blur_score - brightness_penalty


def resize_for_stitch(image: Any, max_width: int, cv2: Any) -> Any:
    height, width = image.shape[:2]
    if width <= max_width:
        return image
    ratio = max_width / float(width)
    return cv2.resize(image, (max_width, max(1, int(height * ratio))), interpolation=cv2.INTER_AREA)


def analyze_and_select_frames(
    frame_paths: list[Path],
    selected_dir: Path,
    blur_threshold: float,
    dark_threshold: float,
    similarity_threshold: int,
    max_stitch_frames: int,
    cv2: Any,
    np: Any,
) -> tuple[list[FrameMetrics], list[Path], dict[str, Any]]:
    analyzed_frames: list[dict[str, Any]] = []

    for frame_path in frame_paths:
        image = cv2.imread(str(frame_path))
        if image is None:
            continue
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        brightness = float(gray.mean())
        current_hash = average_hash(gray, cv2, np)

        height, width = gray.shape[:2]
        analyzed_frames.append(
            {
                "path": frame_path,
                "width": width,
                "height": height,
                "blur_score": blur_score,
                "brightness": brightness,
                "hash": current_hash,
            }
        )

    adaptive_thresholds = build_adaptive_thresholds(blur_threshold)
    candidate_frames_by_threshold = {
        str(format_threshold(threshold)): sum(
            1
            for item in analyzed_frames
            if item["blur_score"] >= threshold and item["brightness"] >= dark_threshold
        )
        for threshold in adaptive_thresholds
    }

    max_selected = max(4, min(max_stitch_frames, 30))
    selected_frames: list[dict[str, Any]] = []
    blur_threshold_used = blur_threshold
    similarity_threshold_used = similarity_threshold
    low_confidence = False
    selection_strategy = "fixed_threshold_quality_ranking"
    best_low_confidence: tuple[list[dict[str, Any]], float, int] | None = None

    for threshold in adaptive_thresholds:
        threshold_candidates = [
            item
            for item in analyzed_frames
            if item["blur_score"] >= threshold and item["brightness"] >= dark_threshold
        ]
        if len(threshold_candidates) < 4:
            continue

        similarity_options = build_similarity_options(similarity_threshold, len(threshold_candidates))
        for candidate_similarity_threshold in similarity_options:
            candidate_selection = select_diverse_ranked_frames(
                threshold_candidates,
                candidate_similarity_threshold,
                max_selected,
                np,
            )
            if len(candidate_selection) >= 8:
                selected_frames = candidate_selection
                blur_threshold_used = threshold
                similarity_threshold_used = candidate_similarity_threshold
                selection_strategy = (
                    "fixed_threshold_quality_ranking"
                    if threshold == blur_threshold
                    else "adaptive_blur_quality_ranking"
                )
                break
            if len(candidate_selection) >= 4 and (
                best_low_confidence is None or len(candidate_selection) > len(best_low_confidence[0])
            ):
                best_low_confidence = (candidate_selection, threshold, candidate_similarity_threshold)
        if selected_frames:
            break

    if not selected_frames and best_low_confidence is not None:
        selected_frames, blur_threshold_used, similarity_threshold_used = best_low_confidence
        low_confidence = True
        selection_strategy = (
            "fixed_threshold_low_confidence"
            if blur_threshold_used == blur_threshold
            else "adaptive_blur_low_confidence"
        )

    selected_paths = [item["path"] for item in selected_frames]
    selected_names = {path.name for path in selected_paths}
    for path in selected_paths:
        shutil.copy2(path, selected_dir / path.name)

    metrics = build_frame_metrics(
        analyzed_frames,
        selected_names,
        blur_threshold_used,
        dark_threshold,
        similarity_threshold_used,
        np,
    )

    frame_quality_warning = build_frame_quality_warning(
        initial_threshold=blur_threshold,
        used_threshold=blur_threshold_used,
        selected_count=len(selected_paths),
        low_confidence=low_confidence,
    )
    selection_info = {
        "blur_threshold_initial": blur_threshold,
        "blur_threshold_used": blur_threshold_used,
        "adaptive_blur_enabled": blur_threshold_used < blur_threshold,
        "candidate_frames_by_threshold": candidate_frames_by_threshold,
        "selection_strategy": selection_strategy,
        "low_confidence_stitching_attempted": low_confidence,
        "frame_quality_warning": frame_quality_warning,
        "similarity_threshold_used": similarity_threshold_used,
        "max_stitch_frames_used": max_selected,
    }

    return metrics, selected_paths, selection_info


def format_threshold(value: float) -> str:
    return str(int(value)) if float(value).is_integer() else str(value)


def build_similarity_options(similarity_threshold: int, candidate_count: int) -> list[int]:
    if candidate_count < 8:
        options = [max(1, similarity_threshold - 3), 0]
    elif candidate_count < 16:
        options = [similarity_threshold, max(1, similarity_threshold - 2), 0]
    else:
        options = [similarity_threshold, max(2, similarity_threshold - 1)]
    return list(dict.fromkeys(options))


def select_diverse_ranked_frames(
    candidates: list[dict[str, Any]],
    similarity_threshold: int,
    max_selected: int,
    np: Any,
) -> list[dict[str, Any]]:
    diverse: list[dict[str, Any]] = []
    previous_hash = None
    for item in candidates:
        distance = hash_distance(previous_hash, item["hash"], np)
        if distance is None or similarity_threshold <= 0 or distance >= similarity_threshold:
            diverse.append(item)
            previous_hash = item["hash"]

    if len(diverse) <= max_selected:
        return diverse

    bucket_size = len(diverse) / max_selected
    selected: list[dict[str, Any]] = []
    for index in range(max_selected):
        start = math.floor(index * bucket_size)
        end = math.floor((index + 1) * bucket_size)
        bucket = diverse[start : max(end, start + 1)]
        selected.append(max(bucket, key=lambda item: frame_quality_score(item["blur_score"], item["brightness"])))
    return selected


def build_frame_metrics(
    analyzed_frames: list[dict[str, Any]],
    selected_names: set[str],
    blur_threshold_used: float,
    dark_threshold: float,
    similarity_threshold_used: int,
    np: Any,
) -> list[FrameMetrics]:
    metrics: list[FrameMetrics] = []
    previous_hash = None
    for item in analyzed_frames:
        frame_path = item["path"]
        too_blurry = item["blur_score"] < blur_threshold_used
        too_dark = item["brightness"] < dark_threshold
        distance = None
        too_similar = False
        if not too_blurry and not too_dark:
            distance = hash_distance(previous_hash, item["hash"], np)
            too_similar = (
                distance is not None
                and similarity_threshold_used > 0
                and distance < similarity_threshold_used
                and frame_path.name not in selected_names
            )
            if not too_similar:
                previous_hash = item["hash"]

        metrics.append(
            FrameMetrics(
                filename=frame_path.name,
                width=int(item["width"]),
                height=int(item["height"]),
                blur_score=round(float(item["blur_score"]), 2),
                brightness=round(float(item["brightness"]), 2),
                too_blurry=too_blurry,
                too_dark=too_dark,
                too_similar=too_similar,
                selected=frame_path.name in selected_names,
            )
        )
    return metrics


def build_frame_quality_warning(
    initial_threshold: float,
    used_threshold: float,
    selected_count: int,
    low_confidence: bool,
) -> str | None:
    if selected_count < 4:
        return "No se reunieron suficientes frames para intentar una panoramica."
    if low_confidence:
        return "Hay pocos frames aprovechables; se intento stitching con baja confianza."
    if used_threshold <= 30:
        return "El video tiene movimiento fuerte; se intento generar una panoramica con frames de menor nitidez."
    if used_threshold < initial_threshold:
        return "El video tiene movimiento, pero se intento generar una panoramica con los mejores frames disponibles."
    return None


def stitch_frames(selected_paths: list[Path], output_dir: Path, stitch_width: int, cv2: Any) -> dict[str, Any]:
    result: dict[str, Any] = {
        "success": False,
        "status_code": None,
        "panorama_path": None,
        "preview_path": None,
        "fallback_path": None,
        "error": None,
        "final_width": None,
        "final_height": None,
        "visual_quality": None,
    }

    if len(selected_paths) < 4:
        result["error"] = "No se detectaron suficientes frames utiles."
        return result

    images = []
    for path in selected_paths:
        image = cv2.imread(str(path))
        if image is not None:
            images.append(resize_for_stitch(image, stitch_width, cv2))

    if len(images) < 4:
        result["error"] = "No se pudieron leer suficientes frames utiles."
        return result

    stitcher = cv2.Stitcher_create(cv2.Stitcher_PANORAMA)
    status, panorama = stitcher.stitch(images)
    result["status_code"] = int(status)

    if status == cv2.Stitcher_OK and panorama is not None:
        panorama_path = output_dir / "panorama.jpg"
        preview_path = output_dir / "preview.jpg"
        cv2.imwrite(str(panorama_path), panorama, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
        preview = resize_for_stitch(panorama, 1600, cv2)
        cv2.imwrite(str(preview_path), preview, [int(cv2.IMWRITE_JPEG_QUALITY), 86])
        visual_quality = analyze_panorama_visual_quality(panorama, output_dir, cv2)
        height, width = panorama.shape[:2]
        result.update(
            {
                "success": True,
                "panorama_path": str(panorama_path),
                "preview_path": str(preview_path),
                "final_width": int(width),
                "final_height": int(height),
                "visual_quality": visual_quality,
            }
        )
        return result

    fallback = make_fallback_strip(images, output_dir, cv2)
    result["fallback_path"] = str(fallback) if fallback else None
    result["error"] = stitch_status_message(status)
    return result


def make_fallback_strip(images: list[Any], output_dir: Path, cv2: Any) -> Path | None:
    if not images:
        return None
    thumbnails = [resize_for_stitch(image, 360, cv2) for image in images[:24]]
    min_height = min(image.shape[0] for image in thumbnails)
    normalized = [cv2.resize(image, (int(image.shape[1] * min_height / image.shape[0]), min_height)) for image in thumbnails]
    strip = cv2.hconcat(normalized)
    fallback_path = output_dir / "diagnostics" / "fallback_strip.jpg"
    cv2.imwrite(str(fallback_path), strip, [int(cv2.IMWRITE_JPEG_QUALITY), 82])
    return fallback_path


def stitch_status_message(status: int) -> str:
    messages = {
        1: "Hay poca textura para unir la panoramica.",
        2: "No se pudo estimar la alineacion entre frames.",
        3: "No se pudo ajustar la camara para una panoramica confiable.",
    }
    return messages.get(int(status), "No se pudo generar una panoramica confiable.")


def analyze_panorama_visual_quality(panorama: Any, output_dir: Path, cv2: Any) -> dict[str, Any]:
    height, width = panorama.shape[:2]
    gray = cv2.cvtColor(panorama, cv2.COLOR_BGR2GRAY)
    black_mask = gray <= 8
    content_mask = gray > 8
    black_pixels = int(black_mask.sum())
    total_pixels = int(width * height)
    black_area_percent = round((black_pixels / total_pixels) * 100, 2) if total_pixels else 100.0

    bbox = None
    useful_content_percent = 0.0
    cropped_generated = False
    cropped_size = None
    cropped_path = None
    preview_cropped_path = None
    crop_area_percent = 0.0
    border_black_percent = calculate_border_black_percent(black_mask)
    warnings: list[str] = []

    points = cv2.findNonZero(content_mask.astype("uint8"))
    if points is not None:
        x, y, crop_width, crop_height = cv2.boundingRect(points)
        bbox = {
            "x": int(x),
            "y": int(y),
            "width": int(crop_width),
            "height": int(crop_height),
        }
        crop_area_percent = round((crop_width * crop_height / total_pixels) * 100, 2) if total_pixels else 0.0
        useful_content_percent = round(100.0 - black_area_percent, 2)

        crop_is_useful = (
            crop_width >= 800
            and crop_height >= 240
            and crop_area_percent >= 35
            and crop_width / max(crop_height, 1) >= 1.5
        )
        if crop_is_useful and (crop_width < width or crop_height < height):
            cropped = panorama[y : y + crop_height, x : x + crop_width]
            cropped_output = output_dir / "panorama_cropped.jpg"
            preview_output = output_dir / "preview_cropped.jpg"
            cv2.imwrite(str(cropped_output), cropped, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
            cropped_preview = resize_for_stitch(cropped, 1600, cv2)
            cv2.imwrite(str(preview_output), cropped_preview, [int(cv2.IMWRITE_JPEG_QUALITY), 86])
            cropped_generated = True
            cropped_size = {"width": int(crop_width), "height": int(crop_height)}
            cropped_path = str(cropped_output)
            preview_cropped_path = str(preview_output)

    if black_area_percent > 25:
        warnings.append("El stitching funciono, pero quedaron zonas negras amplias.")
    elif black_area_percent >= 10:
        warnings.append("La panoramica tiene zonas negras visibles en los bordes.")
    if border_black_percent > 30:
        warnings.append("La panoramica necesita recorte antes de usarse comercialmente.")
    if crop_area_percent and crop_area_percent < 45:
        warnings.append("El recorte util deja una imagen demasiado reducida.")
    if cropped_generated:
        warnings.append("Se genero panorama_cropped.jpg como version recortada para revision.")

    quality_score = calculate_visual_quality_score(
        black_area_percent=black_area_percent,
        border_black_percent=border_black_percent,
        crop_area_percent=crop_area_percent,
        cropped_generated=cropped_generated,
    )

    return {
        "black_area_percent": black_area_percent,
        "useful_content_bbox": bbox,
        "useful_content_percent": useful_content_percent,
        "border_black_percent": border_black_percent,
        "crop_area_percent": crop_area_percent,
        "cropped_generated": cropped_generated,
        "cropped_path": cropped_path,
        "preview_cropped_path": preview_cropped_path,
        "cropped_size": cropped_size,
        "quality_score": quality_score,
        "quality_warnings": warnings,
    }


def calculate_border_black_percent(black_mask: Any) -> float:
    height, width = black_mask.shape[:2]
    border_x = max(1, int(width * 0.08))
    border_y = max(1, int(height * 0.08))
    border = black_mask.copy()
    border[border_y : height - border_y, border_x : width - border_x] = False
    border_pixels = int(border.sum())
    border_area = int((height * width) - max(0, height - 2 * border_y) * max(0, width - 2 * border_x))
    return round((border_pixels / border_area) * 100, 2) if border_area else 0.0


def calculate_visual_quality_score(
    black_area_percent: float,
    border_black_percent: float,
    crop_area_percent: float,
    cropped_generated: bool,
) -> int:
    score = 100
    if black_area_percent > 25:
        score -= 45
    elif black_area_percent >= 10:
        score -= 20
    if border_black_percent > 30:
        score -= 15
    if crop_area_percent and crop_area_percent < 45:
        score -= 30
    elif crop_area_percent and crop_area_percent < 65:
        score -= 12
    if cropped_generated:
        score -= 5
    return max(0, min(100, score))


def build_recommendation(
    metrics: list[FrameMetrics],
    selected_count: int,
    stitch_result: dict[str, Any],
    selection_info: dict[str, Any],
) -> tuple[str, list[str]]:
    warnings: list[str] = []
    total = len(metrics)
    blurry = sum(1 for item in metrics if item.too_blurry)
    dark = sum(1 for item in metrics if item.too_dark)
    similar = sum(1 for item in metrics if item.too_similar)
    visual_quality = stitch_result.get("visual_quality") or {}
    black_area_percent = float(visual_quality.get("black_area_percent") or 0)
    crop_area_percent = float(visual_quality.get("crop_area_percent") or 0)
    quality_score = int(visual_quality.get("quality_score") or 0)
    blur_threshold_initial = float(selection_info.get("blur_threshold_initial") or 0)
    blur_threshold_used = float(selection_info.get("blur_threshold_used") or blur_threshold_initial)
    adaptive_blur_enabled = bool(selection_info.get("adaptive_blur_enabled"))
    low_confidence = bool(selection_info.get("low_confidence_stitching_attempted"))
    frame_quality_warning = selection_info.get("frame_quality_warning")

    if total == 0:
        return "NO APTO", ["No se pudieron extraer frames del video."]
    if selected_count < 8:
        warnings.append("No se detectaron suficientes frames utiles.")
    if blurry / total > 0.45:
        warnings.append("El video esta demasiado movido.")
    if dark / total > 0.35:
        warnings.append("El video esta demasiado oscuro.")
    if similar / total > 0.50:
        warnings.append("Hay demasiados frames repetidos o muy parecidos.")
    if not stitch_result.get("success"):
        warnings.append(stitch_result.get("error") or "No se pudo generar una panoramica confiable.")
    if adaptive_blur_enabled:
        warnings.append("El video tiene movimiento, pero se intento generar una panoramica con los mejores frames disponibles.")
    if low_confidence:
        warnings.append("El stitching se intento con baja confianza por falta de frames nitidos.")
    if frame_quality_warning:
        warnings.append(str(frame_quality_warning))
    warnings.extend(visual_quality.get("quality_warnings") or [])

    if stitch_result.get("success") and (black_area_percent > 25 or (crop_area_percent and crop_area_percent < 45)):
        warnings.append("El resultado es util como prueba tecnica, pero no esta listo para publicacion.")
        return "NO APTO", dedupe_warnings(warnings)
    if stitch_result.get("success") and (low_confidence or blur_threshold_used <= 30):
        warnings.append("Proba grabar de nuevo con mas estabilidad antes de usar este resultado comercialmente.")
        return "APTO CON OBSERVACIONES", dedupe_warnings(warnings)
    if stitch_result.get("success") and adaptive_blur_enabled:
        return "APTO CON OBSERVACIONES", dedupe_warnings(warnings)
    if stitch_result.get("success") and quality_score < 70:
        warnings.append("Proba grabar mas lento, con mas luz y evitando mover el celular hacia arriba o abajo.")
        return "APTO CON OBSERVACIONES", dedupe_warnings(warnings)
    if stitch_result.get("success") and not warnings:
        return "APTO", []
    if stitch_result.get("success"):
        return "APTO CON OBSERVACIONES", dedupe_warnings(warnings)
    return "NO APTO", dedupe_warnings(warnings)


def dedupe_warnings(warnings: list[str]) -> list[str]:
    seen = set()
    unique: list[str] = []
    for warning in warnings:
        if warning and warning not in seen:
            unique.append(warning)
            seen.add(warning)
    return unique


def empty_visual_quality() -> dict[str, Any]:
    return {
        "black_area_percent": None,
        "useful_content_bbox": None,
        "useful_content_percent": None,
        "border_black_percent": None,
        "crop_area_percent": None,
        "cropped_generated": False,
        "cropped_path": None,
        "preview_cropped_path": None,
        "cropped_size": None,
        "quality_score": None,
        "quality_warnings": [],
    }


def write_reports(
    output_dir: Path,
    input_path: Path,
    metadata: dict[str, Any],
    metrics: list[FrameMetrics],
    selected_paths: list[Path],
    stitch_result: dict[str, Any],
    selection_info: dict[str, Any],
    elapsed_seconds: float,
) -> dict[str, Any]:
    blur_values = [item.blur_score for item in metrics]
    recommendation, warnings = build_recommendation(metrics, len(selected_paths), stitch_result, selection_info)
    final_size = None
    panorama_path = stitch_result.get("panorama_path")
    if panorama_path and Path(panorama_path).exists():
        final_size = Path(panorama_path).stat().st_size

    report = {
        "input_video": str(input_path),
        "metadata": metadata,
        "frames_extracted": len(metrics),
        "frames_selected": len(selected_paths),
        "blur_average": round(sum(blur_values) / len(blur_values), 2) if blur_values else None,
        "discarded_by_blur": sum(1 for item in metrics if item.too_blurry),
        "discarded_by_darkness": sum(1 for item in metrics if item.too_dark),
        "discarded_by_similarity": sum(1 for item in metrics if item.too_similar),
        "blur_threshold_initial": selection_info.get("blur_threshold_initial"),
        "blur_threshold_used": selection_info.get("blur_threshold_used"),
        "adaptive_blur_enabled": selection_info.get("adaptive_blur_enabled"),
        "candidate_frames_by_threshold": selection_info.get("candidate_frames_by_threshold"),
        "selection_strategy": selection_info.get("selection_strategy"),
        "low_confidence_stitching_attempted": selection_info.get("low_confidence_stitching_attempted"),
        "frame_quality_warning": selection_info.get("frame_quality_warning"),
        "similarity_threshold_used": selection_info.get("similarity_threshold_used"),
        "max_stitch_frames_used": selection_info.get("max_stitch_frames_used"),
        "stitching": stitch_result,
        "visual_quality": stitch_result.get("visual_quality") or empty_visual_quality(),
        "final_image_size_bytes": final_size,
        "processing_time_seconds": round(elapsed_seconds, 2),
        "recommendation": recommendation,
        "warnings": warnings,
        "frames": [asdict(item) for item in metrics],
    }

    report_json = output_dir / "report.json"
    report_json.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    report_md = output_dir / "report.md"
    report_md.write_text(render_markdown_report(report), encoding="utf-8")
    return report


def render_markdown_report(report: dict[str, Any]) -> str:
    metadata = report["metadata"]
    stitching = report["stitching"]
    visual_quality = report.get("visual_quality") or empty_visual_quality()
    warnings = report["warnings"] or ["Sin observaciones."]
    lines = [
        "# Reporte Video a Panorama",
        "",
        f"- Video: `{report['input_video']}`",
        f"- Duracion: `{metadata.get('duration_seconds')}` segundos",
        f"- Resolucion: `{metadata.get('width')}x{metadata.get('height')}`",
        f"- Codec: `{metadata.get('codec')}`",
        f"- Frames extraidos: `{report['frames_extracted']}`",
        f"- Frames seleccionados: `{report['frames_selected']}`",
        f"- Blur promedio: `{report['blur_average']}`",
        f"- Blur threshold inicial: `{report.get('blur_threshold_initial')}`",
        f"- Blur threshold usado: `{report.get('blur_threshold_used')}`",
        f"- Seleccion adaptativa: `{report.get('adaptive_blur_enabled')}`",
        f"- Candidatos por threshold: `{report.get('candidate_frames_by_threshold')}`",
        f"- Estrategia de seleccion: `{report.get('selection_strategy')}`",
        f"- Stitching de baja confianza: `{report.get('low_confidence_stitching_attempted')}`",
        f"- Advertencia de calidad de frames: `{report.get('frame_quality_warning')}`",
        f"- Descartados por blur: `{report['discarded_by_blur']}`",
        f"- Descartados por oscuridad: `{report['discarded_by_darkness']}`",
        f"- Descartados por similitud: `{report['discarded_by_similarity']}`",
        f"- Stitching exitoso: `{stitching.get('success')}`",
        f"- Tamano final: `{report['final_image_size_bytes']}` bytes",
        f"- Tiempo de procesamiento: `{report['processing_time_seconds']}` segundos",
        f"- Recomendacion: **{report['recommendation']}**",
        "",
        "## Calidad visual del panorama",
        "",
        f"- Area negra: `{visual_quality.get('black_area_percent')}`%",
        f"- Contenido util: `{visual_quality.get('useful_content_percent')}`%",
        f"- Area negra en bordes: `{visual_quality.get('border_black_percent')}`%",
        f"- Bounding box util: `{visual_quality.get('useful_content_bbox')}`",
        f"- Recorte generado: `{visual_quality.get('cropped_generated')}`",
        f"- Tamano recortado: `{visual_quality.get('cropped_size')}`",
        f"- Score visual: `{visual_quality.get('quality_score')}`",
        "",
        "## Observaciones",
        "",
    ]
    lines.extend(f"- {warning}" for warning in warnings)
    if visual_quality.get("quality_warnings"):
        lines += ["", "## Advertencias visuales", ""]
        lines.extend(f"- {warning}" for warning in visual_quality["quality_warnings"])
    if stitching.get("panorama_path"):
        lines += ["", f"Panorama final: `{stitching['panorama_path']}`"]
    if visual_quality.get("cropped_path"):
        lines += ["", f"Panorama recortado: `{visual_quality['cropped_path']}`"]
    if visual_quality.get("preview_cropped_path"):
        lines += ["", f"Preview recortado: `{visual_quality['preview_cropped_path']}`"]
    if stitching.get("fallback_path"):
        lines += ["", f"Fallback diagnostico: `{stitching['fallback_path']}`"]
    return "\n".join(lines) + "\n"


def main() -> int:
    args = parse_args()
    start = time.perf_counter()
    input_path = Path(args.input).resolve()
    output_dir = Path(args.output).resolve()

    try:
        if not input_path.exists():
            raise RuntimeError(f"No existe el video de entrada: {input_path}")
        if args.fps <= 0:
            raise RuntimeError("El valor de --fps debe ser mayor a 0.")

        require_binary("ffmpeg")
        require_binary("ffprobe")
        cv2, np = load_cv2()

        paths = prepare_output(output_dir, args.keep_existing)
        metadata = get_video_metadata(input_path)
        frame_paths = extract_frames(input_path, paths["frames"], args.fps, args.max_frames)
        metrics, selected_paths, selection_info = analyze_and_select_frames(
            frame_paths=frame_paths,
            selected_dir=paths["selected"],
            blur_threshold=args.blur_threshold,
            dark_threshold=args.dark_threshold,
            similarity_threshold=args.similarity_threshold,
            max_stitch_frames=args.max_stitch_frames,
            cv2=cv2,
            np=np,
        )
        stitch_result = stitch_frames(selected_paths, output_dir, args.stitch_width, cv2)
        report = write_reports(
            output_dir,
            input_path,
            metadata,
            metrics,
            selected_paths,
            stitch_result,
            selection_info,
            time.perf_counter() - start,
        )

        print(f"Procesamiento finalizado: {report['recommendation']}")
        print(f"Reporte: {output_dir / 'report.md'}")
        return 0 if report["recommendation"] != "NO APTO" else 2
    except Exception as exc:
        output_dir.mkdir(parents=True, exist_ok=True)
        error_report = {
            "input_video": str(input_path),
            "error": str(exc),
            "recommendation": "NO APTO",
            "warnings": [str(exc)],
            "processing_time_seconds": round(time.perf_counter() - start, 2),
        }
        (output_dir / "report.json").write_text(json.dumps(error_report, indent=2, ensure_ascii=False), encoding="utf-8")
        (output_dir / "report.md").write_text(
            "# Reporte Video a Panorama\n\n"
            f"- Video: `{input_path}`\n"
            "- Recomendacion: **NO APTO**\n\n"
            "## Error\n\n"
            f"{exc}\n",
            encoding="utf-8",
        )
        print(f"Error: {exc}", file=sys.stderr)
        print(f"Reporte: {output_dir / 'report.md'}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
