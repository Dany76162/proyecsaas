# Arquitectura Motor Universal de Importación Inmobiliaria LATAM

Informe técnico/arquitectónico de auditoría del feature Sincronizar desde web.

## 1. Diagnóstico del estado actual

El sync actual no es todavía un motor universal: es un orquestador puntual con tres estrategias fijas. Evidencia: `artifacts/proyecsaas/src/server/property-sync/index.ts:4-7` declara WordPress REST API, JSON-LD y HTML estático; `artifacts/proyecsaas/src/server/property-sync/types.ts:23` limita `SyncStrategy` a `wordpress-api | json-ld | html-static`.

Responsabilidades reales: `route.ts:22-79` resuelve organización/URL y llama `syncPropertiesFromUrl`; `route.ts:84-151` persiste; `route.ts:138-143` crea nuevas como `DRAFT + publicVisible:false`; `index.ts:26-75` orquesta estrategias; `types.ts:5-21` define `SyncProperty`; `field-parser.ts:18-57` parsea precio ARS/USD; `field-parser.ts:193-227` sanitiza títulos y precios ambiguos; `wordpress-api.ts:65-116` descubre y pagina WP; `wordpress-api.ts:144-220` convierte posts; `json-ld.ts:36-55` extrae JSON-LD; `json-ld.ts:66-129` convierte JSON-LD; `html-static.ts:1-14` documenta el P0 fail-closed; `html-static.ts:41-63` extrae solo cards delimitadas; `html-static.ts:100-147` convierte bloques; `html-static.ts:196-202` loguea cobertura y exige al menos 3 propiedades.

`CHECKLIST.md` leído: marca el sync web como integrado pero con QA productiva pendiente; documenta que el P0 `d073351` eliminó el fallback por ventana HTML porque mezclaba datos de cards vecinas, mantiene `DRAFT + publicVisible:false`, y deja pendientes geocoding, panel de revisión y dominio autorizado. También advierte que `src/server/property-sync/*` y `api/properties/sync-from-source/route.ts` son territorio activo de Antigravity.

Diagnóstico: sirve como base segura inicial, no como motor universal LATAM. Conserva invariantes correctos: fail-closed, no publicación automática, logs sin datos sensibles y error honesto. Es frágil porque normaliza principalmente ARS/USD, no modela confianza, no abre ficha detalle como fuente principal en todas las estrategias, no tiene `SourceDetector`, `AdapterRegistry` ni panel de revisión.

## 2. Arquitectura propuesta

Evolucionar hacia un pipeline fail-closed orientado a ficha detalle: `SourceDetector`, `StrategyRunner`, estrategias por confianza, `LatamNormalizer`, `ConfidenceScorer`, resultado tipado y Panel de Revisión. El listado descubre URLs; la ficha detalle es la fuente confiable. Si no hay ficha confiable o bloque delimitado inequívoco, se omite o queda como requiere adaptador.

Principios: mejor no importar que importar mal; nunca mezclar datos entre propiedades vecinas; nunca inventar precio, ambientes, dormitorios, baños, superficie, ubicación ni imágenes; alta/media confianza crean borradores internos; baja confianza no crea ficha válida; todo entra como `DRAFT + publicVisible:false`; adaptadores por familia tecnológica, no por inmobiliaria individual.

## 3. Diagrama lógico

```text
URL → SourceDetector → StrategyRunner → Estrategia → Ficha detalle → LatamNormalizer → ConfidenceScorer → Resultado → Panel de revisión
```

Detalle: URL ingresada/configurada → normalización responsable, redirecciones, www/no-www, robots, sitemap, páginas candidatas, JSON-LD, WP, ACF, scripts, API pública, render JS, cards HTML y links detalle → ejecución ordenada por confianza → extracción desde `sourceDetailUrl` → `externalId` estable derivado de URL detalle → normalización LATAM → alta/media/baja confianza → imported/skipped/low_confidence/requires_adapter → revisión humana.

## 4. Componentes propuestos

`SourceDetector`: inspecciona una URL sin crawling agresivo. Entradas: URL original, límites y tenant/org. Salidas: `SourceDetectionReport` con URL canónica, dominio, redirecciones, robots, sitemap, páginas candidatas, tecnologías detectadas y estrategias recomendadas. Debe contemplar https, www/no-www, slash final, `/propiedades`, `/inmuebles`, `/venta`, `/alquiler`, `/search`, `/listado`, JSON-LD, WP REST, ACF, JSON embebido, API interna pública, render JS, HTML estático confiable, links detalle, headless y adaptador específico.

`StrategyRunner`: ejecuta estrategias en orden de confianza con timeouts, límites y trazabilidad. Entradas: `SourceDetectionReport`, URL fuente y políticas. Salidas: `PropertyExtractionResult[]`. Orden: JSON-LD > WP REST > WP+ACF > JSON embebido > sitemap+detalle > API interna > HTML cards delimitadas > headless > adaptador específico.

