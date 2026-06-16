"use client";

import { useEffect } from "react";

/**
 * Registra el service worker passthrough (`/sw.js`) que habilita la
 * instalación PWA. Es best-effort: si el navegador no soporta SW o falla,
 * la app sigue funcionando igual.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* silencioso: la instalación PWA es opcional */
      });
    };

    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
