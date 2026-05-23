'use client'
import { useEffect, useRef } from 'react'

type Scene = { url: string; label: string }

type PanoramaViewerProps = {
  scenes: Scene[]
}

export function PanoramaViewer({ scenes }: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || scenes.length === 0) return

    // Import dinámico para evitar SSR crash
    import('pannellum').then((pannellum) => {
      if (!containerRef.current) return

      // Limpiar instancia anterior si existe
      if (viewerRef.current) {
        try { viewerRef.current.destroy() } catch {}
        viewerRef.current = null
      }

      if (scenes.length === 1) {
        // Una sola escena
        viewerRef.current = pannellum.viewer(containerRef.current, {
          type: 'equirectangular',
          panorama: scenes[0].url,
          autoLoad: true,
          hfov: 100,
          showControls: true,
          mouseZoom: true,
          gyroscope: true,
        })
      } else {
        // Múltiples escenas
        const scenesConfig: Record<string, any> = {}
        scenes.forEach((scene, i) => {
          scenesConfig[`scene-${i}`] = {
            type: 'equirectangular',
            panorama: scene.url,
            title: scene.label,
            autoLoad: true,
          }
        })
        viewerRef.current = pannellum.viewer(containerRef.current, {
          default: { firstScene: 'scene-0' },
          scenes: scenesConfig,
          showControls: true,
          mouseZoom: true,
          gyroscope: true,
        })
      }
    })

    return () => {
      // Cleanup al desmontar
      if (viewerRef.current) {
        try { viewerRef.current.destroy() } catch {}
        viewerRef.current = null
      }
    }
  }, [scenes])

  if (scenes.length === 0) return null

  return (
    <div ref={containerRef} className="h-full w-full bg-black"></div>
  )
}
