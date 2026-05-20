"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Loader2 } from "lucide-react";
import type { PropertyPanoramaItem } from "@/modules/properties/types";

// Helper utility (if standard in the project) or fallback
const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(" ");

declare global {
  interface Window {
    pannellum: any;
  }
}

interface PanoramaViewerProps {
  panoramas: PropertyPanoramaItem[];
  className?: string;
}

export function PanoramaViewer({ panoramas, className }: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const viewerRef = useRef<any>(null);

  useEffect(() => {
    // We need both the script and the container to be ready
    if (!isScriptLoaded || !containerRef.current || panoramas.length === 0) return;

    if (viewerRef.current) {
      viewerRef.current.destroy();
    }

    const panorama = panoramas[currentSceneIndex];
    if (!panorama) return;

    // Wait a brief moment to ensure container has dimensions
    const timeout = setTimeout(() => {
      if (window.pannellum && containerRef.current) {
        viewerRef.current = window.pannellum.viewer(containerRef.current, {
          type: "equirectangular",
          panorama: panorama.url,
          autoLoad: true,
          compass: false,
          yaw: panorama.initialYaw || 0,
          pitch: panorama.initialPitch || 0,
          hfov: panorama.initialHfov || 100,
          mouseZoom: true,
          keyboardZoom: true,
          showFullscreenCtrl: true,
        });
      }
    }, 50);

    return () => {
      clearTimeout(timeout);
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [isScriptLoaded, currentSceneIndex, panoramas]);

  if (panoramas.length === 0) {
    return null;
  }

  return (
    <div className={cn("relative flex flex-col w-full h-[500px] bg-slate-900 rounded-lg overflow-hidden", className)}>
      <Script
        src="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js"
        strategy="lazyOnload"
        onLoad={() => setIsScriptLoaded(true)}
      />
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css" />

      {!isScriptLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-white z-10">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      )}

      {/* Scene Tabs */}
      {panoramas.length > 1 && (
        <div className="absolute top-4 left-4 right-4 z-20 flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
          {panoramas.map((pano, idx) => (
            <button
              key={pano.id}
              onClick={() => setCurrentSceneIndex(idx)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-full shadow-md whitespace-nowrap transition-colors",
                idx === currentSceneIndex
                  ? "bg-brand-500 text-white"
                  : "bg-white/90 text-slate-700 hover:bg-white"
              )}
            >
              {pano.label || `Escena ${idx + 1}`}
            </button>
          ))}
        </div>
      )}

      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
