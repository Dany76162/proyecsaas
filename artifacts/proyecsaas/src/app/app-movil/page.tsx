"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Download, BellRing, Smartphone, ShieldAlert, CheckCircle2, Calendar, MessageSquare, Apple, ArrowDownToLine, SignalHigh, Wifi, BatteryMedium, Phone, MessageCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/landing/Navbar";
import { savePushSubscriptionAction, sendTestPushAction } from "@/server/push/actions";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

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
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        alert("Tu navegador no soporta notificaciones push.");
        return;
      }
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        alert("Las notificaciones todavía no están configuradas. Probá más tarde.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Permiso denegado. Podés cambiarlo en la configuración de tu navegador.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
        }));

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        alert("No se pudo crear la suscripción.");
        return;
      }

      const res = await savePushSubscriptionAction(
        { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } },
        navigator.userAgent,
      );

      if (!res.ok) {
        if (res.reason === "auth") {
          await subscription.unsubscribe().catch(() => {});
          alert("Iniciá sesión con tu cuenta de inmobiliaria para activar las alertas.");
        } else {
          alert("No se pudo guardar la suscripción. Intentá de nuevo.");
        }
        return;
      }

      const test = await sendTestPushAction();
      if (test.ok) {
        alert("¡Alertas activadas! Te enviamos una notificación de prueba.");
      } else if (test.reason === "not-configured") {
        alert("Alertas guardadas. El envío del servidor todavía no está configurado.");
      } else {
        alert("¡Alertas activadas!");
      }
    } catch (err) {
      console.error("[push] activar alertas falló:", err);
      alert("Ocurrió un error activando las alertas.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#07070E] pt-16">
      <Navbar />

      <section className="relative overflow-hidden py-24 sm:py-32 min-h-[90vh] flex items-center bg-[#07070E]">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/brand/hero-bg-b2b.jpg" 
            alt="Raíces Pilot Dashboard" 
            className="w-full h-full object-cover object-center lg:object-right opacity-80" 
          />
          {/* Overlay muy sutil para no tapar la imagen, solo oscurecemos levemente la izquierda para el texto */}
          <div className="absolute inset-0 bg-black/20 lg:bg-gradient-to-r lg:from-black/60 lg:via-black/10 lg:to-transparent" />
        </div>

        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-brand-500/20 rounded-full blur-[120px] opacity-40 z-0 mix-blend-screen pointer-events-none" />

        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Texto y CTA */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-2xl bg-[#07070E]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 lg:p-12 shadow-2xl relative z-10"
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 border border-amber-500/30 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-400 mb-6">
                <ShieldAlert className="h-4 w-4" />
                Solo Inmobiliarias Verificadas
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl mb-6 leading-[1.1] drop-shadow-lg">
                Tu Inmobiliaria, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">en tu bolsillo.</span>
              </h1>
              
              <p className="mt-6 text-lg leading-8 text-slate-200 drop-shadow-md">
                Llevá Raíces Pilot siempre contigo. Recibí alertas inmediatas de la Inteligencia Artificial, monitoreá conversaciones y no dejes enfriar ni un solo lead.
              </p>

              {/* Warning for standard users */}
              <div className="mt-8 bg-black/50 backdrop-blur-md border border-white/10 rounded-xl p-4 flex gap-4">
                <div className="shrink-0 mt-1">
                  <ShieldAlert className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Atención: No es para uso público</h4>
                  <p className="text-xs text-slate-300 mt-1">
                    Esta herramienta está diseñada <strong>exclusivamente</strong> para los dueños y vendedores de las inmobiliarias. Si eres un cliente buscando propiedades, por favor regresa a la sección de Propiedades.
                  </p>
                </div>
              </div>

              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                {isIOS ? (
                  <div className="bg-black/60 backdrop-blur-md rounded-2xl p-5 border border-white/10 w-full sm:w-auto">
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
                      <div className="mt-3 rounded-xl border border-white/10 bg-black/60 backdrop-blur-md p-4 text-left">
                        <p className="text-sm font-bold text-white mb-2">Instalá desde tu navegador</p>
                        <ol className="text-xs text-slate-300 space-y-1 list-decimal list-inside">
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
              style={{ perspective: "1200px" }}
            >
              {/* Glow effect detrás del teléfono */}
              <div className="absolute inset-0 bg-brand-500/20 blur-[80px] rounded-full" />

              {/* Contenedor con Perspectiva 3D */}
              <div 
                className="relative w-full transition-transform duration-700 ease-out hover:!transform-none"
                style={{ transform: "rotateY(25deg) rotateX(5deg) rotateZ(-2deg)", transformStyle: "preserve-3d" }}
              >
                {/* Sombra 3D para darle profundidad a la rotación */}
                <div className="absolute inset-0 bg-black/60 -translate-x-6 translate-y-8 blur-2xl rounded-[3rem] -z-10" />

                {/* Celular Mockup Glassmorphism */}
                <div className="relative aspect-[1/2] rounded-[3rem] bg-black/40 backdrop-blur-2xl p-2 shadow-[20px_20px_50px_rgba(0,0,0,0.5),inset_1px_1px_2px_rgba(255,255,255,0.2)] border-[8px] border-white/10 ring-1 ring-white/5 z-20">
                  <div className="h-full w-full overflow-hidden rounded-[2.2rem] bg-[#07070E]/90 flex flex-col relative">
                  {/* Home Screen Wallpaper */}
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-black -z-10" />

                  {/* Status Bar */}
                  <div className="h-7 w-full flex justify-between items-center px-6 text-[11px] font-semibold text-white z-30 absolute top-0 pt-2">
                    <span>09:41</span>
                    <div className="flex gap-1.5 items-center">
                      <SignalHigh className="w-3.5 h-3.5" />
                      <Wifi className="w-3.5 h-3.5" />
                      <BatteryMedium className="w-4 h-4" />
                    </div>
                  </div>
                  
                  {/* Dynamic Island / Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 h-7 w-28 bg-black rounded-b-3xl z-20 shadow-md" />

                  <div className="flex-1 pt-16 px-4 flex flex-col relative z-10 h-full">
                    
                    {/* Push Notifications (iOS Banner Style) */}
                    <div className="flex flex-col gap-3">
                      <motion.div 
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.5, delay: 1.2, type: "spring" }}
                        className="bg-black/60 backdrop-blur-xl border border-white/20 rounded-[1.5rem] p-3 shadow-2xl"
                      >
                        <div className="flex items-center gap-2 mb-1.5 px-1">
                          <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center shrink-0 overflow-hidden">
                            <img src="/brand/logo_transparent_icon.png" alt="Raíces" className="w-full h-full object-contain scale-[1.7] brightness-0" />
                          </div>
                          <span className="text-white/70 text-[10px] font-bold tracking-widest uppercase">Raíces Pilot</span>
                          <span className="text-white/40 text-[10px] ml-auto">ahora</span>
                        </div>
                        <div className="px-1">
                          <h4 className="text-white font-bold text-sm">Nuevo Lead Perfilado 🔥</h4>
                          <p className="text-white/80 text-xs mt-0.5 leading-snug">
                            La Inteligencia Artificial calificó a "Marcos T." con interés muy alto para Nordelta.
                          </p>
                        </div>
                      </motion.div>

                      <motion.div 
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.5, delay: 1.6, type: "spring" }}
                        className="bg-black/60 backdrop-blur-xl border border-white/20 rounded-[1.5rem] p-3 shadow-2xl"
                      >
                        <div className="flex items-center gap-2 mb-1.5 px-1">
                          <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center shrink-0 overflow-hidden">
                            <img src="/brand/logo_transparent_icon.png" alt="Raíces" className="w-full h-full object-contain scale-[1.7] brightness-0" />
                          </div>
                          <span className="text-white/70 text-[10px] font-bold tracking-widest uppercase">Raíces Pilot</span>
                          <span className="text-white/40 text-[10px] ml-auto">hace 15m</span>
                        </div>
                        <div className="px-1">
                          <h4 className="text-white font-bold text-sm">Visita Agendada 📅</h4>
                          <p className="text-white/80 text-xs mt-0.5 leading-snug">
                            Visita confirmada para mañana a las 15:00 hrs. El cliente ya recibió las instrucciones.
                          </p>
                        </div>
                      </motion.div>
                    </div>

                    {/* App Grid (Fake iOS Home Screen) */}
                    <div className="mt-auto mb-6 px-2 grid grid-cols-4 gap-y-6 gap-x-4">
                       <div className="flex flex-col items-center gap-1.5">
                         <div className="w-[3.25rem] h-[3.25rem] bg-[#1877F2] rounded-[1rem] shadow-md flex items-center justify-center">
                           <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                         </div>
                       </div>
                       <div className="flex flex-col items-center gap-1.5">
                         <div className="w-[3.25rem] h-[3.25rem] bg-[#25D366] rounded-[1rem] shadow-md flex items-center justify-center">
                           <MessageCircle className="text-white w-7 h-7" fill="currentColor" strokeWidth={0} />
                         </div>
                       </div>
                       <div className="flex flex-col items-center gap-1.5">
                         <div className="w-[3.25rem] h-[3.25rem] bg-[#0A66C2] rounded-[1rem] shadow-md flex items-center justify-center">
                           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                         </div>
                       </div>
                       <div className="flex flex-col items-center gap-1.5">
                         <div className="w-[3.25rem] h-[3.25rem] bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] rounded-[1rem] shadow-md flex items-center justify-center">
                           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                         </div>
                       </div>
                    </div>

                    {/* iOS Dock */}
                    <div className="mb-2 mx-1 bg-white/20 backdrop-blur-2xl rounded-[2rem] p-3.5 flex justify-around items-center border border-white/10 shadow-2xl">
                       <div className="w-[3.25rem] h-[3.25rem] bg-green-500 rounded-[1rem] flex items-center justify-center shadow-lg">
                         <Phone className="text-white w-6 h-6" fill="currentColor" />
                       </div>
                       <div className="w-[3.25rem] h-[3.25rem] bg-sky-500 rounded-[1rem] flex items-center justify-center shadow-lg">
                         <MessageCircle className="text-white w-6 h-6" fill="currentColor" />
                       </div>
                       
                       {/* Raíces Pilot App in Dock */}
                       <div className="relative w-[3.25rem] h-[3.25rem] bg-white rounded-[1rem] flex items-center justify-center shadow-xl border border-slate-200 overflow-hidden">
                         <img src="/brand/logo_transparent_icon.png" alt="Raíces Pilot" className="w-full h-full object-contain scale-[1.6] brightness-0" />
                         {/* Notification Badge */}
                         <div className="absolute -top-1 -right-1 w-[1.35rem] h-[1.35rem] bg-red-500 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] text-white font-bold shadow-sm">
                           2
                         </div>
                       </div>
                       
                       <div className="w-[3.25rem] h-[3.25rem] bg-red-500 rounded-[1rem] flex items-center justify-center shadow-lg">
                         <Mail className="text-white w-6 h-6" fill="currentColor" />
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative elements behind phone */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-tr from-brand-600/20 to-blue-600/20 blur-3xl -z-10 rounded-full" />
              </div> {/* Cierre del Contenedor con Perspectiva 3D */}
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
