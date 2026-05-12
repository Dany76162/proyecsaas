"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Clock, Users, BarChart3, Zap, CheckCircle2, ArrowRight } from "lucide-react";

const slides = [
  {
    id: 1,
    title: "Respondé al instante, incluso fuera de horario.",
    subtitle: "RaicesPilot atiende, ordena y deriva consultas para que ninguna oportunidad quede sin respuesta.",
    visual: (
      <div className="relative h-full flex items-center justify-center">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-green-50 opacity-90" />

        {/* Main visual composition */}
        <div className="relative z-10 flex items-center gap-12 max-w-6xl mx-auto">
          {/* Phone mockup */}
          <div className="flex-shrink-0">
            <div className="relative">
              {/* Phone frame */}
              <div className="w-80 h-[600px] bg-slate-900 rounded-[3rem] p-4 shadow-2xl">
                <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden">
                  {/* Header */}
                  <div className="bg-green-500 text-white p-4 flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Cliente potencial</div>
                      <div className="text-xs opacity-90">En línea</div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="p-4 space-y-4 flex-1 overflow-hidden">
                    <div className="flex justify-start">
                      <div className="bg-slate-100 rounded-2xl rounded-tl-md px-4 py-2 max-w-xs">
                        <div className="text-sm text-slate-800">Hola, busco un departamento de 2 ambientes en Palermo</div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <div className="bg-brand-500 text-white rounded-2xl rounded-tr-md px-4 py-2 max-w-xs">
                        <div className="text-sm">¡Hola! Tengo varias opciones perfectas. ¿Cuál es tu presupuesto aproximado?</div>
                      </div>
                    </div>

                    <div className="flex justify-start">
                      <div className="bg-slate-100 rounded-2xl rounded-tl-md px-4 py-2 max-w-xs">
                        <div className="text-sm text-slate-800">Hasta $300.000, con cochera si es posible</div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <div className="bg-green-500 text-white rounded-2xl rounded-tr-md px-4 py-2 max-w-xs">
                        <div className="text-sm flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Lead calificado automáticamente
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Input area */}
                  <div className="p-4 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-10 bg-slate-100 rounded-full px-4 flex items-center">
                        <span className="text-sm text-slate-500">RaicesPilot está escribiendo...</span>
                      </div>
                      <div className="w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center">
                        <ArrowRight className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                <Zap className="w-3 h-3 inline mr-1" />
                Respuesta en 2s
              </div>

              <div className="absolute -bottom-4 -left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                Lead Calificado
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    title: "Atención activa 24/7 para no perder oportunidades.",
    subtitle: "Mientras tu equipo trabaja o descansa, el seguimiento sigue funcionando.",
    visual: (
      <div className="relative h-full flex items-center justify-center">
        {/* Night background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-slate-900/20" />

        {/* Stars effect */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full opacity-60 animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
              }}
            />
          ))}
        </div>

        {/* Main content */}
        <div className="relative z-10 flex items-center gap-12 max-w-6xl mx-auto">
          {/* Clock and activity */}
          <div className="flex-shrink-0">
            <div className="relative">
              {/* Large clock */}
              <div className="w-64 h-64 bg-white rounded-full shadow-2xl flex items-center justify-center mb-8">
                <div className="text-center">
                  <div className="text-6xl font-bold text-slate-900">02:47</div>
                  <div className="text-lg text-slate-600">AM</div>
                </div>
              </div>

              {/* Activity indicators */}
              <div className="space-y-4">
                <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-semibold">Mensaje entrante</div>
                    <div className="text-white/70 text-sm">Procesando automáticamente...</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-semibold">Lead calificado</div>
                    <div className="text-white/70 text-sm">Agendando seguimiento</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-semibold">Visita programada</div>
                    <div className="text-white/70 text-sm">Mañana 10:00 AM</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    title: "Menos desorden operativo, más visitas concretadas.",
    subtitle: "Automatizá el seguimiento y enfocá al equipo en las oportunidades reales.",
    visual: (
      <div className="relative h-full flex items-center justify-center">
        {/* Warm background */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50" />

        {/* Main content */}
        <div className="relative z-10 flex items-center gap-12 max-w-6xl mx-auto">
          {/* Property visit scene */}
          <div className="flex-shrink-0">
            <div className="relative">
              {/* Property image mockup */}
              <div className="w-80 h-60 bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
                <div className="h-40 bg-gradient-to-br from-slate-200 to-slate-300 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-white/80 rounded-full flex items-center justify-center mb-2">
                        <Users className="w-8 h-8 text-slate-600" />
                      </div>
                      <div className="text-slate-700 font-semibold">Visita en progreso</div>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-slate-900">Depto 3 amb - Palermo</div>
                    <div className="text-sm font-bold text-green-600">$285.000</div>
                  </div>
                  <div className="text-xs text-slate-600">Ana García y Roberto López</div>
                </div>
              </div>

              {/* Success indicators */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-lg">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Seguimiento automático</div>
                    <div className="text-xs text-slate-600">Recordatorios enviados</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Cliente satisfecho</div>
                    <div className="text-xs text-slate-600">Feedback positivo recibido</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-lg">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Conversión exitosa</div>
                    <div className="text-xs text-slate-600">Visita → Reserva confirmada</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 4,
    title: "Toda tu operación comercial en un solo lugar.",
    subtitle: "Leads, conversaciones, propiedades y seguimiento conectados en una sola plataforma.",
    visual: (
      <div className="relative h-full flex items-center justify-center">
        {/* Tech background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="h-full w-full" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.3) 1px, transparent 0)',
            backgroundSize: '20px 20px'
          }} />
        </div>

        {/* Main content */}
        <div className="relative z-10 flex items-center gap-12 max-w-6xl mx-auto">
          {/* Dashboard mockup */}
          <div className="flex-shrink-0">
            <div className="relative">
              {/* Screen mockup */}
              <div className="w-96 h-64 bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-brand-500 rounded"></div>
                    <span className="font-semibold">RaicesPilot</span>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-full bg-slate-600"></div>
                    <div className="w-3 h-3 rounded-full bg-slate-600"></div>
                    <div className="w-3 h-3 rounded-full bg-slate-600"></div>
                  </div>
                </div>

                {/* Dashboard content */}
                <div className="p-4 bg-slate-50 h-full">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-blue-600">47</div>
                      <div className="text-xs text-slate-600">Leads activos</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-green-600">156</div>
                      <div className="text-xs text-slate-600">Conversaciones</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-purple-600">23</div>
                      <div className="text-xs text-slate-600">Visitas hoy</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-3 bg-white rounded-lg p-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-900">Nuevo mensaje IA</div>
                        <div className="text-xs text-slate-600">Cliente interesado en Palermo</div>
                      </div>
                      <div className="text-xs text-green-600">2 min</div>
                    </div>

                    <div className="flex items-center gap-3 bg-white rounded-lg p-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-900">Lead calificado</div>
                        <div className="text-xs text-slate-600">Presupuesto confirmado</div>
                      </div>
                      <div className="text-xs text-blue-600">15 min</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating connection lines */}
              <div className="absolute -top-2 -left-2 w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
              <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
              <div className="absolute top-1/2 -right-4 w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
];

export function HeroShowcase() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000); // 5 seconds

    return () => clearInterval(interval);
  }, [isHovered]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const currentTitle = slides[currentSlide].title;
  const currentSubtitle = slides[currentSlide].subtitle;

  return (
    <section className="relative overflow-hidden">
      {/* Main carousel container */}
      <div
        className="relative h-[600px] md:h-[700px] bg-slate-100"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Slides */}
        <div className="relative h-full">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {slide.visual}
            </div>
          ))}
        </div>

        {/* Title and subtitle overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center max-w-4xl mx-auto px-6">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
              {currentTitle}
            </h2>
            <p className="text-xl md:text-2xl text-white/90 leading-relaxed drop-shadow-md max-w-3xl mx-auto">
              {currentSubtitle}
            </p>
          </div>
        </div>

        {/* Indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-3">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "bg-white shadow-lg scale-125"
                  : "bg-white/50 hover:bg-white/75"
              }`}
              aria-label={`Ir al slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div
            className="h-full bg-white transition-all duration-300 ease-linear"
            style={{
              width: `${((currentSlide + 1) / slides.length) * 100}%`,
            }}
          />
        </div>
      </div>
    </section>
  );
}
