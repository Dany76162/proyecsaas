"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Box,
  ChevronLeft,
  ChevronRight,
  Footprints,
  Layers,
  Loader2,
  Map,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { PropertyPanoramaItem } from "@/modules/properties/types";

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(" ");

interface PanoramaViewerProps {
  panoramas: PropertyPanoramaItem[];
  className?: string;
  showSceneNavigation?: boolean;
  immersiveControls?: boolean;
}

const VIEWER_WIDTH = 4096;

const vertexShaderSource = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  varying vec2 v_uv;
  uniform sampler2D u_texture;
  uniform float u_yaw;
  uniform float u_pitch;
  uniform float u_fov;
  uniform float u_aspect;

  const float PI = 3.141592653589793;

  mat3 rotateY(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
  }

  mat3 rotateX(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c);
  }

  void main() {
    vec2 xy = v_uv * 2.0 - 1.0;
    float focal = 1.0 / tan(radians(u_fov) * 0.5);
    vec3 dir = normalize(vec3(xy.x * u_aspect, xy.y, -focal));
    dir = rotateY(u_yaw) * rotateX(u_pitch) * dir;

    float lon = atan(dir.x, -dir.z);
    float lat = asin(clamp(dir.y, -1.0, 1.0));
    vec2 panoUv = vec2(lon / (2.0 * PI) + 0.5, 0.5 - lat / PI);
    gl_FragColor = texture2D(u_texture, panoUv);
  }
