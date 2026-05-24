"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type ImageItem = {
  id: string;
  url: string;
  altText?: string | null;
};

type ImageGalleryProps = {
  images: ImageItem[];
};

export function ImageGallery({ images }: ImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    if (activeIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveIndex(null);
      } else if (e.key === "ArrowLeft") {
        setActiveIndex((prev) => (prev !== null ? (prev - 1 + images.length) % images.length : null));
      } else if (e.key === "ArrowRight") {
        setActiveIndex((prev) => (prev !== null ? (prev + 1) % images.length : null));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, images.length]);

  if (images.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Grid of Thumbnails */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {images.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setActiveIndex(i)}
            className="group relative aspect-video overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] transition-all hover:border-white/[0.18]"
          >
            <img
              src={img.url}
              alt={img.altText ?? "Imagen de la propiedad"}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
              <span className="rounded-full bg-black/60 p-2 text-white/80 backdrop-blur-sm">🔍</span>
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox Modal */}
      {activeIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setActiveIndex(null)}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setActiveIndex(null)}
            className="absolute right-4 top-4 z-50 rounded-full bg-white/10 p-2.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            title="Cerrar (Esc)"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Previous Button */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex((prev) => (prev !== null ? (prev - 1 + images.length) % images.length : null));
              }}
              className="absolute left-4 z-50 rounded-full bg-white/10 p-3 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
              title="Anterior"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Image Wrapper */}
          <div
            className="relative max-h-[85vh] max-w-[90vw] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[activeIndex].url}
              alt={images[activeIndex].altText ?? "Imagen ampliada"}
              className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl animate-in zoom-in-95 duration-200"
            />
            {images[activeIndex].altText && (
              <div className="absolute bottom-0 inset-x-0 bg-black/60 px-4 py-3 text-center text-sm text-white/90 backdrop-blur-sm rounded-b-lg">
                {images[activeIndex].altText}
              </div>
            )}
          </div>

          {/* Next Button */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex((prev) => (prev !== null ? (prev + 1) % images.length : null));
              }}
              className="absolute right-4 z-50 rounded-full bg-white/10 p-3 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
              title="Siguiente"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* Index Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/70 backdrop-blur-sm">
            {activeIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </div>
  );
}
