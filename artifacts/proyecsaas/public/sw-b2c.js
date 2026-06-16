/* Service worker mínimo y exclusivo para la App Global B2C (Compradores)
 *
 * Estrategia PASSTHROUGH: no cachea nada.
 * 
 * MUY IMPORTANTE: Este Service Worker NO CONTIENE código de Notificaciones Push.
 * Garantiza de forma absoluta que a los usuarios compradores/buscadores nunca
 * se les enviarán notificaciones push, protegiendo su privacidad para que no
 * sientan la app como invasiva.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Passthrough intencional: no llamamos a event.respondWith().
  // La sola presencia de este listener habilita la instalación PWA.
});
