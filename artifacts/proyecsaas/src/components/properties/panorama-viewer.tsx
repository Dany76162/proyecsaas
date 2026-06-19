'use client'
import { useEffect, useRef, useState } from 'react'

type Scene = { 
  url: string; 
  label: string;
  hotspotPitch?: number | null;
  hotspotYaw?: number | null;
}

type PanoramaViewerProps = {
  scenes: Scene[]
  className?: string
  immersiveControls?: boolean
  variant?: string
  floorPlanUrl?: string | null
  isEditingHotspot?: boolean
  onCoordsSelected?: (pitch: number, yaw: number) => void
  // 'public' = ficha pública del catálogo (comprador sin sesión): el fallback de
  // error NO muestra el botón "Abrir imagen 360°" (esa URL puede redirigir a
  // login). 'admin' (default) = panel interno: conserva el botón para operadores.
  audience?: 'public' | 'admin'
}

type SceneProjectionType = 'equirectangular' | 'cylindrical'
type ProjectionConfig = {
  type: 'equirectangular'
  haov?: number
  vaov?: number
  vOffset?: number
  minPitch?: number
  maxPitch?: number
  pitch?: number
  hfov?: number
}

function getPanoramaSourceUrl(url: string) {
  if (!url || url.startsWith('/') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url
  }

  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'https:' && parsed.hostname.endsWith('.r2.dev')) {
      return `/api/storage/view?url=${encodeURIComponent(url)}`
    }
  } catch {
    return url
  }

  return url
}

// Límite de tamaño de textura WebGL del dispositivo. En celulares suele ser
// 4096px (a veces 2048), bastante menor que en escritorio. Pannellum tira un
// "webgl size error" (pantalla negra) si el panorama lo supera.
let cachedMaxTextureSize: number | null = null
function getMaxTextureSize(): number {
  if (cachedMaxTextureSize !== null) return cachedMaxTextureSize
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
    if (gl) {
      cachedMaxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number
    }
  } catch {}
  if (!cachedMaxTextureSize || cachedMaxTextureSize < 1024) cachedMaxTextureSize = 4096
  return cachedMaxTextureSize
}

// Reescala una imagen equirectangular para que entre en el límite del dispositivo.
// Pannellum parte la imagen al medio, así que el límite efectivo es
// max(W/2, H) <= maxTex. Devuelve un dataURL reescalado, o null si no hace falta
// (ya entra) o si no se puede (canvas "tainted" por falta de CORS → se usa la original).
async function downscaleToFit(
  url: string,
  width: number,
  height: number,
  maxTex: number,
): Promise<string | null> {
  const scale = Math.min(1, (2 * maxTex) / width, maxTex / height)
  // Solo reescalamos si el excedente es real (>2%). Evita re-comprimir una imagen
  // que apenas supera el límite y degradarla sin necesidad.
  if (scale >= 0.98) return null
  const targetW = Math.round(width * scale)
  const targetH = Math.round(height * scale)
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = targetW
        canvas.height = targetH
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(null)
        // Resampleo de alta calidad para no perder nitidez al achicar.
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, targetW, targetH)
        // JPEG 0.95: el 360° hace "zoom" a la imagen, así que conviene calidad alta.
        resolve(canvas.toDataURL('image/jpeg', 0.95))
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

// En dispositivos con límite de textura WebGL bajo (mobile) preferimos una
// fuente OPTIMIZADA server-side en vez de procesar la imagen gigante por canvas
// en el celular: el proxy /api/storage/view recibe parámetros 'w' y 'q', y
// reescala usando sharp directamente en el servidor. Esto evita llamar a
// /_next/image (que causa loops/deadlocks HTTP internos en contenedores como Railway).
// Devuelve null si la URL no es del proxy.
function buildOptimizedPanoramaSource(sourceUrl: string, width = 3840, quality = 85): string | null {
  if (!sourceUrl) return null
  if (sourceUrl.startsWith('/api/storage/view')) {
    const separator = sourceUrl.includes('?') ? '&' : '?'
    return `${sourceUrl}${separator}w=${width}&q=${quality}`
  }
  return null
}

function getPannellumProjectionConfig(sceneType: SceneProjectionType | undefined): ProjectionConfig {
  if (sceneType === 'cylindrical') {
    return {
      type: 'equirectangular',
      haov: 160,
      vaov: 55,
      vOffset: 0,
      minPitch: -25,
      maxPitch: 25,
      pitch: 0,
      hfov: 75,
    }
  }

  return { type: 'equirectangular' }
}

