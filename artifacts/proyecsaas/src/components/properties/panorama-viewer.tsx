'use client'
import { useEffect, useRef } from 'react'

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
    <div ref={containerRef} className={className}></div>
  )
}
