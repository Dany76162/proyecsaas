"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Download, BellRing, Smartphone, ShieldAlert, CheckCircle2, Calendar, MessageSquare, Apple, ArrowDownToLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/landing/Navbar";

export default function AppMovilPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showManualHelp, setShowManualHelp] = useState(false);

  useEffect(() => {
    // Detect iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isIosDevice);

    // Listen for PWA install prompt on Android/Desktop
    const handler = (e: Event) => {
      // Prevent Chrome from automatically showing the prompt; stash it for later.
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      setDeferredPrompt(null);
    }
  };

  const handleNotificationRequest = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        alert("¡Permiso concedido! Recibirás alertas en tiempo real.");
      } else {
        alert("Permiso denegado. Puedes cambiarlo en la configuración de tu navegador.");
      }
    } else {
      alert("Tu navegador no soporta notificaciones push.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#07070E] pt-16">
      <Navbar />

      <section className="relative overflow-hidden py-24 sm:py-32">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-brand-500/20 rounded-full blur-[120px] opacity-50 -z-10 mix-blend-screen pointer-events-none" />

        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Texto y CTA */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-2xl"
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-6">
                <ShieldAlert className="h-4 w-4" />
                Solo Inmobiliarias Verificadas
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-6xl mb-6 leading-[1.1]">
                Tu Inmobiliaria, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">en tu bolsillo.</span>
              </h1>
              
              <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">
                Llevá Raíces Pilot siempre contigo. Recibí alertas inmediatas de la Inteligencia Artificial, monitoreá conversaciones y no dejes enfriar ni un solo lead.
              </p>

              {/* Warning for standard users */}
              <div className="mt-8 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex gap-4">
                <div className="shrink-0 mt-1">
                  <ShieldAlert className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Atención: No es para uso público</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Esta herramienta está diseñada <strong>exclusivamente</strong> para los dueños y vendedores de las inmobiliarias. Si eres un cliente buscando propiedades, por favor regresa a la sección de Propiedades.
                  </p>
                </div>
              </div>

              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                {isIOS ? (
                  <div className="bg-slate-900 dark:bg-slate-800 rounded-2xl p-5 border border-slate-800 dark:border-slate-700 w-full sm:w-auto">
                    <div className="flex items-center gap-3 text-white font-bold mb-3">
                      <Apple className="h-5 w-5" /> Instalar en iPhone
                    </div>
                    <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
                      <li>Toca el botón <strong>Compartir</strong> en Safari</li>
                      <li>Selecciona <strong>Agregar a inicio</strong></li>
                      <li>¡Listo! Tu app está instalada</li>
                    </ol>
                  </div>
                ) : (
                  <div className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      className="h-14 px-8 text-base shadow-xl shadow-brand-500/20 w-full"
                      onClick={deferredPrompt ? handleInstallClick : () => setShowManualHelp((v) => !v)}
                    >
                      <Download className="mr-2 h-5 w-5" />
                      {deferredPrompt ? "Descargar e Instalar" : "Cómo instalar la app"}
                    </Button>
                    {!deferredPrompt && showManualHelp && (
                      <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-left">
                        <p className="text-sm font-bold text-slate-900 dark:text-white mb-2">Instalá desde tu navegador</p>
                        <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-decimal list-inside">
                          <li>Abrí el menú del navegador (⋮ en Chrome).</li>
                          <li>Elegí <strong>"Instalar app"</strong> o <strong>"Agregar a pantalla de inicio"</strong>.</li>
                          <li>Confirmá y la app queda en tu inicio.</li>
                        </ol>
                      </div>
                    )}
                  </div>
                )}

                <Button variant="outline" size="lg" className="h-14 px-8 text-base bg-white/5 backdrop-blur-md" onClick={handleNotificationRequest}>
                  <BellRing className="mr-2 h-5 w-5 text-brand-500" />
                  Activar Alertas
                </Button>
              </div>
            </motion.div>

            {/* Imagen Mockup */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative mx-auto w-full max-w-sm"
            >
              {/* Celular Mockup */}
              <div className="relative aspect-[1/2] rounded-[3rem] bg-slate-900 p-2 shadow-2xl border-8 border-slate-800 ring-1 ring-slate-900/5 z-20">
                <div className="h-full w-full overflow-hidden rounded-[2.5rem] bg-[#07070E] flex flex-col relative">
                  
                  {/* Status Bar */}
                  <div className="h-8 w-full bg-black/40 flex justify-center items-center">
                    <div className="h-4 w-1/3 bg-black rounded-b-xl" />
                  </div>

                  {/* App Screen */}
                  <div className="flex-1 p-5 space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <img src="/brand/logo_transparent_icon.png" alt="Logo" className="w-8 h-8 invert" />
                        <span className="text-white font-bold text-sm tracking-widest">RAÍCES Pilot</span>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-xs">
                        JD
                      </div>
                    </div>

                    {/* Push Notifications Mockups */}
                    <div className="space-y-4 pt-10">
                      
                      {/* Alert 1 */}
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 1 }}
                        className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-lg"
                      >
                        <div className="flex items-start gap-3">
                          <div className="bg-brand-500 p-2 rounded-xl">
                            <MessageSquare className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="text-white font-bold text-sm">Nuevo Lead Perfilado</div>
                            <div className="text-slate-300 text-xs mt-1">La IA acaba de calificar a "Marcos T." con interés muy alto.</div>
                            <div className="text-slate-500 text-[10px] mt-2">Hace 2 minutos</div>
                          </div>
                        </div>
                      </motion.div>

                      {/* Alert 2 */}
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 1.5 }}
                        className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-lg"
                      >
                        <div className="flex items-start gap-3">
                          <div className="bg-emerald-500 p-2 rounded-xl">
                            <Calendar className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="text-white font-bold text-sm">Visita Agendada</div>
                            <div className="text-slate-300 text-xs mt-1">Visita para mañana a las 15:00 hrs confirmada.</div>
                            <div className="text-slate-500 text-[10px] mt-2">Hace 15 minutos</div>
                          </div>
                        </div>
                      </motion.div>

                    </div>

                  </div>
                </div>
              </div>

              {/* Decorative elements behind phone */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-tr from-brand-600/20 to-blue-600/20 blur-3xl -z-10 rounded-full" />
            </motion.div>

          </div>
        </div>
      </section>

      {/* Grid de beneficios */}
      <section className="py-24 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">¿Por qué instalarla?</h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              Supervisa la operación de tu equipo y de la inteligencia artificial sin estar atado a la computadora.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-50 dark:bg-slate-950 rounded-3xl p-8 border border-slate-200 dark:border-slate-800">
              <div className="w-12 h-12 bg-brand-100 dark:bg-brand-500/20 rounded-xl flex items-center justify-center mb-6">
                <BellRing className="h-6 w-6 text-brand-600 dark:text-brand-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Alertas Inmediatas</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Recibe notificaciones en tu pantalla de bloqueo cada vez que entra un lead de alto valor o se agenda una visita.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 rounded-3xl p-8 border border-slate-200 dark:border-slate-800">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl flex items-center justify-center mb-6">
                <MessageSquare className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Supervisa a la IA</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Lee en vivo cómo los agentes de Inteligencia Artificial atienden a tus clientes por WhatsApp e interviene cuando quieras.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 rounded-3xl p-8 border border-slate-200 dark:border-slate-800">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 rounded-xl flex items-center justify-center mb-6">
                <Smartphone className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Siempre a mano</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Acceso en un toque desde tu menú. Diseñada específicamente para funcionar rápido y sin consumir memoria en tu teléfono.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
