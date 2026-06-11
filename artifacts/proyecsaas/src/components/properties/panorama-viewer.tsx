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

function refreshViewerLayout(viewer: any) {
  window.setTimeout(() => {
    try {
      viewer?.resize?.()
    } catch {}
  }, 80)
}

export function PanoramaViewer({ 
  scenes, 
  className = "h-full w-full bg-black",
  isEditingHotspot = false,
  onCoordsSelected
}: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)
  const hotspotStyleInjected = useRef(false)
  const [activeSceneIndex, setActiveSceneIndex] = useState(0)
  const [sceneTypes, setSceneTypes] = useState<Record<number, SceneProjectionType>>({})

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
    const detectTypes = async () => {
      const types: Record<number, SceneProjectionType> = {}
      await Promise.all(
        viewerScenes.map((scene, i) => {
          return new Promise<void>((resolve) => {
            const img = new Image()
            img.onload = () => {
              if (cancelled) return resolve()
              const aspect = img.width / img.height
              // Las 360 reales suelen estar cerca de 2:1. Recortes o panoramicas de celular usan vista parcial.
              types[i] = aspect >= 1.85 && aspect <= 2.22 ? 'equirectangular' : 'cylindrical'
              resolve()
            }
            img.onerror = () => {
              types[i] = 'equirectangular'
              resolve()
            }
            img.src = scene.sourceUrl
          })
        })
      )
      if (!cancelled) {
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
            panorama: viewerScenes[0].sourceUrl,
            autoLoad: true,
            hfov: projectionConfig.hfov ?? 100,
            showControls: true,
            mouseZoom: true,
            gyroscope: true,
          })
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
              panorama: scene.sourceUrl,
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
      if (containerRef.current) {
        containerRef.current.removeEventListener('click', handleContainerClick);
      }
      if (viewerRef.current) {
        try { viewerRef.current.destroy() } catch {}
        viewerRef.current = null
      }
    }
  }, [scenes, sceneTypes, isEditingHotspot, onCoordsSelected])

  if (safeScenes.length === 0) return null

  return (
    <div className={`relative flex min-h-[360px] flex-col bg-black ${className}`}>
      <div ref={containerRef} className="min-h-[360px] flex-1 w-full"></div>
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