`JsonLdStrategy`: extrae Schema.org desde listado o ficha; valida URL única y evita mezclar `Product`/`Offer` genéricos de toda la página.

`WordPressStrategy`: conserva descubrimiento WP actual, custom post types, taxonomías, excerpt e imagen destacada; no asume precio si vive en meta privado.

`AcfStrategy`: lee ACF público cuando exista; si no está expuesto, marca sin campo o requiere adaptador.

`EmbeddedJsonStrategy`: detecta `__NEXT_DATA__`, `window.__INITIAL_STATE__` y payloads públicos; rechaza blobs ambiguos sin delimitación.

`SitemapStrategy`: descubre URLs detalle desde `sitemap.xml` y sitemaps hijos; delega extracción a `DetailPageStrategy`.

`DetailPageStrategy`: abre cada ficha detalle y extrae desde fuente confiable; `sourceDetailUrl` y `externalId` son obligatorios cuando exista detalle; si la ficha no es confiable, omite.

`StaticHtmlCardStrategy`: último recurso sin headless; solo cards delimitadas; mantener eliminación del fallback por ventana HTML.

`HeadlessStrategy` futura: render JS cuando no hay HTML/API útil; postergar por costo, seguridad y complejidad.

`AdapterRegistry`: registra adaptadores por familia: WP genérico, WP+ACF, WP custom post types, JSON-LD, Next/Nuxt JSON embebido, APIs internas, estáticos simples, render JS y proveedores específicos.

`ConfidenceScorer`: asigna alta/media/baja y motivos. Alta: título limpio, URL detalle única, precio único, operación clara, imágenes/características de la misma ficha/card, sin contradicciones. Media: faltan campos sin mezcla. Baja: varios precios/títulos, imagen dudosa, códigos raros, HTML residual, datos juntos o contradicciones. Alta/media → `DRAFT + publicVisible:false`; baja → no importar o requiere adaptación.

`LatamNormalizer`: normaliza monedas USD, U$S, US$, ARS, Gs, PYG, CLP, BRL, Bs, UYU; precios como `USD 90.000`, `USD$90.000`, `U$S 90.000`, `$600.000`, `Gs. 500.000.000`, `R$ 350.000`; operación venta/alquiler/temporario/financiación; tipos casa/depto/PH/local/oficina/galpón/lote/terreno/campo/cochera; características y ubicación LATAM.

## 5. Archivos actuales que tocaría en futura implementación

- `C:\Users\Usuario\Desktop\proyecsaas\artifacts\proyecsaas\src\server\property-sync\index.ts`: reemplazar orquestador fijo por `SourceDetector + StrategyRunner`.
- `C:\Users\Usuario\Desktop\proyecsaas\artifacts\proyecsaas\src\server\property-sync\types.ts`: ampliar contratos con `PropertyExtractionResult`, confianza, estados, motivos, `sourceDetailUrl` y evidencias.
- `C:\Users\Usuario\Desktop\proyecsaas\artifacts\proyecsaas\src\server\property-sync\field-parser.ts`: evolucionar a `LatamNormalizer`.
- `C:\Users\Usuario\Desktop\proyecsaas\artifacts\proyecsaas\src\server\property-sync\strategies\wordpress-api.ts`: conservar base, agregar ACF y detalle.
- `C:\Users\Usuario\Desktop\proyecsaas\artifacts\proyecsaas\src\server\property-sync\strategies\json-ld.ts`: endurecer validaciones y soportar detalle.
- `C:\Users\Usuario\Desktop\proyecsaas\artifacts\proyecsaas\src\server\property-sync\strategies\html-static.ts`: conservar fail-closed y convertir en `StaticHtmlCardStrategy`.
- `C:\Users\Usuario\Desktop\proyecsaas\artifacts\proyecsaas\src\app\api\properties\sync-from-source\route.ts`: adaptar respuesta para panel y estados, manteniendo `DRAFT + publicVisible:false`.

## 6. Qué NO tocaría

No tocar Mercado Pago, reservas, WhatsApp, AgentOS, soporte, worker, webhooks, DB, migraciones, seeds, Railway, env vars, despliegues, publicación automática, geocoding automático inicial, adaptadores por inmobiliaria individual ni el hotfix P0 que eliminó la ventana HTML.

## 7. Riesgos técnicos

Mezcla de datos entre cards vecinas; monedas ambiguas; WP con precio en meta/ACF no expuesto; JSON-LD incompleto o SEO genérico; sitios JS sin HTML útil; APIs internas inestables; imágenes lazy/CDN/rutas relativas; duplicados por URL canónica; falta de panel; costo de headless; riesgo legal si se sincronizan dominios no autorizados.

## 8. Roadmap por fases

