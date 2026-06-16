"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function InstallAppNavbarButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Detect iOS
    const isIosDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(isIosDevice);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleActionClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsOpen(false);
      }
      setDeferredPrompt(null);
    } else {
      setIsOpen(true);
    }
  };

  return (
    <>
      <button
        onClick={handleActionClick}
        className="inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/5 px-4 py-1.5 text-xs font-semibold text-white transition shadow-sm"
      >
        <Smartphone className="h-3.5 w-3.5" />
        App Móvil
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen} className="print:hidden">
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 p-0 overflow-hidden shadow-2xl">
          <div className="relative">
            {/* Header decorativo */}
            <div className="absolute inset-0 h-32 bg-gradient-to-b from-brand-500/20 to-transparent pointer-events-none" />
            
            <button 
              onClick={() => setIsOpen(false)} 
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-full transition z-10"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="px-8 pt-10 pb-8 flex flex-col items-center text-center relative z-10">
              <div className="h-16 w-16 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center mb-5 shadow-lg">
                <img src="/brand/logo_transparent_icon.png" alt="Logo" className="w-10 h-10 invert object-contain" />
              </div>
              
              <DialogTitle className="text-xl font-bold text-white mb-2">
                Raíces Pilot Inmuebles
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-300">
                Lleva el buscador más potente en tu bolsillo. 
                Descarga la App gratuita y sé el primero en enterarte de las nuevas oportunidades.
              </DialogDescription>

              <div className="w-full mt-8">
                {isIOS ? (
                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-left">
                    <p className="font-semibold text-white text-sm mb-2">Cómo instalar en iPhone:</p>
                    <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
                      <li>Toca el botón <strong>Compartir</strong> en la barra inferior de Safari</li>
                      <li>Selecciona <strong>Agregar a inicio</strong></li>
                      <li>Confirma y tendrás la App en tu pantalla</li>
                    </ol>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Button 
                      onClick={async () => {
                        if (deferredPrompt) {
                          deferredPrompt.prompt();
                          setDeferredPrompt(null);
                        } else {
                          // Si no hay prompt (ej. desktop sin banderas), muestra fallback manual
                        }
                      }} 
                      disabled={!deferredPrompt}
                      className="w-full h-12 bg-brand-500 hover:bg-brand-600 text-white font-bold text-base shadow-lg shadow-brand-500/20"
                    >
                      <Download className="mr-2 h-5 w-5" /> 
                      {deferredPrompt ? "Descargar e Instalar" : "Instalación manual requerida"}
                    </Button>

                    {!deferredPrompt && (
                      <div className="mt-2 text-left bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                        <p className="text-sm font-bold text-white mb-2">Instala desde el navegador</p>
                        <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
                          <li>Abre el menú de opciones (⋮ arriba a la derecha)</li>
                          <li>Elige <strong>"Instalar aplicación"</strong> o <strong>"Agregar a pantalla principal"</strong></li>
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
