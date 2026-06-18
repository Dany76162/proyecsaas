"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Calendar, Building, Sparkles, ArrowRight, ShieldCheck, CheckCircle2, Zap, Heart, Star, Compass, Phone, ExternalLink, Laptop, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

const DEMO_WHATSAPP_URL =
  "https://wa.me/5491166037990?text=Hola%2C%20quiero%20solicitar%20una%20demo%20de%20Ra%C3%ADces%20Pilot%20para%20mi%20inmobiliaria.";

type Message = {
  id: number;
  sender: "client" | "ai" | "system";
  text: string;
  timestamp: string;
  propertyCard?: {
    title: string;
    price: string;
    image: string;
    bedrooms: string;
    badge: string;
  };
  portalCard?: {
    title: string;
    description: string;
    badge: string;
    properties: Array<{
      title: string;
      price: string;
      image: string;
      rooms: string;
    }>;
  };
};

const CHAT_SEQUENCE_1: Message[] = [
  {
    id: 1,
    sender: "client",
    text: "Hola! Estoy buscando un departamento de 3 ambientes en Palermo. Mi presupuesto es de USD 150.000.",
    timestamp: "17:40",
  },
  {
    id: 2,
    sender: "ai",
    text: "¡Hola! Qué gusto saludarte. Encontré la opción perfecta para vos en Palermo que se ajusta idealmente a tu presupuesto. Mirá esta propiedad:",
    timestamp: "17:40",
    propertyCard: {
      title: "Depto 3 Amb c/ Balcón Terraza",
      price: "USD 139.000",
      image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=600&auto=format&fit=crop",
      bedrooms: "2 Dorm. • 75m²",
      badge: "98% Coincidencia (Match IA)",
    },
  },
  {
    id: 3,
    sender: "client",
    text: "¡Excelente! Me encanta la zona y el balcón. ¿Tiene cochera? ¿Podemos coordinar una visita para este sábado a las 11:00 AM?",
    timestamp: "17:41",
  },
  {
    id: 4,
    sender: "ai",
    text: "¡Sí, tiene cochera cubierta fija! Excelente noticia: acabo de agendar tu visita para el sábado a las 11:00 AM. Tu asesor comercial Daniel ya tiene agendado esperarte en la propiedad. ¿Te gustaría que te envíe la ubicación exacta por mapa?",
    timestamp: "17:41",
  },
  {
    id: 5,
    sender: "system",
    text: "📅 Visita Agendada y Registrada en el CRM",
    timestamp: "17:41",
  },
];

const CHAT_SEQUENCE_2: Message[] = [
  {
    id: 1,
    sender: "ai",
    text: "¡Hola Carlos! Para que vayas ganando tiempo hasta el sábado de la visita agendada...",
    timestamp: "17:43",
  },
  {
    id: 2,
    sender: "ai",
    text: "Te armé una selección exclusiva con otras 2 propiedades muy similares en Palermo que seguro te van a encantar. ¡Podés verlas en el portal y recorrerlas en 360°!",
    timestamp: "17:43",
    portalCard: {
      title: "Tu Portal Personalizado IA",
      description: "Propiedades seleccionadas para Carlos en base a tu búsqueda de 3 amb en Palermo",
      badge: "Recomendaciones Exclusivas",
      properties: [
        {
          title: "Duplex 2 Amb c/ Cochera",
          price: "USD 129.000",
          image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=400&auto=format&fit=crop",
          rooms: "1 Dorm. • Balcón",
        },
        {
          title: "3 Ambientes con Terraza y Parrilla",
          price: "USD 145.000",
          image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=400&auto=format&fit=crop",
          rooms: "2 Dorm. • Amenities",
        }
      ]
    }
  },
  {
    id: 3,
    sender: "client",
    text: "¡Espectacular! Me viene bárbaro para ir mirándolos y haciendo los tours virtuales.",
    timestamp: "17:45",
  },
  {
    id: 4,
    sender: "ai",
    text: "¡Excelente! Hacé click en el botón de arriba para abrir tu portal. ¡Nos vemos el sábado!",
    timestamp: "17:45",
  },
];

