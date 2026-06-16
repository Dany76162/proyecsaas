/* Service worker mínimo para habilitar la instalación PWA (installability).
 *
 * Estrategia PASSTHROUGH: no cachea nada. En una app multi-tenant cachear
 * respuestas podría servir contenido viejo o de otra sesión, así que el SW
 * solo declara un handler de fetch (requisito de los navegadores Chromium
 * para ofrecer "Instalar app") y deja que el navegador maneje cada request.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Passthrough intencional: no llamamos a event.respondWith().
  // La sola presencia de este listener habilita la instalación.
});
