"""
Microservicio de stitching 360° equirectangular.
Recibe 18 frames JPEG (base64) con ángulos yaw/pitch conocidos
y devuelve una imagen panorámica lista para Pannellum.
"""

import base64
import time
import traceback
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator

from stitcher import stitch_panorama

app = FastAPI(title="Stitch Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ── Modelos ──────────────────────────────────────────────────────────────────

class FrameInput(BaseModel):
    image: str          # JPEG en base64 (sin prefijo data:...)
    yaw: float          # grados: 0, 60, 120, 180, 240, 300
    pitch: float        # grados: 35 (piso), 90 (frente), 145 (techo)

    @field_validator("yaw")
    @classmethod
    def validate_yaw(cls, v: float) -> float:
        if not (0 <= v < 360):
            raise ValueError(f"yaw debe estar en [0, 360), recibido: {v}")
        return v

    @field_validator("pitch")
    @classmethod
    def validate_pitch(cls, v: float) -> float:
        if not (0 <= v <= 180):
            raise ValueError(f"pitch debe estar en [0, 180], recibido: {v}")
        return v


class StitchRequest(BaseModel):
    frames: list[FrameInput]
    output_width: Optional[int] = 4096
    output_height: Optional[int] = 2048
    fov_h: Optional[float] = 65.0
    fov_v: Optional[float] = 50.0


class StitchResponse(BaseModel):
    image: str              # JPEG en base64
    width: int
    height: int
    processing_time_ms: int


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"ok": True, "version": "1.0.0"}


@app.post("/stitch", response_model=StitchResponse)
async def stitch(req: StitchRequest):
    if len(req.frames) != 18:
        return JSONResponse(
            status_code=400,
            content={"error": f"Se requieren exactamente 18 frames, recibidos: {len(req.frames)}"},
        )

    try:
        t0 = time.perf_counter()

        jpeg_bytes = stitch_panorama(
            frames=[f.model_dump() for f in req.frames],
            out_w=req.output_width or 4096,
            out_h=req.output_height or 2048,
            fov_h=req.fov_h or 65.0,
            fov_v=req.fov_v or 50.0,
        )

        elapsed_ms = int((time.perf_counter() - t0) * 1000)

        return StitchResponse(
            image=base64.b64encode(jpeg_bytes).decode("ascii"),
            width=req.output_width or 4096,
            height=req.output_height or 2048,
            processing_time_ms=elapsed_ms,
        )

    except Exception:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"error": "Error interno durante el stitching. Revisa los logs."},
        )


if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
