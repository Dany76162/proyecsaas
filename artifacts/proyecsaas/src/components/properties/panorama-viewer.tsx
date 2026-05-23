'use client'
import { useEffect, useRef, useState } from 'react'

type Scene = { url: string; label: string }

type PanoramaViewerProps = {
  scenes: Scene[]
  className?: string
  immersiveControls?: boolean
  variant?: string
  floorPlanUrl?: string | null
}

export function PanoramaViewer({ scenes, className = "h-full w-full bg-black" }: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)
  const [activeSceneIndex, setActiveSceneIndex] = useState(0)

  useEffect(() => {
    setActiveSceneIndex(0)
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
    if (!containerRef.current || scenes.length === 0) return

    // Limpiar instancia anterior
    if (viewerRef.current) {
      try { viewerRef.current.destroy() } catch {}
      viewerRef.current = null
      containerRef.current.innerHTML = ''
    }

    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js'
    script.onload = () => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css'
      document.head.appendChild(link)

      if (!containerRef.current) return
      
      try {
        if (scenes.length === 1) {
          // @ts-ignore
          viewerRef.current = window.pannellum.viewer(containerRef.current, {
            type: 'equirectangular',
            panorama: scenes[0].url,
            autoLoad: true,
            hfov: 100,
            showControls: true,
            mouseZoom: true,
            gyroscope: true,
          })
        } else {
          const scenesConfig: Record<string, any> = {}
          scenes.forEach((scene, i) => {
            scenesConfig[`scene-${i}`] = {
              type: 'equirectangular',
              panorama: scene.url,
              title: scene.label,
              autoLoad: true,
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
      console.error("No se pudo cargar el script de Pannellum desde CDN")
    }
    
    document.head.appendChild(script)

    return () => {
      if (viewerRef.current) {
        try { viewerRef.current.destroy() } catch {}
        viewerRef.current = null
      }
    }
  }, [scenes])

  if (scenes.length === 0) return null

  return (
    <div className={`relative flex flex-col bg-black ${className}`}>
      <div ref={containerRef} className="flex-1 w-full min-h-0"></div>
      {scenes.length > 1 && (
        <div className="bg-slate-950/90 border-t border-white/10 px-4 py-3 flex justify-center gap-2 overflow-x-auto scrollbar-none">
          {scenes.map((scene, i) => (
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