// Fuerza el reajuste del canvas WebGL al tamaño real del contenedor. Si solo se
// llama una vez al inicio, el canvas puede quedar con resolución chica (estirada
// y borrosa) cuando el layout todavía no se asentó. Reintentamos varias veces.
function refreshViewerLayout(viewer: any) {
  const doResize = () => {
    try {
      viewer?.resize?.()
    } catch {}
  }
  requestAnimationFrame(doResize)
  window.setTimeout(doResize, 120)
  window.setTimeout(doResize, 400)
  window.setTimeout(doResize, 900)
}

export function PanoramaViewer({
  scenes,
  className = "h-full w-full bg-black",
  isEditingHotspot = false,
  onCoordsSelected,
  audience = 'admin'
}: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const hotspotStyleInjected = useRef(false)
  const [activeSceneIndex, setActiveSceneIndex] = useState(0)
  const [sceneTypes, setSceneTypes] = useState<Record<number, SceneProjectionType>>({})
  // Fuentes ya resueltas (reescaladas si la original era muy grande para el dispositivo).
  const [resolvedSources, setResolvedSources] = useState<Record<number, string>>({})
  // Si Pannellum no puede renderizar (imagen demasiado grande, WebGL no disponible),
  // mostramos un fallback legible en vez de una pantalla negra.
  const [viewerError, setViewerError] = useState(false)

  const safeScenes = scenes || []
  const viewerScenes = safeScenes.map((scene) => ({
    ...scene,
    sourceUrl: getPanoramaSourceUrl(scene.url),
  }))

  useEffect(() => {
    setActiveSceneIndex(0)
  }, [scenes])

  // Detectar la relación de aspecto de cada escena para elegir la proyección óptima
  useEffect(() => {
    if (safeScenes.length === 0) return

    let cancelled = false
    const maxTex = getMaxTextureSize()
    const detectTypes = async () => {
      const types: Record<number, SceneProjectionType> = {}
      const sources: Record<number, string> = {}
      // Mide ancho/alto de una imagen (sin procesarla por canvas). null si falla.
      const measureImage = (url: string) =>
        new Promise<{ w: number; h: number } | null>((resolve) => {
          const im = new Image()
          im.onload = () => resolve({ w: im.width, h: im.height })
          im.onerror = () => resolve(null)
          im.src = url
        })

      // Las 360 reales suelen estar cerca de 2:1. Recortes/panorámicas de celular usan vista parcial.
      const classify = (w: number, h: number): SceneProjectionType =>
        w / h >= 1.85 && w / h <= 2.22 ? 'equirectangular' : 'cylindrical'

      await Promise.all(
        viewerScenes.map((scene, i) =>
          (async () => {
            if (cancelled) return

            // En dispositivos de límite bajo (mobile, maxTex <= 4096) pedimos la
            // imagen ya REESCALADA al servidor (/_next/image → sharp): el celular
            // nunca necesita cargar el panorama gigante en memoria.
            // Ancho adaptado al límite real: si el teléfono tiene maxTex=2048 pedimos
            // w=2048, si no 3840. Ambos son deviceSizes válidos por defecto en Next.
            if (maxTex <= 4096) {
              const optWidth = maxTex <= 2048 ? 2048 : 3840
              const optimizedUrl = buildOptimizedPanoramaSource(scene.sourceUrl, optWidth)
              if (optimizedUrl) {
                // Medimos desde la URL optimizada (la imagen ya viene pequeña del server).
                const dim = await measureImage(optimizedUrl)
                if (cancelled) return
                if (dim) {
                  types[i] = classify(dim.w, dim.h)
                  sources[i] = optimizedUrl
                  return // ✅ Caso normal mobile: listo, sin tener que tocar el gigante.
                }
                // La URL optimizada falló (ej: Next no pudo procesar) → fallback abajo.
              }
            }

            // Desktop (maxTex alto) o fallback mobile si la optimizada no funcionó:
            // medir el original y reescalar por canvas si supera el límite.
            const dim = await measureImage(scene.sourceUrl)
            if (cancelled) return
            if (!dim) {
              types[i] = 'equirectangular'
              return
            }
            types[i] = classify(dim.w, dim.h)
            if (types[i] === 'equirectangular' && Math.max(dim.w / 2, dim.h) > maxTex) {
              const down = await downscaleToFit(scene.sourceUrl, dim.w, dim.h, maxTex)
              if (!cancelled && down) sources[i] = down
            }
          })(),
        ),
      )
      if (!cancelled) {
        setResolvedSources(sources)
        setSceneTypes(types)
      }
    }

    detectTypes()
    return () => {
      cancelled = true
    }
  }, [scenes])

  const handleSceneChange = (index: number) => {
    setActiveSceneIndex(index)
    if (viewerRef.current && typeof viewerRef.current.loadScene === 'function') {
      try {
        viewerRef.current.loadScene(`scene-${index}`)
      } catch (err) {
        console.error("Error al cambiar de escena", err)
      }
    }
  }

  useEffect(() => {
    const isTypesLoaded = viewerScenes.length === 0 || Object.keys(sceneTypes).length === viewerScenes.length
    if (!containerRef.current || viewerScenes.length === 0 || !isTypesLoaded) return

    setViewerError(false)

    // Reajustar el canvas cuando cambie el tamaño del contenedor (rotación del
    // celular, abrir F12, panel lateral, etc.). Sin esto, si el viewer se inicializa
    // antes de que el layout tenga su tamaño final, el canvas queda con resolución
    // chica y la imagen se ve estirada/borrosa hasta que algo lo redimensione.
    if (containerRef.current && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        try {
          viewerRef.current?.resize?.()
        } catch {}
      })
      ro.observe(containerRef.current)
      resizeObserverRef.current = ro
    }

    // Limpiar instancia anterior
    if (viewerRef.current) {
      try { viewerRef.current.destroy() } catch {}
      viewerRef.current = null
      containerRef.current.innerHTML = ''
    }

    const handleContainerClick = (e: MouseEvent) => {
      if (isEditingHotspot && onCoordsSelected && viewerRef.current) {
        const coords = viewerRef.current.mouseEventToCoords(e);
        if (coords) {
          let p: number;
          let y: number;
          if (Array.isArray(coords)) {
            p = coords[0];
            y = coords[1];
          } else {
            p = coords.pitch;
            y = coords.yaw;
          }
          onCoordsSelected(p, y);
        }
      }
    };

    if (containerRef.current) {
      containerRef.current.addEventListener('click', handleContainerClick);
    }

    const initPannellum = () => {
      if (!document.querySelector('link[href="/pannellum.css"]')) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = '/pannellum.css'
        document.head.appendChild(link)
      }

      const hotspotStyle = document.createElement('style')
      hotspotStyle.textContent = `
        .pv-hotspot-scene {
          width: 52px !important;
          height: 26px !important;
          border-radius: 50% !important;
          background: rgba(255, 255, 255, 0.25) !important;
          border: 2px solid rgba(255, 255, 255, 0.85) !important;
          backdrop-filter: blur(4px) !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          box-shadow: 0 0 0 4px rgba(255,255,255,0.12) !important;
        }
        .pv-hotspot-scene:hover {
          background: rgba(255, 255, 255, 0.45) !important;
          box-shadow: 0 0 0 8px rgba(255,255,255,0.18) !important;
          transform: scale(1.15) !important;
        }
        .pv-hotspot-scene .pnlm-tooltip span {
          background: rgba(0,0,0,0.75) !important;
          border-radius: 8px !important;
          padding: 4px 10px !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          color: #fff !important;
          white-space: nowrap !important;
        }
      `
      if (!hotspotStyleInjected.current) {
        document.head.appendChild(hotspotStyle)
        hotspotStyleInjected.current = true
      }

      if (!containerRef.current) return

      try {
        if (viewerScenes.length === 1) {
          const projectionConfig = getPannellumProjectionConfig(sceneTypes[0])
          // @ts-ignore
          viewerRef.current = window.pannellum.viewer(containerRef.current, {
            ...projectionConfig,
            panorama: resolvedSources[0] ?? viewerScenes[0].sourceUrl,
            autoLoad: true,
            hfov: projectionConfig.hfov ?? 100,
            showControls: true,
            mouseZoom: true,
            gyroscope: true,
          })
          viewerRef.current.on?.('error', () => setViewerError(true))
          refreshViewerLayout(viewerRef.current)
        } else {
          const scenesConfig: Record<string, any> = {}
          viewerScenes.forEach((scene, i) => {
            const hotSpots = []

            // Hotspot hacia la escena siguiente (en el piso, usando pitch/yaw guardados o por defecto)
            if (i < safeScenes.length - 1) {
              const customPitch = typeof scene.hotspotPitch === 'number' ? scene.hotspotPitch : -30;
              const customYaw = typeof scene.hotspotYaw === 'number' ? scene.hotspotYaw : 0;
              hotSpots.push({
                pitch: customPitch,
                yaw: customYaw,
                type: 'scene',
                text: safeScenes[i + 1].label,
                sceneId: `scene-${i + 1}`,
                cssClass: 'pv-hotspot-scene',
              })
            }

            // Hotspot hacia la escena anterior (en el piso, mirando atrás)
            if (i > 0) {
              hotSpots.push({
                pitch: -30,
                yaw: 180,
                type: 'scene',
                text: safeScenes[i - 1].label,
                sceneId: `scene-${i - 1}`,
                cssClass: 'pv-hotspot-scene',
              })
            }

            scenesConfig[`scene-${i}`] = {
              ...getPannellumProjectionConfig(sceneTypes[i]),
              panorama: resolvedSources[i] ?? scene.sourceUrl,
              title: scene.label,
              autoLoad: true,
              hotSpots,
            }
          })
          // @ts-ignore
          viewerRef.current = window.pannellum.viewer(containerRef.current, {
            default: { firstScene: 'scene-0' },
            scenes: scenesConfig,
            showControls: true,
            mouseZoom: true,
            gyroscope: true,
          })
          viewerRef.current.on?.('error', () => setViewerError(true))
          refreshViewerLayout(viewerRef.current)

          // Escuchar eventos de cambio de escena internos de Pannellum
          viewerRef.current.on('scenechange', (sceneId: string) => {
            const match = sceneId.match(/scene-(\d+)/)
            if (match && match[1]) {
              setActiveSceneIndex(parseInt(match[1], 10))
            }
          })
        }
      } catch (err) {
        console.error("Error al inicializar Pannellum", err)
        setViewerError(true)
      }
    }

    // Si pannellum ya está en window (script cacheado de render anterior), inicializar directo.
    // Si el script ya fue inyectado pero todavía está cargando, reusar el evento load.
    // Solo en caso contrario inyectar el tag <script> por primera vez.
    if (typeof (window as any).pannellum !== 'undefined') {
      initPannellum()
    } else {
      const existingScript = document.querySelector('script[src="/pannellum.js"]')
      if (existingScript) {
        existingScript.addEventListener('load', initPannellum)
      } else {
        const script = document.createElement('script')
        script.src = '/pannellum.js'
        script.onload = initPannellum
        script.onerror = () => console.error('No se pudo cargar el visor 360° local de Pannellum')
        document.head.appendChild(script)
      }
    }

    return () => {
      if (resizeObserverRef.current) {
        try { resizeObserverRef.current.disconnect() } catch {}
        resizeObserverRef.current = null
      }
      if (containerRef.current) {
        containerRef.current.removeEventListener('click', handleContainerClick);
      }
      if (viewerRef.current) {
        try { viewerRef.current.destroy() } catch {}
        viewerRef.current = null
      }
    }
  }, [scenes, sceneTypes, resolvedSources, isEditingHotspot, onCoordsSelected])

  if (safeScenes.length === 0) return null

  return (
    <div className={`relative flex min-h-[360px] flex-col bg-black ${className}`}>
      <div ref={containerRef} className="min-h-[360px] flex-1 w-full"></div>

      {viewerError && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-slate-950/95 px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/10 text-2xl">🧭</div>
          <p className="max-w-xs text-sm font-semibold text-slate-300">
            El tour 360° no está disponible en este dispositivo.
          </p>
          {audience === 'public' ? (
            // Público (comprador sin sesión): NO mostramos un botón cuya URL puede
            // redirigir a login. Lo orientamos a las imágenes reales de la ficha.
            <p className="max-w-xs text-xs text-slate-500">
              Podés ver las imágenes reales de la propiedad en la pestaña “Imágenes Reales”.
            </p>
          ) : (
            <>
              <p className="max-w-xs text-xs text-slate-500">
                Puede que la imagen sea muy grande para tu celular. Probá abrirla directo:
              </p>
              <a
                href={viewerScenes[activeSceneIndex]?.sourceUrl ?? viewerScenes[0]?.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-blue-600 px-6 text-sm font-extrabold uppercase tracking-widest text-white transition active:scale-95"
              >
                Abrir imagen 360°
              </a>
            </>
          )}
        </div>
      )}
      {safeScenes.length > 1 && (
        <div className="bg-slate-950/90 border-t border-white/10 px-4 py-3 flex justify-center gap-2 overflow-x-auto scrollbar-none">
          {safeScenes.map((scene, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSceneChange(i)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition shrink-0 ${
                activeSceneIndex === i
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white/15 text-white/80 hover:bg-white/20'
              }`}
            >
              {scene.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