`;

function getViewerPanoramaUrl(url: string) {
  if (/^https?:\/\//.test(url)) return url;
  if (url.includes("/uploads/property-media/panoramas360/")) {
    return url
      .replace("/uploads/property-media/panoramas360/", `/uploads/property-media/panoramas360/viewer/${VIEWER_WIDTH}/`)
      .replace(/\.[^./?#]+(?=($|[?#]))/, ".jpg");
  }
  return url;
}

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("No se pudo crear el shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? "No se pudo compilar el shader.");
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext) {
  const program = gl.createProgram();
  if (!program) throw new Error("No se pudo crear el programa WebGL.");
  gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vertexShaderSource));
  gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? "No se pudo iniciar WebGL.");
  }
  return program;
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getScenePosition(index: number, total: number, panorama?: PropertyPanoramaItem) {
  if (panorama && (panorama.positionX !== 0 || panorama.positionY !== 0 || panorama.positionZ !== 0)) {
    return {
      x: Math.max(10, Math.min(90, 50 + panorama.positionX * 6)),
      y: Math.max(12, Math.min(88, 50 + panorama.positionY * 6)),
      rotation: panorama.positionZ * 2,
    };
  }

  const columns = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(total))));
  const row = Math.floor(index / columns);
  const column = index % columns;
  const offset = row % 2 === 0 ? 0 : 0.5;

  return {
    x: 18 + ((column + offset) / Math.max(columns - 0.5, 1)) * 64,
    y: 24 + row * 22,
    rotation: (column - row) * 4,
  };
}

function getVisibleHotspotIndexes(currentIndex: number, panoramas: PropertyPanoramaItem[]) {
  const total = panoramas.length;
  if (total <= 1) return [];

  const connectedIndexes = panoramas[currentIndex]?.connections
    .map((id) => panoramas.findIndex((panorama) => panorama.id === id))
    .filter((index) => index >= 0 && index !== currentIndex);

  if (connectedIndexes && connectedIndexes.length > 0) {
    return [...new Set(connectedIndexes)].slice(0, 3);
  }

  const previous = (currentIndex - 1 + total) % total;
  const next = (currentIndex + 1) % total;
  const far = (currentIndex + 2) % total;
  return [...new Set([previous, next, far])].filter((index) => index !== currentIndex).slice(0, 3);
}

function getHotspotPosition(slot: number, count: number) {
  const presets = [
    [{ left: 50, top: 62 }],
    [
      { left: 42, top: 64 },
      { left: 58, top: 61 },
    ],
    [
      { left: 36, top: 66 },
      { left: 50, top: 60 },
      { left: 64, top: 66 },
    ],
  ];

  return presets[Math.max(0, Math.min(count - 1, presets.length - 1))][slot];
}

export function PanoramaViewer({
  panoramas,
  className,
  showSceneNavigation = true,
  immersiveControls = true,
}: PanoramaViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef({ yaw: 0, pitch: 0, fov: 90 });
  const renderRef = useRef<() => void>(() => {});
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [mode, setMode] = useState<"walkthrough" | "dollhouse">("walkthrough");
  const [isLoading, setIsLoading] = useState(true);
  const [viewerError, setViewerError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const panorama = panoramas[currentSceneIndex];
    if (!canvas || !panorama) return;

    let disposed = false;
    let animationFrame = 0;
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    viewRef.current = {
      yaw: degreesToRadians(panorama.initialYaw || 0),
      pitch: degreesToRadians(panorama.initialPitch || 0),
      fov: panorama.initialHfov || 90,
    };

    setIsLoading(true);
    setViewerError(null);

    const gl = canvas.getContext("webgl", { antialias: true, preserveDrawingBuffer: false });
    if (!gl) {
      setIsLoading(false);
      setViewerError("Este navegador no tiene WebGL disponible.");
      return;
    }
    const canvasElement = canvas;
    const glContext = gl;

    let program: WebGLProgram | null = null;
    let texture: WebGLTexture | null = null;
    let buffer: WebGLBuffer | null = null;
    let resizeObserver: ResizeObserver | null = null;

    function render() {
      if (disposed || !program || !texture || !buffer) return;

      const rect = canvasElement.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));
      if (canvasElement.width !== width || canvasElement.height !== height) {
        canvasElement.width = width;
        canvasElement.height = height;
      }

      glContext.viewport(0, 0, canvasElement.width, canvasElement.height);
      glContext.clearColor(0, 0, 0, 1);
      glContext.clear(glContext.COLOR_BUFFER_BIT);
      glContext.useProgram(program);

      const positionLocation = glContext.getAttribLocation(program, "a_position");
      glContext.bindBuffer(glContext.ARRAY_BUFFER, buffer);
      glContext.enableVertexAttribArray(positionLocation);
      glContext.vertexAttribPointer(positionLocation, 2, glContext.FLOAT, false, 0, 0);

      glContext.activeTexture(glContext.TEXTURE0);
      glContext.bindTexture(glContext.TEXTURE_2D, texture);
      glContext.uniform1i(glContext.getUniformLocation(program, "u_texture"), 0);
      glContext.uniform1f(glContext.getUniformLocation(program, "u_yaw"), viewRef.current.yaw);
      glContext.uniform1f(glContext.getUniformLocation(program, "u_pitch"), viewRef.current.pitch);
      glContext.uniform1f(glContext.getUniformLocation(program, "u_fov"), viewRef.current.fov);
      glContext.uniform1f(glContext.getUniformLocation(program, "u_aspect"), canvasElement.width / canvasElement.height);
      glContext.drawArrays(glContext.TRIANGLES, 0, 6);
    }

    function scheduleRender() {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(render);
    }
    renderRef.current = scheduleRender;

    function onPointerDown(event: PointerEvent) {
      isDragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      canvasElement.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event: PointerEvent) {
      if (!isDragging) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      viewRef.current.yaw += dx * 0.004;
      viewRef.current.pitch = Math.max(-1.35, Math.min(1.35, viewRef.current.pitch + dy * 0.004));
      scheduleRender();
    }

    function onPointerUp(event: PointerEvent) {
      isDragging = false;
      if (canvasElement.hasPointerCapture(event.pointerId)) {
        canvasElement.releasePointerCapture(event.pointerId);
      }
    }

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      viewRef.current.fov = Math.max(45, Math.min(115, viewRef.current.fov + event.deltaY * 0.03));
      scheduleRender();
    }

    try {
      program = createProgram(glContext);
      buffer = glContext.createBuffer();
      if (!buffer) throw new Error("No se pudo crear el buffer WebGL.");
      glContext.bindBuffer(glContext.ARRAY_BUFFER, buffer);
      glContext.bufferData(
        glContext.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        glContext.STATIC_DRAW,
      );

      const image = new Image();
      image.onload = () => {
        if (disposed) return;
        texture = glContext.createTexture();
        if (!texture) {
          setViewerError("No se pudo crear la textura 360.");
          setIsLoading(false);
          return;
        }
        glContext.bindTexture(glContext.TEXTURE_2D, texture);
        glContext.pixelStorei(glContext.UNPACK_FLIP_Y_WEBGL, 0);
        glContext.texImage2D(glContext.TEXTURE_2D, 0, glContext.RGBA, glContext.RGBA, glContext.UNSIGNED_BYTE, image);
        glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_MIN_FILTER, glContext.LINEAR);
        glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_MAG_FILTER, glContext.LINEAR);
        glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_WRAP_S, glContext.CLAMP_TO_EDGE);
        glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_WRAP_T, glContext.CLAMP_TO_EDGE);

        resizeObserver = new ResizeObserver(scheduleRender);
        resizeObserver.observe(canvasElement);
        canvasElement.addEventListener("pointerdown", onPointerDown);
        canvasElement.addEventListener("pointermove", onPointerMove);
        canvasElement.addEventListener("pointerup", onPointerUp);
        canvasElement.addEventListener("pointercancel", onPointerUp);
        canvasElement.addEventListener("wheel", onWheel, { passive: false });
        setIsLoading(false);
        scheduleRender();
      };
      image.onerror = () => {
        if (disposed) return;
        setIsLoading(false);
        setViewerError("No se pudo cargar la imagen optimizada del tour 360.");
      };
      image.src = getViewerPanoramaUrl(panorama.url);
    } catch (error) {
      console.error("[panorama-viewer] Error:", error);
      setIsLoading(false);
      setViewerError("No se pudo iniciar el visor 360.");
    }

    return () => {
      disposed = true;
      renderRef.current = () => {};
      cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      canvasElement.removeEventListener("pointerdown", onPointerDown);
      canvasElement.removeEventListener("pointermove", onPointerMove);
      canvasElement.removeEventListener("pointerup", onPointerUp);
      canvasElement.removeEventListener("pointercancel", onPointerUp);
      canvasElement.removeEventListener("wheel", onWheel);
      if (texture) glContext.deleteTexture(texture);
      if (buffer) glContext.deleteBuffer(buffer);
      if (program) glContext.deleteProgram(program);
    };
  }, [currentSceneIndex, panoramas]);

  if (panoramas.length === 0) {
    return null;
  }

  const currentPanorama = panoramas[currentSceneIndex] ?? panoramas[0];
  const visibleHotspotIndexes = getVisibleHotspotIndexes(currentSceneIndex, panoramas);

  function adjustView(update: (view: typeof viewRef.current) => void) {
    update(viewRef.current);
    renderRef.current();
  }

  function selectScene(index: number) {
    setCurrentSceneIndex(index);
    setMode("walkthrough");
  }

  return (
    <div className={cn("flex w-full flex-col gap-3", className)}>
      <div className="relative h-[420px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-sm">
        <canvas
          ref={canvasRef}
          className={cn(
            "h-full w-full cursor-grab touch-none active:cursor-grabbing",
            mode === "dollhouse" && "opacity-0",
          )}
        />

        {mode === "dollhouse" && (
          <div className="absolute inset-0 z-10 overflow-hidden bg-[#07090d]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.14),transparent_48%)]" />
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/55 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/75 to-transparent" />
            <div
              className="absolute left-1/2 top-1/2 h-[min(58vw,420px)] w-[min(72vw,640px)] -translate-x-1/2 -translate-y-1/2"
              style={{ perspective: "900px" }}
            >
              <div
                className="relative h-full w-full"
                style={{ transform: "rotateX(58deg) rotateZ(-18deg)", transformStyle: "preserve-3d" }}
              >
                {panoramas.map((pano, idx) => {
                  const position = getScenePosition(idx, panoramas.length, pano);
                  const isActive = idx === currentSceneIndex;
                  return (
                    <button
                      key={pano.id}
                      type="button"
                      onClick={() => selectScene(idx)}
                      className={cn(
                        "absolute h-28 w-40 overflow-hidden rounded-md border bg-slate-900 text-left shadow-2xl transition duration-300 hover:z-20 hover:scale-105",
                        isActive ? "z-20 border-brand-300 ring-2 ring-brand-400/60" : "border-white/20 opacity-80",
                      )}
                      style={{
                        left: `${position.x}%`,
                        top: `${position.y}%`,
                        transform: `translate(-50%, -50%) rotate(${position.rotation}deg)`,
                      }}
                      title={pano.label ?? `Escena ${idx + 1}`}
                    >
                      <img src={pano.url} alt={pano.label ?? `Escena ${idx + 1}`} className="h-full w-full object-cover" />
                      <span className="absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400 text-[10px] font-bold text-slate-950">
                        {idx + 1}
                      </span>
                    </button>
                  );
                })}
                {panoramas.length > 1 && (
                  <div className="absolute left-[18%] top-[24%] h-[2px] w-[68%] bg-cyan-300/35 shadow-[0_0_18px_rgba(103,232,249,0.45)]" />
                )}
              </div>
            </div>
          </div>
        )}

        {!viewerError && immersiveControls && (
          <div className="absolute left-4 top-4 z-30 flex items-center gap-2 rounded-full border border-white/15 bg-black/45 p-1 text-white shadow-sm backdrop-blur">
            <button
              type="button"
              onClick={() => setMode("walkthrough")}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition",
                mode === "walkthrough" ? "bg-white text-slate-950" : "text-white/70 hover:bg-white/10 hover:text-white",
              )}
              title="Recorrido 360"
            >
              <Footprints className="h-3.5 w-3.5" />
              Tour
            </button>
            <button
              type="button"
              onClick={() => setMode("dollhouse")}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition",
                mode === "dollhouse" ? "bg-white text-slate-950" : "text-white/70 hover:bg-white/10 hover:text-white",
              )}
              title="Vista dollhouse"
            >
              <Box className="h-3.5 w-3.5" />
              Dollhouse
            </button>
          </div>
        )}

        {!viewerError && mode === "walkthrough" && (
          <>
            {visibleHotspotIndexes.map((sceneIndex, slot) => {
              const position = getHotspotPosition(slot, visibleHotspotIndexes.length);
              const pano = panoramas[sceneIndex];
              const isNext = sceneIndex === (currentSceneIndex + 1) % panoramas.length;
              return (
                <button
                  key={pano.id}
                  type="button"
                  onClick={() => selectScene(sceneIndex)}
                  className="group absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 text-white"
                  style={{ left: `${position.left}%`, top: `${position.top}%` }}
                  title={pano.label ?? `Ir a escena ${sceneIndex + 1}`}
                >
                  <span
                    className={cn(
                      "flex h-16 w-16 items-center justify-center rounded-full border shadow-[0_0_30px_rgba(255,255,255,0.35)] backdrop-blur transition group-hover:scale-110",
                      isNext ? "border-brand-200 bg-brand-500/35" : "border-white/50 bg-white/15",
                    )}
                  >
                    <span className="h-7 w-7 rounded-full border-2 border-white/85 bg-white/20" />
                  </span>
                  <span className="max-w-28 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold leading-tight opacity-0 backdrop-blur transition group-hover:opacity-100">
                    {pano.label ?? `Escena ${sceneIndex + 1}`}
                  </span>
                </button>
              );
            })}
          </>
        )}

        {!viewerError && immersiveControls && mode === "walkthrough" && panoramas.length > 1 && (
          <div className="absolute bottom-24 left-4 z-30 hidden items-center gap-2 rounded-full border border-white/15 bg-black/45 p-1 text-white shadow-sm backdrop-blur sm:flex">
            <button
              type="button"
              onClick={() => selectScene((currentSceneIndex - 1 + panoramas.length) % panoramas.length)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/75 transition hover:bg-white/10 hover:text-white"
              title="Escena anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-12 text-center text-xs font-semibold text-white/70">
              {currentSceneIndex + 1}/{panoramas.length}
            </span>
            <button
              type="button"
              onClick={() => selectScene((currentSceneIndex + 1) % panoramas.length)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/75 transition hover:bg-white/10 hover:text-white"
              title="Escena siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {!viewerError && immersiveControls && panoramas.length > 1 && (
          <div className="absolute bottom-24 right-4 z-30 hidden h-28 w-40 overflow-hidden rounded-lg border border-white/15 bg-black/45 shadow-2xl backdrop-blur md:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.2),transparent_58%)]" />
            <div className="absolute left-3 top-2 text-[10px] font-semibold uppercase tracking-wide text-white/55">
              Plano
            </div>
            <div className="absolute inset-x-4 bottom-4 top-7">
              {panoramas.map((pano, idx) => {
                const position = getScenePosition(idx, panoramas.length, pano);
                const isActive = idx === currentSceneIndex;
                return (
                  <button
                    key={pano.id}
                    type="button"
                    onClick={() => selectScene(idx)}
                    className={cn(
                      "absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border transition hover:scale-125",
                      isActive
                        ? "border-white bg-brand-400 shadow-[0_0_14px_rgba(96,165,250,0.9)]"
                        : "border-white/45 bg-white/35",
                    )}
                    style={{ left: `${position.x}%`, top: `${Math.min(position.y, 88)}%` }}
                    title={pano.label ?? `Escena ${idx + 1}`}
                  />
                );
              })}
              {panoramas.length > 1 && (
                <div className="absolute left-[18%] top-[34%] h-px w-[66%] rotate-6 bg-white/20" />
              )}
            </div>
          </div>
        )}

        {!viewerError && (
          <div className="absolute right-4 top-4 z-30 flex gap-2">
            <button
              type="button"
              onClick={() => adjustView((view) => { view.yaw -= Math.PI / 8; })}
              disabled={mode === "dollhouse"}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/45 text-white shadow-sm backdrop-blur transition hover:bg-black/65"
              title="Girar a la izquierda"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => adjustView((view) => { view.yaw += Math.PI / 8; })}
              disabled={mode === "dollhouse"}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/45 text-white shadow-sm backdrop-blur transition hover:bg-black/65"
              title="Girar a la derecha"
            >
              <RotateCw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => adjustView((view) => { view.fov = Math.max(45, view.fov - 10); })}
              disabled={mode === "dollhouse"}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/45 text-white shadow-sm backdrop-blur transition hover:bg-black/65"
              title="Acercar"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => adjustView((view) => { view.fov = Math.min(115, view.fov + 10); })}
              disabled={mode === "dollhouse"}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/45 text-white shadow-sm backdrop-blur transition hover:bg-black/65"
              title="Alejar"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950 text-white">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        )}

        {viewerError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950 p-6 text-center text-white">
            <div className="max-w-sm">
              <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-300" />
              <p className="text-sm font-semibold">No se pudo visualizar el tour 360°.</p>
              <p className="mt-2 text-xs text-white/55">{viewerError}</p>
              {currentPanorama && (
                <img
                  src={currentPanorama.url}
                  alt={currentPanorama.label ?? "Escena 360°"}
                  className="mt-4 max-h-40 w-full rounded-md object-cover"
                />
              )}
            </div>
          </div>
        )}

        {immersiveControls && (
          <div className="absolute bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-black/55 p-3 text-white backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="hidden shrink-0 items-center gap-2 text-xs font-semibold text-white/60 sm:flex">
                <Layers className="h-4 w-4" />
                {mode === "dollhouse" ? "Vista espacial" : currentPanorama?.label ?? `Escena ${currentSceneIndex + 1}`}
              </div>
              <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {panoramas.map((pano, idx) => (
                  <button
                    key={pano.id}
                    type="button"
                    onClick={() => selectScene(idx)}
                    className={cn(
                      "relative h-16 w-28 shrink-0 overflow-hidden rounded-md border bg-white/10 transition hover:border-white/75",
                      idx === currentSceneIndex ? "border-brand-300 ring-2 ring-brand-400/60" : "border-white/20",
                    )}
                    title={pano.label ?? `Escena ${idx + 1}`}
                  >
                    <img src={pano.url} alt={pano.label ?? `Escena ${idx + 1}`} className="h-full w-full object-cover" />
                    <span className="absolute left-1 top-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {idx + 1}
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setMode(mode === "dollhouse" ? "walkthrough" : "dollhouse")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
                title={mode === "dollhouse" ? "Volver al tour" : "Abrir dollhouse"}
              >
                {mode === "dollhouse" ? <Footprints className="h-4 w-4" /> : <Map className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {!immersiveControls && showSceneNavigation && panoramas.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 pt-1" style={{ scrollbarWidth: "none" }}>
          {panoramas.map((pano, idx) => (
            <button
              key={pano.id}
              onClick={() => setCurrentSceneIndex(idx)}
              className={cn(
                "whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium shadow-sm transition-colors",
                idx === currentSceneIndex
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              {pano.label || `Escena ${idx + 1}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
