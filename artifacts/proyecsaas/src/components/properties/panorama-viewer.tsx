"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, RotateCcw, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import type { PropertyPanoramaItem } from "@/modules/properties/types";

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(" ");

interface PanoramaViewerProps {
  panoramas: PropertyPanoramaItem[];
  className?: string;
  showSceneNavigation?: boolean;
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

export function PanoramaViewer({ panoramas, className, showSceneNavigation = true }: PanoramaViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef({ yaw: 0, pitch: 0, fov: 90 });
  const renderRef = useRef<() => void>(() => {});
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
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

  function adjustView(update: (view: typeof viewRef.current) => void) {
    update(viewRef.current);
    renderRef.current();
  }

  return (
    <div className={cn("flex w-full flex-col gap-3", className)}>
      <div className="relative h-[420px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-sm">
        <canvas ref={canvasRef} className="h-full w-full cursor-grab touch-none active:cursor-grabbing" />

        {!viewerError && (
          <div className="absolute right-4 top-4 z-20 flex gap-2">
            <button
              type="button"
              onClick={() => adjustView((view) => { view.yaw -= Math.PI / 8; })}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/45 text-white shadow-sm backdrop-blur transition hover:bg-black/65"
              title="Girar a la izquierda"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => adjustView((view) => { view.yaw += Math.PI / 8; })}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/45 text-white shadow-sm backdrop-blur transition hover:bg-black/65"
              title="Girar a la derecha"
            >
              <RotateCw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => adjustView((view) => { view.fov = Math.max(45, view.fov - 10); })}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/45 text-white shadow-sm backdrop-blur transition hover:bg-black/65"
              title="Acercar"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => adjustView((view) => { view.fov = Math.min(115, view.fov + 10); })}
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
      </div>

      {showSceneNavigation && panoramas.length > 1 && (
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