- Fase 0 diagnóstico/logs: observabilidad segura de dominio, estrategia, URLs candidatas, fichas analizadas, importadas, omitidas, motivo, precio, imágenes, confianza y tiempo; no tokens/cookies/secrets/headers sensibles/datos personales.
- Fase 1 detector de fuente: `SourceDetector` read-only con normalización responsable y señales.
- Fase 2 extracción por ficha detalle: separar descubrimiento de links y extracción desde ficha; `sourceDetailUrl` y `externalId` estable.
- Fase 3 normalizador LATAM: monedas, operaciones, tipos, características y ubicación para AR, PY, UY, BO, CL, BR, etc.
- Fase 4 score de confianza: `ConfidenceScorer` y estados; baja confianza no crea ficha válida.
- Fase 5 panel de revisión: importadas, omitidas, baja confianza, requiere adaptación, faltantes, fuente, confianza y motivo.
- Fase 6 adaptadores por familia: WP, WP+ACF, WP CPT, JSON-LD, Next/Nuxt, APIs internas, estáticos, render JS, proveedores.
- Fase 7 dominio autorizado: dominio verificado, autorización titular, invitación agencia/empleado, aprobación Superadmin y auditoría.

## 9. Criterios de aceptación por fase

Fase 0: logs seguros sin cambiar DB/publicación. Fase 1: reporte de señales sin crawling agresivo. Fase 2: cada importación confiable tiene `sourceDetailUrl`; si detalle falla, se omite. Fase 3: monedas LATAM principales sin asumir ante ambigüedad crítica. Fase 4: todo resultado tiene confianza y motivos; baja no crea ficha válida. Fase 5: operador ve importadas/omitidas/baja/requiere adaptación y faltantes. Fase 6: adaptadores por familia, no inmobiliaria puntual. Fase 7: no sincronizar dominio sin autorización verificable y auditoría.

## 10. Recomendación final

Primero Fase 0 y Fase 1 sin migraciones ni cambios de persistencia crítica. Luego Fase 2 y Fase 4 antes de ampliar cobertura. No hacer todavía headless, dominio autorizado completo, geocoding automático, adaptadores por inmobiliaria individual ni cambios DB hasta validar contrato de resultados y panel.

Semáforo: Verde: detector, logs seguros, normalización en memoria y extracción por ficha en diagnóstico sin migraciones. Amarillo: WP/ACF, JSON embebido y sitemap+detalle con límites. Rojo: ventana HTML, publicación automática, baja confianza como válida, módulos ajenos o headless sin observabilidad.

## Respuestas explícitas a las 15 preguntas

1. Parser puntual/orquestador simple, no motor universal: `index.ts:4-7` y `types.ts:23`.
2. Sirven endpoint, contrato base, parsers, WP REST, JSON-LD, HTML delimitado, logs seguros y error honesto.
3. Mantener `DRAFT + publicVisible:false`, fail-closed HTML, títulos limpios y precio ambiguo vacío.
4. Frágiles: ARS/USD, JSON-LD genérico, WP sin ACF, HTML por regex, ausencia de ficha detalle obligatoria, confianza y panel.
5. `SourceDetector` read-only con normalización responsable, señales tecnológicas, robots/sitemap, rutas candidatas, JSON-LD, WP, ACF, scripts, API pública, render JS y recomendación.
6. `StrategyRunner` ordenado por confianza, con timeouts, límites, trazas, fail-closed y resultados tipados.
7. `PropertyExtractionResult` con `status`, `confidenceLevel`, `confidenceScore`, `fields`, `rawEvidence`, `sourceListUrl`, `sourceDetailUrl`, `externalId`, `strategy`, `reasons` y `blockingReasons`.
8. Estados: `imported_draft`, `skipped`, `low_confidence`, `requires_adapter`, con motivos y faltantes; baja no crea ficha válida.
9. No hace falta cambiar DB ahora; se puede empezar sin migraciones con diagnóstico, detector y normalización en memoria.
10. Se puede implementar detector, logs, estrategias detrás del runner, detalle y score sin romper producción.
11. Jamás: ventana HTML, adivinar campos, mezclar cards, publicar automáticamente, importar baja confianza como válida, tocar módulos ajenos.
12. Se evita con fail-closed, detector, adaptadores por familia, confianza, ficha detalle, límites, normalizador conservador y panel.
13. Panel de Revisión: control humano antes de publicar; muestra confianza, faltantes, omitidas, motivos y fuente original.
14. Headless futuro: sitios JS sin HTML/API útil; esperar por costo, seguridad y observabilidad.
15. Dominio autorizado futuro: verificación de dominio propio, autorización titular, invitación agencia/empleado, aprobación Superadmin y auditoría.

## Confirmación de alcance

Solo auditoría/arquitectura. No se tocó DB, migraciones, seed, Railway, env vars, commits, push, Mercado Pago, reservas, WhatsApp, AgentOS ni módulos ajenos. No se corrieron builds ni tests porque no aplica a un entregable documental.