const SYSTEM_SLIDES = [
  {
    id: 1,
    title: "Respondé en segundos, incluso cuando tu equipo está ocupado.",
    description: "RaícesPilot automatiza la primera respuesta, califica consultas y mantiene activa la conversación.",
    image: "/landing/slide1.png",
  },
  {
    id: 2,
    title: "Mejor experiencia para cada consulta.",
    description: "La velocidad de respuesta mejora la percepción del cliente y evita perder oportunidades.",
    image: "/landing/slide2.png",
  },
  {
    id: 3,
    title: "Tours Virtuales 360° profesionales solo con tu celular.",
    description: "Creá escenas inmersivas interactivas sin necesidad de cámaras costosas, directo desde la web.",
    image: "/landing/slide3.png",
  },
  {
    id: 4,
    title: "Mientras el sistema automatiza, tu equipo avanza.",
    description: "Centralizá leads, conversaciones y seguimiento comercial sin frenar la operación.",
    image: "/landing/ai_map_strategy.png",
  },
  {
    id: 5,
    title: "Menos desorden operativo, más visitas concretadas.",
    description: "Automatizá el seguimiento y enfocá al equipo en lo que realmente cierra ventas.",
    image: "/landing/slide4.png",
  },
];

export function LandingHeroCarousel() {
  // Celular 1 state
  const [visibleMessages1, setVisibleMessages1] = useState<Message[]>([]);
  const [step1, setStep1] = useState(0);
  const [isTyping1, setIsTyping1] = useState(false);

  // Celular 2 state
  const [visibleMessages2, setVisibleMessages2] = useState<Message[]>([]);
  const [step2, setStep2] = useState(0);
  const [isTyping2, setIsTyping2] = useState(false);

  // System Desktop Slides state
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);

  // Rotar slides de escritorio
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlideIdx((prev) => (prev + 1) % SYSTEM_SLIDES.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  // WhatsApp 1 sequence loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    const runSequence1 = async () => {
      if (step1 < CHAT_SEQUENCE_1.length) {
        const nextMessage = CHAT_SEQUENCE_1[step1];
        
        if (nextMessage.sender === "ai") {
          setIsTyping1(true);
          await new Promise((resolve) => {
            timer = setTimeout(resolve, 2000);
          });
          setIsTyping1(false);
        } else {
          await new Promise((resolve) => {
            timer = setTimeout(resolve, 1200);
          });
        }

        setVisibleMessages1((prev) => [...prev, nextMessage]);
        setStep1((prev) => prev + 1);
      } else {
        timer = setTimeout(() => {
          setVisibleMessages1([]);
          setStep1(0);
        }, 8000);
      }
    };

    runSequence1();
    return () => clearTimeout(timer);
  }, [step1]);

  // WhatsApp 2 sequence loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    const runSequence2 = async () => {
      if (step2 < CHAT_SEQUENCE_2.length) {
        const nextMessage = CHAT_SEQUENCE_2[step2];
        
        if (step2 === 0 && visibleMessages1.length < 3) {
          timer = setTimeout(() => {
            setStep2(0);
          }, 1000);
          return;
        }

        if (nextMessage.sender === "ai") {
          setIsTyping2(true);
          await new Promise((resolve) => {
            timer = setTimeout(resolve, 2200);
          });
          setIsTyping2(false);
        } else {
          await new Promise((resolve) => {
            timer = setTimeout(resolve, 1500);
          });
        }

        setVisibleMessages2((prev) => [...prev, nextMessage]);
        setStep2((prev) => prev + 1);
      } else {
        timer = setTimeout(() => {
          setVisibleMessages2([]);
          setStep2(0);
        }, 8000);
      }
    };

    runSequence2();
    return () => clearTimeout(timer);
  }, [step2, visibleMessages1]);

  return (
    <div className="relative w-full bg-gradient-to-br from-[#060814] via-[#0d1222] to-[#04060d] overflow-hidden py-20 lg:py-28 border-b border-white/5">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-3xl opacity-30 pointer-events-none -translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl opacity-20 pointer-events-none translate-x-1/3 translate-y-1/3" />

      <div className="mx-auto max-w-[1600px] px-6 relative z-10">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          
          {/* MITAD IZQUIERDA: PANTALLA GIGANTE DEL CRM (ESCRITORIO / IMÁGENES TAMAÑO REAL CON TEXTOS) */}
          <div className="space-y-8 text-left w-full pr-0 lg:pr-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-brand-400">
              <Monitor className="h-3.5 w-3.5 animate-pulse text-brand-400" />
              CRM & AUTOMATIZACIÓN DE WHATSAPP CON IA
            </span>
            
            {/* Títulos y descripciones dinámicos que cambian con la imagen del CRM */}
            <div className="min-h-[230px] flex flex-col justify-end">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlideIdx}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="space-y-4"
                >
                  <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl leading-[1.15]">
                    {SYSTEM_SLIDES[currentSlideIdx].title}
                  </h1>
                  <p className="text-base text-slate-300 leading-relaxed max-w-xl">
                    {SYSTEM_SLIDES[currentSlideIdx].description}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="relative rounded-2xl border border-white/10 bg-slate-950/80 shadow-[0_25px_60px_rgba(0,0,0,0.7)] backdrop-blur-xl overflow-hidden aspect-[16/9.8] w-full max-w-full">
              <div className="h-9 bg-slate-900 border-b border-white/5 flex items-center px-2 sm:px-4 justify-between select-none">
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-rose-500/80" /><span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-amber-500/80" /><span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="bg-slate-950/60 rounded px-3 sm:px-12 py-1 text-[8px] sm:text-[9px] font-bold text-slate-400 tracking-wide flex items-center gap-1 sm:gap-1.5 truncate max-w-[70%]">
                  <Laptop className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-brand-400 shrink-0" /> app.raicespilot.com/crm/dashboard
                </div>
                <div className="w-6 sm:w-12 shrink-0" />
              </div>
              <div className="relative w-full h-[calc(100%-2.25rem)] bg-slate-950 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div key={currentSlideIdx} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.8 }} className="absolute inset-0 w-full h-full">
                    <img src={SYSTEM_SLIDES[currentSlideIdx].image} alt={SYSTEM_SLIDES[currentSlideIdx].title} className="w-full h-full object-cover object-center max-w-full" />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2 w-full max-w-full overflow-hidden">
              <Button size="lg" asChild className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold tracking-wide shadow-lg shadow-emerald-600/20 transform hover:scale-[1.01] active:scale-[0.99] transition duration-200 shrink-0 max-w-full">
                <a href={DEMO_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full text-center py-3">
                  <MessageSquare className="h-5 w-5 shrink-0" /> Probar Demo en WhatsApp
                </a>
              </Button>
              <Button variant="outline" size="lg" asChild className="w-full sm:w-auto border-white/10 hover:border-white/20 bg-white/[0.03] text-white hover:bg-white/[0.07] shrink-0 max-w-full">
                <a href="#contacto" className="w-full text-center py-3">Solicitar Acceso</a>
              </Button>
            </div>
          </div>
          <div className="w-full flex items-center justify-center py-6 lg:py-0 overflow-visible">
            <div className="relative w-full max-w-[320px] xs:max-w-[360px] sm:max-w-[480px] md:max-w-[550px] h-[480px] sm:h-[620px] flex items-center justify-center overflow-visible">
              {/* Celular 1 (Izquierdo) */}
              <motion.div 
                initial={{ opacity: 0, x: -30, y: 20, scale: 0.95 }} 
                animate={{ opacity: 1, x: "-32%", y: "-10%", scale: 1 }} 
                transition={{ duration: 0.8, ease: "easeOut" }} 
                className="absolute z-10 w-[170px] xs:w-[190px] sm:w-[265px] aspect-[9/18.5] rounded-[1.8rem] sm:rounded-[2.3rem] border-[4px] sm:border-[6px] border-slate-800 bg-slate-950 p-1.5 sm:p-2.5 shadow-[0_20px_45px_rgba(0,0,0,0.6)] ring-1 ring-white/10 overflow-hidden transform -rotate-2 hover:rotate-0 hover:scale-105 hover:z-30 transition duration-300"
              >
                <div className="absolute inset-0 bg-[#e5ddd5] bg-[url('https://i.pinimg.com/originals/97/c0/07/97c0075430c7c310b6193d9d37aa6510.jpg')] bg-repeat bg-[length:120px] opacity-90" />
                <div className="absolute top-0 inset-x-0 h-9 sm:h-11 bg-[#075e54] text-white flex items-center px-2 sm:px-3 gap-1.5 sm:gap-2 z-30 shadow-md">
                  <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-white/10 flex items-center justify-center border border-white/20 p-0.5 shrink-0 overflow-hidden">
                    <img src="/brand/logo_transparent_icon.png" alt="Logo avatar" className="h-full w-full object-contain brightness-0 invert" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[7.5px] sm:text-[9.5px] font-extrabold leading-tight truncate">Asistente IA • Raíces Pilot</h4>
                    <p className="text-[5.5px] sm:text-[7px] opacity-75 flex items-center gap-0.5 mt-0.5"><span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" /> En línea</p>
                  </div>
                </div>
                <div className="absolute inset-x-0 bottom-9 sm:bottom-11 top-9 sm:top-11 overflow-y-auto px-1.5 sm:px-2 py-2 sm:py-3 flex flex-col gap-1.5 sm:gap-2 scrollbar-none z-20">
                  <AnimatePresence>
                    {visibleMessages1.map((message) => (
                      <motion.div key={message.id} initial={{ opacity: 0, x: message.sender === "ai" ? 15 : -15, y: 6 }} animate={{ opacity: 1, x: 0, y: 0 }} exit={{ opacity: 0 }} className={`max-w-[85%] rounded-lg p-1.5 sm:p-2 shadow-sm relative text-[7px] sm:text-[9.5px] leading-relaxed ${message.sender === "ai" ? "self-start bg-white text-slate-800 rounded-tl-none" : "self-end bg-[#dcf8c6] text-slate-900 rounded-tr-none"}`}>
                        <p>{message.text}</p>
                        {message.propertyCard && (
                          <div className="mt-1 sm:mt-1.5 rounded-md border border-slate-200 bg-white overflow-hidden shadow-sm max-w-xs text-slate-800">
                            <img src={message.propertyCard.image} alt={message.propertyCard.title} className="w-full h-12 sm:h-16 object-cover" />
                            <div className="p-1 sm:p-1.5 space-y-0.5">
                              <h5 className="font-bold text-[6.5px] sm:text-[8px] text-slate-900 leading-tight truncate">{message.propertyCard.title}</h5>
                              <div className="flex items-center justify-between gap-1 pt-0.5 sm:pt-1 border-t border-slate-100 mt-0.5 sm:mt-1">
                                <span className="text-[7.5px] sm:text-[9px] font-black text-brand-600">{message.propertyCard.price}</span>
                                <span className="text-[5.5px] sm:text-[6.5px] font-bold text-slate-400 uppercase tracking-wider">Palermo</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-10 sm:w-16 h-2 sm:h-3 bg-slate-950 rounded-full z-40" />
              </motion.div>

              {/* Celular 2 (Derecho) */}
              <motion.div 
                initial={{ opacity: 0, x: 30, y: 40, scale: 0.95 }} 
                animate={{ opacity: 1, x: "32%", y: "10%", scale: 1 }} 
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }} 
                className="absolute z-20 w-[170px] xs:w-[190px] sm:w-[265px] aspect-[9/18.5] rounded-[1.8rem] sm:rounded-[2.3rem] border-[4px] sm:border-[6px] border-slate-800 bg-slate-950 p-1.5 sm:p-2.5 shadow-[0_25px_55px_rgba(0,0,0,0.7)] ring-1 ring-white/15 overflow-hidden transform rotate-2 hover:rotate-0 hover:scale-105 hover:z-30 transition duration-300"
              >
                <div className="absolute inset-0 bg-[#e5ddd5] bg-[url('https://i.pinimg.com/originals/97/c0/07/97c0075430c7c310b6193d9d37aa6510.jpg')] bg-repeat bg-[length:120px] opacity-90" />
                <div className="absolute top-0 inset-x-0 h-9 sm:h-11 bg-[#075e54] text-white flex items-center px-2 sm:px-3 gap-1.5 sm:gap-2 z-30 shadow-md">
                  <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-white/10 flex items-center justify-center border border-white/20 p-0.5 shrink-0 overflow-hidden">
                    <img src="/brand/logo_transparent_icon.png" alt="Logo avatar" className="h-full w-full object-contain brightness-0 invert" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[7.5px] sm:text-[9.5px] font-extrabold leading-tight truncate">Asistente IA • Raíces Pilot</h4>
                    <p className="text-[5.5px] sm:text-[7px] opacity-75 flex items-center gap-0.5 mt-0.5"><span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" /> En línea</p>
                  </div>
                </div>
                <div className="absolute inset-x-0 bottom-9 sm:bottom-11 top-9 sm:top-11 overflow-y-auto px-1.5 sm:px-2 py-2 sm:py-3 flex flex-col gap-1.5 sm:gap-2 scrollbar-none z-20">
                  <AnimatePresence>
                    {visibleMessages2.map((message) => (
                      <motion.div key={message.id} initial={{ opacity: 0, x: message.sender === "ai" ? 15 : -15, y: 6 }} animate={{ opacity: 1, x: 0, y: 0 }} exit={{ opacity: 0 }} className={`max-w-[85%] rounded-lg p-1.5 sm:p-2 shadow-sm relative text-[7px] sm:text-[9.5px] leading-relaxed ${message.sender === "ai" ? "self-start bg-white text-slate-800 rounded-tl-none" : "self-end bg-[#dcf8c6] text-slate-900 rounded-tr-none"}`}>
                        <p className="whitespace-pre-line">{message.text}</p>
                        {message.portalCard && (
                          <div className="mt-1 sm:mt-1.5 rounded-md border border-slate-200 bg-[#0f172a] text-white overflow-hidden shadow-sm max-w-xs">
                            <div className="bg-[#1e293b] p-1 sm:p-1.5 flex items-center justify-between border-b border-white/5">
                              <div className="flex items-center gap-1">
                                <img src="/brand/logo_transparent_icon.png" alt="Raices" className="h-2.5 w-2.5 sm:h-3 sm:w-3 object-contain brightness-0 invert" /><span className="text-[5.5px] sm:text-[7px] font-extrabold uppercase tracking-wider text-brand-400">RaícesPortal</span>
                              </div>
                            </div>
                            <div className="p-1 sm:p-1.5 space-y-0.5 sm:space-y-1">
                              {message.portalCard.properties.map((prop, idx) => (
                                <div key={idx} className="flex gap-1.5 sm:gap-2 items-center bg-slate-900/60 p-0.5 sm:p-1 rounded border border-white/5">
                                  <img src={prop.image} alt={prop.title} className="w-5 h-5 sm:w-7 sm:h-7 rounded object-cover shrink-0" />
                                  <div className="flex-1 min-w-0"><h6 className="font-bold text-[5.5px] sm:text-[7px] leading-tight truncate text-white">{prop.title}</h6></div>
                                  <span className="text-[6.5px] sm:text-[8px] font-black text-brand-400 shrink-0">{prop.price}</span>
                                </div>
                              ))}
                              <a href={DEMO_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="block w-full py-1 sm:py-1.5 rounded bg-brand-500 text-white font-extrabold text-[5.5px] sm:text-[7px] uppercase tracking-widest text-center transition shadow shadow-brand-500/20">Ver Selección & Tours 360°</a>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-10 sm:w-16 h-2 sm:h-3 bg-slate-950 rounded-full z-40" />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
