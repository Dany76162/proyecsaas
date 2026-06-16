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
      // App de compradores (B2C): sw-b2c.js SIN notificaciones, acotado al scope
      // "/propiedades" para que NO reemplace al sw.js del panel B2B (que sí maneja push).
      // Resto del sitio (B2B): sw.js con push, scope "/".
      const isB2C = window.location.pathname.startsWith("/propiedades");
      const swUrl = isB2C ? "/sw-b2c.js" : "/sw.js";
      const options: RegistrationOptions | undefined = isB2C
        ? { scope: "/propiedades" }
        : undefined;

      navigator.serviceWorker.register(swUrl, options).catch(() => {
        /* silencioso: la instalación PWA es opcional */
      });
    };

    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
