'use client'
import { useState } from 'react'
import { Compass, Camera, Layers, Map as MapIcon, ChevronRight, ZoomIn, ZoomOut, RotateCw, RefreshCw } from 'lucide-react'
import { PanoramaViewer } from './panorama-viewer'
import { ImageGallery } from './image-gallery'

type Scene = { 
  url: string; 
  label: string;
  hotspotPitch?: number | null;
  hotspotYaw?: number | null;
}

type Image = {
  id: string;
  url: string;
  category: string;
  isPrimary?: boolean;
}

type UnifiedMediaViewerProps = {
  panoramas: Scene[]
  realImages: Image[]
  renderImages: Image[]
  floorPlanUrl: string | null
}

export function UnifiedMediaViewer({
  panoramas,
  realImages,
  renderImages,
  floorPlanUrl
}: UnifiedMediaViewerProps) {
  // Determinar la pestaña inicial activa
  const hasPanoramas = panoramas && panoramas.length > 0
  const hasReal = realImages && realImages.length > 0
  const hasRenders = renderImages && renderImages.length > 0
  const hasPlano = !!floorPlanUrl

  const getInitialTab = () => {
    if (hasPanoramas) return '360'
    if (hasReal) return 'real'
    if (hasRenders) return 'renders'
    if (hasPlano) return 'plano'
    return 'real'
  }

  const [activeTab, setActiveTab] = useState<'360' | 'real' | 'renders' | 'plano'>(getInitialTab())

  // Controladores interactivos para planos (Imágenes)
  const [planoScale, setPlanoScale] = useState(1)
  const [planoRotation, setPlanoRotation] = useState(0)
  const [planoPosition, setPlanoPosition] = useState({ x: 0, y: 0 })
  const [planoDragging, setPlanoDragging] = useState(false)
  const [planoDragStart, setPlanoDragStart] = useState({ x: 0, y: 0 })

  const handlePlanoZoomIn = () => setPlanoScale(prev => Math.min(prev + 0.25, 4))
  const handlePlanoZoomOut = () => setPlanoScale(prev => Math.max(prev - 0.25, 0.5))
  const handlePlanoRotate = () => setPlanoRotation(prev => (prev + 90) % 360)
  const handlePlanoReset = () => {
    setPlanoScale(1)
    setPlanoRotation(0)
    setPlanoPosition({ x: 0, y: 0 })
  }

  const handlePlanoMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setPlanoDragging(true)
    setPlanoDragStart({ x: e.clientX - planoPosition.x, y: e.clientY - planoPosition.y })
  }

  const handlePlanoMouseMove = (e: React.MouseEvent) => {
    if (!planoDragging) return
    setPlanoPosition({
      x: e.clientX - planoDragStart.x,
      y: e.clientY - planoDragStart.y
    })
  }

  const handlePlanoMouseUp = () => setPlanoDragging(false)

  const handlePlanoTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    setPlanoDragging(true)
    const touch = e.touches[0]
    setPlanoDragStart({ x: touch.clientX - planoPosition.x, y: touch.clientY - planoPosition.y })
  }

  const handlePlanoTouchMove = (e: React.TouchEvent) => {
    if (!planoDragging || e.touches.length !== 1) return
    const touch = e.touches[0]
    setPlanoPosition({
      x: touch.clientX - planoDragStart.x,
      y: touch.clientY - planoDragStart.y
    })
  }

  const tabClass = (tab: typeof activeTab, available: boolean) => {
    if (!available) return 'opacity-40 cursor-not-allowed hidden sm:inline-flex text-slate-500 px-4 py-2.5 text-xs font-bold gap-2'
    return activeTab === tab
      ? 'bg-blue-600 text-white rounded-full px-5 py-2.5 text-xs font-black shadow-lg shadow-blue-500/25 transition-all duration-300 transform scale-105 flex items-center gap-2'
      : 'bg-white/10 hover:bg-white/15 text-slate-300 rounded-full px-5 py-2.5 text-xs font-bold transition-all duration-300 hover:text-white flex items-center gap-2 border border-white/5'
  }

  return (
    <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden transition-all duration-300">
      
      {/* Tab Console Header */}
      <div className="bg-slate-950/80 backdrop-blur-md px-6 py-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-xl font-extrabold text-white flex items-center gap-2.5">
            <Layers className="h-5 w-5 text-blue-400 shrink-0" />
            Consola Multimedia Interactiva
          </h3>
          <p className="text-xs text-slate-400 font-medium">
            Navegá entre las diferentes perspectivas del inmueble usando los controles interactivos.
          </p>
        </div>

        {/* Console Navigation Tabs */}
        <div className="flex flex-wrap gap-2.5 items-center">
          {hasPanoramas && (
            <button
              onClick={() => setActiveTab('360')}
              className={tabClass('360', hasPanoramas)}
            >
              <Compass className={`h-4.5 w-4.5 ${activeTab === '360' ? 'animate-spin-slow' : ''}`} />
              <span>Tour Virtual 360°</span>
            </button>
          )}

          {hasReal && (
            <button
              onClick={() => setActiveTab('real')}
              className={tabClass('real', hasReal)}
            >
              <Camera className="h-4.5 w-4.5" />
              <span>Imágenes Reales</span>
            </button>
          )}

          {hasRenders && (
            <button
              onClick={() => setActiveTab('renders')}
              className={tabClass('renders', hasRenders)}
            >
              <Layers className="h-4.5 w-4.5" />
              <span>Renders / Proyección</span>
            </button>
          )}

          {hasPlano && (
            <button
              onClick={() => setActiveTab('plano')}
              className={tabClass('plano', hasPlano)}
            >
              <MapIcon className="h-4.5 w-4.5" />
              <span>Plano Técnico</span>
            </button>
          )}
        </div>
      </div>

      {/* Viewer Panel Body */}
      <div className="relative bg-slate-950 min-h-[450px] h-[70vh] max-h-[750px] w-full flex flex-col">
        
        {activeTab === '360' && hasPanoramas && (
          <div className="flex-1 w-full h-full min-h-0 relative">
            <PanoramaViewer
              scenes={panoramas}
              className="h-full w-full"
              immersiveControls
              variant="immersive"
            />
          </div>
        )}

        {activeTab === 'real' && hasReal && (
          <div className="flex-1 w-full h-full p-4 sm:p-8 bg-slate-950 overflow-y-auto scrollbar-thin">
            <ImageGallery images={realImages} />
          </div>
        )}

        {activeTab === 'renders' && hasRenders && (
          <div className="flex-1 w-full h-full p-4 sm:p-8 bg-slate-950 overflow-y-auto scrollbar-thin">
            <ImageGallery images={renderImages} />
          </div>
        )}

        {activeTab === 'plano' && hasPlano && (
          <div className="flex-1 w-full h-full flex flex-col bg-slate-900 overflow-hidden relative">
            {floorPlanUrl!.toLowerCase().endsWith('.pdf') ? (
              <div className="w-full h-full flex flex-col">
                <iframe
                  src={`${floorPlanUrl}#toolbar=1&navpanes=1&scrollbar=1&zoom=100`}
                  className="w-full h-full border-none bg-slate-850"
                  title="Plano Técnico PDF"
                />
                <div className="bg-slate-950 border-t border-slate-800 px-6 py-3 flex items-center justify-between shrink-0">
                  <p className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                    📄 Plano Vectorial PDF • Utilizá los controles superiores para acercar, alejar o rotar.
                  </p>
                  <a
                    href={floorPlanUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white px-4 transition active:scale-95 shadow-md"
                  >
                    <span>Abrir en nueva pestaña</span>
                    <ChevronRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ) : (
              <div 
                className="w-full h-full flex flex-col items-center justify-center relative bg-slate-950 overflow-hidden select-none cursor-grab active:cursor-grabbing"
                onMouseDown={handlePlanoMouseDown}
                onMouseMove={handlePlanoMouseMove}
                onMouseUp={handlePlanoMouseUp}
                onMouseLeave={handlePlanoMouseUp}
                onTouchStart={handlePlanoTouchStart}
                onTouchMove={handlePlanoTouchMove}
                onTouchEnd={handlePlanoMouseUp}
              >
                {/* Real-time Canvas Area */}
                <div 
                  className="transition-transform duration-200 ease-out origin-center"
                  style={{
                    transform: `translate(${planoPosition.x}px, ${planoPosition.y}px) scale(${planoScale}) rotate(${planoRotation}deg)`
                  }}
                >
                  <img
                    src={floorPlanUrl!}
                    alt="Plano Técnico Interactivo"
                    className="max-w-full max-h-[55vh] object-contain rounded-xl shadow-2xl pointer-events-none"
                    draggable={false}
                  />
                </div>

                {/* Floating Translucent Control Toolbar */}
                <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 bg-slate-900/90 border border-slate-800 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-xl">
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePlanoZoomIn(); }}
                    className="h-8 w-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white transition active:scale-90"
                    title="Acercar (Zoom In)"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePlanoZoomOut(); }}
                    className="h-8 w-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white transition active:scale-90"
                    title="Alejar (Zoom Out)"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePlanoRotate(); }}
                    className="h-8 w-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white transition active:scale-90"
                    title="Rotar 90°"
                  >
                    <RotateCw className="h-4 w-4" />
                  </button>
                  <div className="h-4 w-px bg-slate-850 mx-1" />
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePlanoReset(); }}
                    className="h-8 w-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white transition active:scale-90"
                    title="Restablecer"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>

                {/* Draggable Guide Toast */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-full px-4 py-1.5 text-[10px] font-bold text-slate-400 shadow-md pointer-events-none">
                  🖱️ Arrastrá para desplazar • Zoom: {Math.round(planoScale * 100)}% • Rotación: {planoRotation}°
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Dynamic Style for animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 15s linear infinite;
        }
      `}} />
    </div>
  )
}
