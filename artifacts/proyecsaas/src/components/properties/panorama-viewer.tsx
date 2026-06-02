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
  const [sceneTypes, setSceneTypes] = useState<Record<number, 'equirectangular' | 'cylindrical'>>({})

  const safeScenes = scenes || []

  useEffect(() => {
    setActiveSceneIndex(0)
  }, [scenes])

  // Detectar la relación de aspecto de cada escena para elegir la proyección óptima
  useEffect(() => {
    if (safeScenes.length === 0) return

    let cancelled = false
    const detectTypes = async () => {
      const types: Record<number, 'equirectangular' | 'cylindrical'> = {}
      await Promise.all(
        safeScenes.map((scene, i) => {
          return new Promise<void>((resolve) => {
            const img = new Image()
            img.onload = () => {
              if (cancelled) return resolve()
              const aspect = img.width / img.height
              // Panorámicas móviles clásicas tienen aspect > 2.2. Equirectangulares son estrictamente 2:1 (aspect 2.0).
              types[i] = aspect > 2.2 ? 'cylindrical' : 'equirectangular'
              resolve()
            }
            img.onerror = () => {
              types[i] = 'equirectangular'
              resolve()
            }
            img.src = scene.url
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
    const isTypesLoaded = safeScenes.length === 0 || Object.keys(sceneTypes).length === safeScenes.length
    if (!containerRef.current || safeScenes.length === 0 || !isTypesLoaded) return

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

    const script = document.createElement('script')
    script.src = '/pannellum.js'
    script.onload = () => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = '/pannellum.css'
      document.head.appendChild(link)

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
        if (safeScenes.length === 1) {
          // @ts-ignore
          viewerRef.current = window.pannellum.viewer(containerRef.current, {
            type: sceneTypes[0] || 'equirectangular',
            panorama: safeScenes[0].url,
            autoLoad: true,
            hfov: 100,
            showControls: true,
            mouseZoom: true,
            gyroscope: true,
          })
        } else {
          const scenesConfig: Record<string, any> = {}
          safeScenes.forEach((scene, i) => {
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
              type: sceneTypes[i] || 'equirectangular',
              panorama: scene.url,
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
    
    script.onerror = () => {
      console.error("No se pudo cargar el visor 360° local de Pannellum")
    }
    
    document.head.appendChild(script)

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
    <div className={`relative flex flex-col bg-black ${className}`}>
      <div ref={containerRef} className="flex-1 w-full min-h-0"></div>
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
