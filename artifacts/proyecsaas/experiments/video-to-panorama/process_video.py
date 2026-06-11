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
                "index": len(analyzed_frames),
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
    frame_bucket_count = determine_temporal_bucket_count(len(analyzed_frames))
    selected_frames: list[dict[str, Any]] = []
    blur_threshold_used = blur_threshold
    similarity_threshold_used = similarity_threshold
    low_confidence = False
    selection_strategy = "fixed_threshold_temporal_buckets"
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
            candidate_selection = select_temporally_covered_frames(
                candidates=threshold_candidates,
                total_frame_count=len(analyzed_frames),
                bucket_count=frame_bucket_count,
                similarity_threshold=candidate_similarity_threshold,
                max_selected=max_selected,
                np=np,
            )
            if len(candidate_selection) >= 8:
                selected_frames = candidate_selection
                blur_threshold_used = threshold
                similarity_threshold_used = candidate_similarity_threshold
                selection_strategy = (
                    "fixed_threshold_temporal_buckets"
                    if threshold == blur_threshold
                    else "adaptive_blur_temporal_buckets"
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
            "fixed_threshold_temporal_low_confidence"
            if blur_threshold_used == blur_threshold
            else "adaptive_blur_temporal_low_confidence"
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
    temporal_coverage = calculate_temporal_coverage(
        selected_frames=selected_frames,
        total_frame_count=len(analyzed_frames),
        bucket_count=frame_bucket_count,
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
        "temporal_coverage": temporal_coverage,
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


def determine_temporal_bucket_count(total_frame_count: int) -> int:
    if total_frame_count >= 72:
        return 12
    if total_frame_count >= 40:
        return 10
    if total_frame_count >= 16:
        return 8
    return max(1, total_frame_count)


def frame_bucket_index(frame_index: int, total_frame_count: int, bucket_count: int) -> int:
    if total_frame_count <= 1 or bucket_count <= 1:
        return 0
    return min(bucket_count - 1, math.floor(frame_index * bucket_count / total_frame_count))


def select_temporally_covered_frames(
    candidates: list[dict[str, Any]],
    total_frame_count: int,
    bucket_count: int,
    similarity_threshold: int,
    max_selected: int,
    np: Any,
) -> list[dict[str, Any]]:
    if not candidates:
        return []

    per_bucket_limit = 3 if max_selected >= bucket_count * 3 else 2
    buckets: list[list[dict[str, Any]]] = [[] for _ in range(max(1, bucket_count))]
    for item in candidates:
        bucket_index = frame_bucket_index(int(item["index"]), total_frame_count, bucket_count)
        buckets[bucket_index].append(item)

    provisional: list[dict[str, Any]] = []
    for bucket in buckets:
        ranked_bucket = sorted(
            bucket,
            key=lambda item: frame_quality_score(item["blur_score"], item["brightness"]),
            reverse=True,
        )
        provisional.extend(ranked_bucket[:per_bucket_limit])

    provisional = sorted({item["path"].name: item for item in provisional}.values(), key=lambda item: int(item["index"]))
    diverse = filter_similar_in_temporal_order(provisional, similarity_threshold, np)

    missing_bucket_indexes = set(range(bucket_count)) - {
        frame_bucket_index(int(item["index"]), total_frame_count, bucket_count) for item in diverse
    }
    for bucket_index in sorted(missing_bucket_indexes):
        if len(diverse) >= max_selected:
            break
        bucket = buckets[bucket_index]
        if not bucket:
            continue
        best = max(bucket, key=lambda item: frame_quality_score(item["blur_score"], item["brightness"]))
        diverse_names = {item["path"].name for item in diverse}
        if best["path"].name not in diverse_names:
            diverse.append(best)

    diverse = sorted(diverse, key=lambda item: int(item["index"]))
    if len(diverse) <= max_selected:
        return diverse

    return trim_selection_preserving_coverage(diverse, max_selected, total_frame_count, bucket_count)


def filter_similar_in_temporal_order(
    candidates: list[dict[str, Any]],
    similarity_threshold: int,
    np: Any,
) -> list[dict[str, Any]]:
    diverse: list[dict[str, Any]] = []
    previous_hash = None
    for item in sorted(candidates, key=lambda candidate: int(candidate["index"])):
        distance = hash_distance(previous_hash, item["hash"], np)
        if distance is None or similarity_threshold <= 0 or distance >= similarity_threshold:
            diverse.append(item)
            previous_hash = item["hash"]
    return diverse


def trim_selection_preserving_coverage(
    selected: list[dict[str, Any]],
    max_selected: int,
    total_frame_count: int,
    bucket_count: int,
) -> list[dict[str, Any]]:
    best_by_bucket: dict[int, dict[str, Any]] = {}
    for item in selected:
        bucket_index = frame_bucket_index(int(item["index"]), total_frame_count, bucket_count)
        current = best_by_bucket.get(bucket_index)
        if current is None or frame_quality_score(item["blur_score"], item["brightness"]) > frame_quality_score(
            current["blur_score"],
            current["brightness"],
        ):
            best_by_bucket[bucket_index] = item

    preserved_names = {item["path"].name for item in best_by_bucket.values()}
    remaining = [item for item in selected if item["path"].name not in preserved_names]
    remaining = sorted(remaining, key=lambda item: frame_quality_score(item["blur_score"], item["brightness"]), reverse=True)
    kept = list(best_by_bucket.values()) + remaining[: max(0, max_selected - len(best_by_bucket))]
    return sorted(kept, key=lambda item: int(item["index"]))


def calculate_temporal_coverage(
    selected_frames: list[dict[str, Any]],
    total_frame_count: int,
    bucket_count: int,
) -> dict[str, Any]:
    if not selected_frames or total_frame_count <= 0:
        return {
            "first_selected_frame_index": None,
            "last_selected_frame_index": None,
            "temporal_coverage_percent": 0.0,
            "frame_bucket_count": bucket_count,
            "buckets_with_selected_frames": 0,
            "largest_temporal_gap_ratio": None,
            "coverage_warning": "Los frames utiles no cubren toda la vuelta del video.",
        }

    indexes = sorted(int(item["index"]) for item in selected_frames)
    first_index = indexes[0]
    last_index = indexes[-1]
    denominator = max(1, total_frame_count - 1)
    temporal_coverage_percent = round(((last_index - first_index) / denominator) * 100, 2)
    selected_buckets = {
        frame_bucket_index(index, total_frame_count, bucket_count)
        for index in indexes
    }
    gaps = [indexes[index + 1] - indexes[index] for index in range(len(indexes) - 1)]
    largest_gap = max(gaps) if gaps else 0
    largest_gap_ratio = largest_gap / denominator
    coverage_warning = build_coverage_warning(
        temporal_coverage_percent=temporal_coverage_percent,
        buckets_with_selected_frames=len(selected_buckets),
        bucket_count=bucket_count,
        largest_gap_ratio=largest_gap_ratio,
    )

    return {
        "first_selected_frame_index": first_index,
        "last_selected_frame_index": last_index,
        "temporal_coverage_percent": temporal_coverage_percent,
        "frame_bucket_count": bucket_count,
        "buckets_with_selected_frames": len(selected_buckets),
        "largest_temporal_gap_ratio": round(largest_gap_ratio, 4),
        "coverage_warning": coverage_warning,
    }


def build_coverage_warning(
    temporal_coverage_percent: float,
    buckets_with_selected_frames: int,
    bucket_count: int,
    largest_gap_ratio: float,
) -> str | None:
    if temporal_coverage_percent < 65 or buckets_with_selected_frames < max(3, math.ceil(bucket_count * 0.55)):
        return "Los frames utiles no cubren toda la vuelta del video."
    if temporal_coverage_percent < 80 or buckets_with_selected_frames < math.ceil(bucket_count * 0.7):
        return "El procesamiento puede haber usado solo una parte del giro."
    if largest_gap_ratio > 0.28:
        return "Hay un hueco temporal grande entre frames seleccionados."
    return None


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
        recommendation_assets = build_recommended_panorama(panorama, output_dir, visual_quality, cv2)
        visual_quality.update(recommendation_assets)
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


def build_recommended_panorama(
    panorama: Any,
    output_dir: Path,
    visual_quality: dict[str, Any],
    cv2: Any,
) -> dict[str, Any]:
    seam_analysis = find_low_detail_seam(panorama, cv2)
    seam_x = int(seam_analysis["x"])
    seam_rotation_applied = seam_x > 0
    rotated = rotate_panorama_to_seam(panorama, seam_x, cv2) if seam_rotation_applied else panorama

    recommended = crop_for_viewer(rotated, cv2)
    recommended_type = "rotated" if seam_rotation_applied else "base"
    if recommended.shape[:2] != rotated.shape[:2]:
        recommended_type = "rotated_cropped" if seam_rotation_applied else "cropped"

    recommended_path = output_dir / "panorama_recommended.jpg"
    recommended_preview_path = output_dir / "preview_recommended.jpg"
    cv2.imwrite(str(recommended_path), recommended, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
    preview = resize_for_stitch(recommended, 1600, cv2)
    cv2.imwrite(str(recommended_preview_path), preview, [int(cv2.IMWRITE_JPEG_QUALITY), 86])

    distortion_warning = build_visual_distortion_warning(panorama, recommended, visual_quality)
    seam_warning = None
    if seam_analysis["score"] > 24:
        seam_warning = "La costura puede seguir siendo visible porque no se encontro una zona de cierre suficientemente limpia."

    viewer_recommendation = (
        "panorama_recommended.jpg es diagnostica y experimental; no usar automaticamente como imagen final del visor."
    )
    if recommended_type in {"cropped", "rotated_cropped"}:
        viewer_recommendation = (
            "panorama_recommended.jpg combina rotacion de costura y recorte, pero requiere revision visual antes de usarse."
        )

    return {
        "recommended_panorama_type": recommended_type,
        "recommended_panorama_path": str(recommended_path),
        "recommended_preview_path": str(recommended_preview_path),
        "recommended_disabled_for_viewer": True,
        "seam_warning": seam_warning,
        "seam_rotation_applied": seam_rotation_applied,
        "seam_rotation_pixels": seam_x,
        "seam_score": round(float(seam_analysis["score"]), 2),
        "visual_distortion_warning": distortion_warning,
        "viewer_recommendation": viewer_recommendation,
    }


def find_low_detail_seam(panorama: Any, cv2: Any) -> dict[str, Any]:
    height, width = panorama.shape[:2]
    gray = cv2.cvtColor(panorama, cv2.COLOR_BGR2GRAY)
    y1 = max(0, int(height * 0.18))
    y2 = min(height, int(height * 0.82))
    band = gray[y1:y2, :] if y2 > y1 else gray
    gradient_x = cv2.Sobel(band, cv2.CV_64F, 1, 0, ksize=3)
    gradient_score = cv2.reduce(cv2.convertScaleAbs(gradient_x), 0, cv2.REDUCE_AVG).flatten()

    column_std = []
    black_penalty = []
    for index in range(width):
        column = band[:, index]
        column_std.append(float(column.std()))
        black_ratio = float((column <= 8).sum()) / max(1, column.shape[0])
        black_penalty.append(18.0 if black_ratio > 0.65 else 0.0)

    scores = [float(gradient_score[index]) + column_std[index] * 0.35 + black_penalty[index] for index in range(width)]
    window = max(8, int(width * 0.025))
    smoothed_scores = []
    for index in range(width):
        start = max(0, index - window)
        end = min(width, index + window + 1)
        smoothed_scores.append(sum(scores[start:end]) / max(1, end - start))

    best_x = min(range(width), key=lambda index: smoothed_scores[index])
    return {"x": int(best_x), "score": float(smoothed_scores[best_x])}


def rotate_panorama_to_seam(panorama: Any, seam_x: int, cv2: Any) -> Any:
    width = panorama.shape[1]
    seam_x = max(0, min(width - 1, seam_x))
    if seam_x == 0:
        return panorama
    return cv2.hconcat([panorama[:, seam_x:], panorama[:, :seam_x]])


def crop_for_viewer(image: Any, cv2: Any) -> Any:
    height, width = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    content_mask = gray > 8
    points = cv2.findNonZero(content_mask.astype("uint8"))
    if points is None:
        return image

    x, y, crop_width, crop_height = cv2.boundingRect(points)
    if crop_width < 800 or crop_height < 240:
        return image

    candidate = image[y : y + crop_height, x : x + crop_width]
    candidate_height, candidate_width = candidate.shape[:2]
    if candidate_width / max(candidate_height, 1) < 1.5:
        return candidate

    trim_y = int(candidate_height * 0.06)
    if candidate_height - (trim_y * 2) >= 260:
        candidate = candidate[trim_y : candidate_height - trim_y, :]
    return candidate


def build_visual_distortion_warning(panorama: Any, recommended: Any, visual_quality: dict[str, Any]) -> str | None:
    original_height, original_width = panorama.shape[:2]
    recommended_height, recommended_width = recommended.shape[:2]
    if recommended_height < original_height * 0.85:
        return "Se recortaron zonas superiores e inferiores para reducir curvatura y estiramiento percibido."
    if visual_quality.get("border_black_percent") and float(visual_quality["border_black_percent"]) > 20:
        return "La panoramica puede mostrar estiramiento en bordes; conviene revisar la version recomendada."
    if recommended_width < original_width * 0.9:
        return "Se recortaron bordes con poca informacion util para mejorar la navegacion."
    return None


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
    temporal_coverage = selection_info.get("temporal_coverage") or {}
    temporal_coverage_percent = float(temporal_coverage.get("temporal_coverage_percent") or 0)
    buckets_with_selected_frames = int(temporal_coverage.get("buckets_with_selected_frames") or 0)
    frame_bucket_count = int(temporal_coverage.get("frame_bucket_count") or 0)
    largest_gap_ratio = float(temporal_coverage.get("largest_temporal_gap_ratio") or 0)
    coverage_warning = temporal_coverage.get("coverage_warning")

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
    if coverage_warning:
        warnings.append(str(coverage_warning))
        warnings.append("Graba manteniendo velocidad constante durante toda la vuelta.")
        warnings.append("El video debe cubrir inicio, medio y final con imagenes estables.")
    warnings.extend(visual_quality.get("quality_warnings") or [])

    if stitch_result.get("success") and (black_area_percent > 25 or (crop_area_percent and crop_area_percent < 45)):
        warnings.append("El resultado es util como prueba tecnica, pero no esta listo para publicacion.")
        return "NO APTO", dedupe_warnings(warnings)
    if stitch_result.get("success") and (
        temporal_coverage_percent < 60
        or largest_gap_ratio > 0.35
        or buckets_with_selected_frames < max(3, math.ceil(frame_bucket_count * 0.5))
    ):
        warnings.append("El procesamiento puede haber usado solo una parte del giro.")
        return "NO APTO", dedupe_warnings(warnings)
    if stitch_result.get("success") and coverage_warning:
        return "APTO CON OBSERVACIONES", dedupe_warnings(warnings)
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
        "recommended_panorama_type": None,
        "recommended_panorama_path": None,
        "recommended_preview_path": None,
        "recommended_disabled_for_viewer": True,
        "seam_warning": None,
        "seam_rotation_applied": False,
        "seam_rotation_pixels": 0,
        "seam_score": None,
        "visual_distortion_warning": None,
        "viewer_recommendation": None,
    }


def build_temporal_report_fields(
    temporal_coverage: dict[str, Any],
    metadata: dict[str, Any],
    total_frame_count: int,
) -> dict[str, Any]:
    duration = metadata.get("duration_seconds")
    duration_seconds = float(duration) if isinstance(duration, (int, float)) else None
    denominator = max(1, total_frame_count - 1)
    first_index = temporal_coverage.get("first_selected_frame_index")
    last_index = temporal_coverage.get("last_selected_frame_index")
    largest_gap_ratio = temporal_coverage.get("largest_temporal_gap_ratio")

    selected_frame_time_start = None
    selected_frame_time_end = None
    largest_temporal_gap_seconds = None
    if duration_seconds is not None and isinstance(first_index, int):
        selected_frame_time_start = round((first_index / denominator) * duration_seconds, 2)
    if duration_seconds is not None and isinstance(last_index, int):
        selected_frame_time_end = round((last_index / denominator) * duration_seconds, 2)
    if duration_seconds is not None and isinstance(largest_gap_ratio, (int, float)):
        largest_temporal_gap_seconds = round(float(largest_gap_ratio) * duration_seconds, 2)

    return {
        "first_selected_frame_index": first_index,
        "last_selected_frame_index": last_index,
        "selected_frame_time_start": selected_frame_time_start,
        "selected_frame_time_end": selected_frame_time_end,
        "temporal_coverage_percent": temporal_coverage.get("temporal_coverage_percent"),
        "frame_bucket_count": temporal_coverage.get("frame_bucket_count"),
        "buckets_with_selected_frames": temporal_coverage.get("buckets_with_selected_frames"),
        "largest_temporal_gap_seconds": largest_temporal_gap_seconds,
        "coverage_warning": temporal_coverage.get("coverage_warning"),
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
    temporal_report_fields = build_temporal_report_fields(
        temporal_coverage=selection_info.get("temporal_coverage") or {},
        metadata=metadata,
        total_frame_count=len(metrics),
    )
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
        **temporal_report_fields,
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
        f"- Primer frame seleccionado: `{report.get('first_selected_frame_index')}`",
        f"- Ultimo frame seleccionado: `{report.get('last_selected_frame_index')}`",
        f"- Tiempo inicial seleccionado: `{report.get('selected_frame_time_start')}` segundos",
        f"- Tiempo final seleccionado: `{report.get('selected_frame_time_end')}` segundos",
        f"- Cobertura temporal: `{report.get('temporal_coverage_percent')}`%",
        f"- Buckets temporales: `{report.get('frame_bucket_count')}`",
        f"- Buckets con frames seleccionados: `{report.get('buckets_with_selected_frames')}`",
        f"- Mayor hueco temporal: `{report.get('largest_temporal_gap_seconds')}` segundos",
        f"- Advertencia de cobertura: `{report.get('coverage_warning')}`",
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
        f"- Panorama recomendado: `{visual_quality.get('recommended_panorama_type')}`",
        f"- Recommended deshabilitado para visor: `{visual_quality.get('recommended_disabled_for_viewer')}`",
        f"- Rotacion de costura aplicada: `{visual_quality.get('seam_rotation_applied')}`",
        f"- Pixeles de rotacion de costura: `{visual_quality.get('seam_rotation_pixels')}`",
        f"- Score de costura: `{visual_quality.get('seam_score')}`",
        f"- Advertencia de costura: `{visual_quality.get('seam_warning')}`",
        f"- Advertencia de deformacion visual: `{visual_quality.get('visual_distortion_warning')}`",
        f"- Recomendacion para visor: `{visual_quality.get('viewer_recommendation')}`",
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
    if visual_quality.get("recommended_panorama_path"):
        lines += ["", f"Panorama recomendado: `{visual_quality['recommended_panorama_path']}`"]
    if visual_quality.get("recommended_preview_path"):
        lines += ["", f"Preview recomendado: `{visual_quality['recommended_preview_path']}`"]
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
