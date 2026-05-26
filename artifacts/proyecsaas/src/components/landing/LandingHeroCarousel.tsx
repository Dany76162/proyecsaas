"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const SLIDES = [
  {
    id: 1,
    title: "Respondé en segundos, incluso cuando tu equipo está ocupado.",
    description: "RaicesPilot automatiza la primera respuesta, califica consultas y mantiene activa la conversación.",
    image: "/landing/slide1.png",
    alt: "IA respondiendo en tiempo real",
  },
  {
    id: 2,
    title: "Mejor experiencia para cada consulta.",
    description: "La velocidad de respuesta mejora la percepción del cliente y evita perder oportunidades.",
    image: "/landing/slide2.png",
    alt: "Cliente satisfecho por atención rápida",
  },
  {
    id: 3,
    title: "Tours Virtuales 360° profesionales solo con tu celular.",
    description: "Creá escenas inmersivas interactivas sin necesidad de cámaras costosas, directo desde la web.",
    image: "/landing/slide3.png",
    alt: "Tour virtual 360 interactivo creado con el celular",
  },
  {
    id: 4,
    title: "Mientras el sistema automatiza, tu equipo avanza.",
    description: "Centralizá leads, conversaciones y seguimiento comercial sin frenar la operación.",
    image: "/landing/ai_map_strategy.png",
    alt: "Inmobiliaria trabajando con el sistema y mapas de calor",
  },
  {
    id: 5,
    title: "Menos desorden operativo, más visitas concretadas.",
    description: "Automatizá el seguimiento y enfocá al equipo en lo que realmente cierra ventas.",
    image: "/landing/slide4.png",
    alt: "Visita inmobiliaria concretada",
  },
];

export function LandingHeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % SLIDES.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(nextSlide, 8000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  return (
    <div className="relative w-full overflow-hidden bg-slate-900 shadow-xl">
      <div className="relative h-[600px] w-full sm:h-[750px] lg:h-[850px]">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 1.5,
              ease: "easeInOut"
            }}
            className="absolute inset-0"
          >
            {/* Background Image */}
            <div className="relative h-full w-full">
              <Image
                src={SLIDES[currentIndex].image}
                alt={SLIDES[currentIndex].alt}
                fill
                priority
                className="object-cover"
                sizes="100vw"
              />
              
              {/* Overlay for legibility - Premium gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/40 to-transparent sm:from-slate-950/80" />
              
              {/* Content Panel */}
              <div className="absolute inset-0 flex items-center px-6 sm:px-12 lg:px-24">
                <div className="mx-auto w-full max-w-7xl">
                  <div className="max-w-2xl">
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 1 }}
                    >
                      <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-6xl leading-[1.1]">
                        {SLIDES[currentIndex].title}
                      </h2>
                      <p className="mt-6 text-lg text-slate-200 sm:text-xl leading-relaxed max-w-lg">
                        {SLIDES[currentIndex].description}
                      </p>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Progress Indicators */}
        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-3 z-10">
          {SLIDES.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                index === currentIndex 
                  ? "w-8 bg-brand-500 shadow-lg shadow-brand-500/40" 
                  : "w-2 bg-white/40 hover:bg-white/60"
              )}
              aria-label={`Ir al slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 h-1 w-full bg-white/10 z-10">
          <motion.div
            key={currentIndex}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 8, ease: "linear" }}
            className="h-full bg-brand-500"
          />
        </div>
      </div>
    </div>
  );
}
