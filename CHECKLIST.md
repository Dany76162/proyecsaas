# ✅ RAÍCES PILOT — CHECKLIST MAESTRO OFICIAL (AUDITORÍA RESPONDIDA)

> Auditoría + Estado del Producto + Roadmap — Versión Base Operativa 2026
> Documento fiel del CHECKLIST MAESTRO con **preguntas de auditoría respondidas** y estado de implementación.
> **Última actualización:** 2026-06-17

## Leyenda
**Estado oficial:** 🟢 Producción · 🟡 Beta · 🟠 Próximamente · 🔴 Oculto/Legacy · ⚪ Futuro
**Marcas de tarea:** ☐ No revisado · ✅ Revisado y correcto · ⚠️ Revisar · ❌ Corregir
**Marcas de sesión:** ✔️ implementado+desplegado esta sesión · ⛔ no-codeable por mí (infra/comercial/terceros)

---

## 🚀 AVANCES DE ESTA SESIÓN (commits verificados: tsc + build + prod HTTP 200)

| Commit | Qué | Secciones |
|---|---|---|
| `f794c9a` | Badge de estado de lote público unificado (`LotStatusBadge`; "No disponible" para cliente) | 32 · 41 |
| `58d2f6e` | Ocultar "Bienvenida" del menú + dedupe CTA "Continuar configuración" tras onboarding | 3 · 23 · 41 |
| `6921388` | SEO `generateMetadata` (título + descripción + OpenGraph) en ficha de lote | 8 |
| `ab17688` | Nomenclatura LATAM en UI: Captación→Links de WhatsApp · Prospectos→Oportunidades · Conversaciones→Inbox IA | 42 · 44 |
| `677977b` | Link "Contacto" en navbar de la landing | 2 |
| `d2372b0` | Tour 360° Propiedades: subir 360° reales habilitado · creación con celular "Próximamente" | 7 |
| `74873cf` | Alineación de textos (onboarding paso 5 + manual de uso) con el alcance del tour 360° | 7 |
| `26b26c8` | Rediseño del onboarding (Perfil→WhatsApp→Agente→Propiedad→Probá) + fix `isComplete` | 3 · 23 · 45 · 46 |
| `b438a32` | Landing **App móvil** (`/app-movil`) + **service worker** PWA + fix fallback del botón instalar | 2 |
| `0052174` | Fix middleware: `/app-movil` y `/sw.js` públicos (estaban gateados por auth) | 2 |
| `ff1bc58` | **Web Push REAL** (Fase 1): `PushSubscription` + migración, SW push, server actions, "Activar Alertas" → notificación real (✅ verificado en prod) | 2 |
| `5dbd6ef` | Acceso "App móvil y alertas" en sidebar → `/app-movil` sin desloguear | 2 |
| `58f2d6f` | App B2C "Inmuebles" (manifest-b2c + sw-b2c sin push, scope `/propiedades`) + botón Instalar en navbar + fix scope SW + `id` en manifests | 2 |
| `8eb9b02` | Fix middleware: `/manifest-b2c.json` y `/sw-b2c.js` públicos | 2 |
| `d7fbf54` | **Push Fase 2**: notificación automática en nuevo lead (WhatsApp/IA) y visita agendada | 2 |
| `a3d556d` | **AgentOS — control de costos de IA real** (§40): `AiUsageEvent` + tracking de tokens/costo por tenant + panel | 20 · 40 |
| `c130692` | **AgentOS — límites de consumo + alertas por org** (§40): límite mensual editable + estado/alertas en el panel | 20 · 40 |
| `0148248` | **App móvil — rediseño premium del hero** (`/app-movil`): fondo fotográfico B2B + tarjeta glassmorphism + mockup iOS en perspectiva 3D (status bar/notch, notificaciones push estilo banner, grilla de apps y dock con badge) | 2 |
| `d4233a5` | **Unificación de badge de estado de lote** en fichas públicas (§32): elimina 2 `StatusBadge` locales duplicados (ficha + cuotas) → `LotStatusBadge audience="public"` (labels y estilo unificados, −30 líneas) | 32 · 41 |
| `bceab05` | **Optimización del logo** `logo_transparent_icon.png` (2.02 MB → 21 KB, 768×512, transparencia preservada; ~17 usos, sin cambios de código) | 2 |
| `0907f4f` | **Sección Desarrolladoras/Loteos** en la landing (`DevelopersSection`: 3 tarjetas + CTA WhatsApp) + link "Desarrollos" en navbar. Copy honesto sin prometer seña/pago online | 2 · 35 |
| `4dff3f1` | **Onboarding First-WOW Fase A** (§46): pregunta de tipo de negocio (`marketFocus`, sin migración) + paso 4 adaptado + pantalla `/onboarding/probar` con polling y auto-redirect al Inbox IA. Verificado runtime por HTTP | 46 · 23 |
| `96ca822` | **Onboarding First-WOW Fase B** (§46): Modo Express, publica la 1ra propiedad (AVAILABLE + pública) con 5 campos en <1 min. Verificado runtime | 46 |
| `18b28c2` | **Onboarding First-WOW Fase C** (§46): métrica time-to-WOW (onboarding→primer lead) en `/platform/activation` con agregados + columna por org. Verificado runtime | 46 · 40 |
| `ace4c06` | **Prueba del agente obligatoria — gate suave** (§46): `isComplete` requiere setup + primera conversación (el WOW) + banner "Falta el paso clave". Cierra el §46. Verificado runtime | 46 · 23 |
| `dd41c2f` | **FIX: config del agente daba 404** (§18): `getAgentDetail` se llamaba con args invertidos (orgId/agentId) → la pantalla de configuración no cargaba para nadie, no se podía asignar WhatsApp. Además el link "Asignar WhatsApp →" iba a integraciones en vez de a la config. Verificado runtime | 18 · 5 |
| `3c38e74` | **Diagnóstico WhatsApp** (debug temporal): `GET /api/whatsapp-debug` read-only para ver por qué un canal conectado no aparece en la asignación (rol, canales raw, getAvailableChannels) | 18 · 5 |

> **Verificación:** ambos `tsc --noEmit` limpio + pusheados a `main` (producción) el 2026-06-17.

---

## 🔌 WHATSAPP + AGENTE IA — PUESTA EN MARCHA REAL END-TO-END (2026-06-17, cuenta SevenToop)

Sesión larga destrabando el flujo real de WhatsApp por QR (Evolution API v2) hasta que el agente recibe, entiende, ofrece inventario real y responde por WhatsApp. **Cadena completa funcionando, verificada con charla real.**

**Recepción / infraestructura (lo que estaba roto):**
- `dd41c2f` Config del agente daba **404** (args invertidos en `getAgentDetail`) → no se podía asignar WhatsApp. + link "Asignar WhatsApp →" ahora va a la config del agente.
- `5017f05` Canal QR sin número se mostraba "Canal sin nombre" → ahora "WhatsApp conectado por QR" (seleccionable). `getAvailableChannels` incluye `provider`.
- `e7169f3` **Webhook no estaba configurado** en Evolution (el agente no recibía mensajes): `setEvolutionWebhook` + auto-activación al abrir la integración + `lastInboundAt`.
- `4c9989d` Captura del **número propio** (de `/instance/fetchInstances`, no `connectionState`) + confirmación manual → arregla el enlace/QR para compartir (salía sin número).
- `aa37355` **`webhookByEvents=false`** (Evolution posteaba a sub-rutas por evento → 404).
- `d0e7d43` Webhook devolvía **401** por apikey faltante (Evolution no lo reenvía) → relajado + headers.
- Worker en Railway: faltaban `EVOLUTION_API_URL/KEY` (lo cargó el usuario). Compuertas de IA (suscripción/aiStatus/cupo) se abren desde Superadmin (uso libre = ACTIVE + cupo alto + IA ACTIVE; o Lifetime).
- `a22937a` **Envío a Evolution v2** (payload plano `{number,text,delay,linkPreview}`; el v1 anidado daba 400). ← el agente ya responde por WhatsApp.

**Comportamiento del agente:**
- `9a5a345` **Dedup** de mensajes duplicados (jobId = id del mensaje) + handoff explícito ("derivar-a-asesor") vuelve a pausar la IA.
- `f7fdf3c` **A1** — la IA ya no se calla sola al sugerir intervención (se desacopló `requiresFollowUp` de `isHumanControlled`).
- `6e42f04` **A2** — prompt de calificación: anti-repetición, responde al último mensaje, sin markdown, links pelados.
- `6cdf387` Medidas redondeadas, **links absolutos**, **fondo** del lote (`backMeters`), y NO derivar por preguntas de info.
- `08fa0a1` **Contexto de IA enriquecido** con todos los campos de la propiedad (ambientes/baños/superficie/amenities/descripción/servicios).
- `cc8bc33` **A3** — push "🔥 Prospecto caliente" a la app móvil (1 vez por conversación/transición, no pausa la IA). Requirió cargar las **VAPID keys en el worker** en Railway (mismo patrón que Evolution). **Confirmado: llega a PC y a celular Android** (alertas activadas por dispositivo).
- `9b0186d` **Auto-refresco** del Inbox cada 12s (no hay que recargar).
- `e1fa4f2` **B** — Inbox: conversaciones quedan de registro (no se borran solas) + **borrado manual** con confirmación (ADMIN/OWNER).

**Notificaciones de la app (modelo definido por el usuario):** la notif de la app = "tenés que actuar". Dispara en 3 casos: (1) prospecto caliente, (2) la IA no tiene la info para responder, (3) demanda no cubierta (pide tipo/zona/propiedad que no tenés, aunque ofrezca alternativa). Tocar la notif (`/conversations/:id/handoff`) **pausa la IA** y **abre la app de WhatsApp** (`whatsapp://`) con el prospecto para seguir manual.

**Más fixes del agente (verificados en charla real):**
- `c057fdd` `escalateOnKeywords` por **palabra completa** (no subcadena): "ola" ya no matchea "hola", "lote" no matchea "lotes". + el usuario sacó "visita" de las keywords (coordinar visitas es trabajo del agente).
- `54095e8` No derivar a asesor para coordinar visitas.
- `aab26e2` **Precio formateado** (`priceLabel`): la IA mostraba 1.870.000 en vez de 18.700 (priceCents en centavos).
- `da5262e` **FIX: el mensaje manual del Inbox no llegaba** al prospecto en canales QR (buscaba solo WHATSAPP_CLOUD; ahora rutea por Evolution).
- `dc2726d` Removido el endpoint temporal `/api/whatsapp-debug` (cumplió su función).

**Propiedades:**
- `100659c` **Formulario adaptable por tipo** (5 perfiles: Residencial / Comercial / Suelo / Campo / Especiales): cada tipo muestra solo sus campos (un terreno ya no muestra cocheras/baños). + columna `services` (migración) + **hectáreas** para campos. La IA también adapta lo que ofrece al tipo.

**Agenda de visitas y disponibilidad (2026-06-18):**
- `c98f0ae` La IA usa los horarios **GENERALES** de disponibilidad (`propertyId/developmentId null`) y para **lotes**, no solo los de una propiedad matcheada.
- `1af1327` La IA propone/agenda visitas para **LOTES** (desarrollos), no solo propiedades.
- `73189d4` **Disponibilidad por desarrollo**: `AvailabilitySlot.developmentId` (schema + migración + acción + dropdown en *Configuración → Disponibilidad* + badge "Desarrollo: X"). El worker trae los slots que matchean el desarrollo de los lotes consultados → cada loteo tiene su agenda propia (ej. Valles del Pino sáb/dom) sin mezclarse. "General" = aplica a todos (sirve para inmobiliarias con misma agenda para todo el catálogo).
- `9d0a1a0` Aviso en el form: "General" aplica a TODOS los desarrollos.
- `c1107df` Evitar el término "loteadora" en copy (preferir "desarrollo"/"urbanización").

**Confirmación de visita = humano (modelo definido por el usuario, 2026-06-18):** la IA **no agenda ni confirma sola**. Flujo:
- `095c491` → `01459b8` La IA ofrece **solo los horarios cargados** (nunca inventa días/horas; si no hay, pregunta). Cuando el prospecto acepta un día/hora, la IA dice "lo coordino con el equipo y te confirmo", se **pausa** (`isHumanControlled`), y dispara push **"📅 Confirmá la visita"** con el día/horario pedido. El **OK final lo da el humano**. `nextBestAction='confirmar-visita-con-humano'`.
- `3a003aa` → `22de8b3` **Cancelación con retención suave (máx 2 mensajes)**: si el prospecto quiere cancelar, la IA intenta retener con hasta 2 intentos (ofrecer otro día / reprogramar), **sin exigir el motivo ni ponerse insistente**; si igual cancela, lo acepta con amabilidad y dispara push **"❌ Visita cancelada — sacala del CRM"**. Reprogramar a un nuevo horario = visita aceptada (no cancelación). La IA **nunca borra del CRM**: avisa para que lo haga el humano.
- `8d815c9` **No cancela por frase ambigua ni pregunta**: "¿me cancelaste la visita?" / "¿sigue en pie?" → la IA confirma que la visita sigue agendada, NO cancela. Solo entra al flujo de cancelación ante intención clara ("cancela", "no voy a poder ir", "dejalo"). (Bug visto en charla real: cancelaba ante una pregunta.)

**Agenda de visitas se llena sola — registro en CRM (`f936cba`, verificado en prod por el usuario):**
- Modelo `Visit` ahora soporta **desarrollos/lotes**, no solo propiedades: `propertyId` opcional + `developmentId` / `lotId` / `targetLabel` (migración `20260618120000`, se aplica sola en deploy vía `prisma migrate deploy` del script `start`).
- Cuando el prospecto **acepta un horario**, el worker crea la visita en estado **PENDING** (`createAgentVisit`) → aparece en `/visits` y en "En Visita" del CRM. La fecha sale del `proposedVisitDate` de la IA o de la próxima ocurrencia del slot disponible (`earliestSlotOccurrenceIso`). El humano la confirma (PENDING → CONFIRMED).
- Cancelación → `cancelAgentVisitsForLead` marca las visitas activas del lead como **CANCELED** (no borra, deja historial).
- UI de Visitas maneja visitas sin propiedad (usa `targetLabel`, ej. "Valles del Pino").

> **Estado:** 🟢 **Verificado en charla real con SevenToop (2026-06-18):** la IA ofrece los horarios reales cargados (sáb/dom de Valles del Pino), coordina sin confirmar sola ("lo confirmo con el equipo"), se pausa, el humano da el OK, **y la visita aparece en la agenda/CRM**. Cancelación con retención y guarda anti-pregunta OK. Pendiente menor del usuario: atar los horarios de cada loteo a su **desarrollo** en *Configuración → Disponibilidad* y ocultar la "propiedad" de marketing del catálogo.

**Visor Tour 360° — fix completo (2026-06-18, verificado por el usuario):**
- `6263729` **Pantalla negra en celulares**: los GPU móviles tienen un límite de textura WebGL menor (típico 4096px) y el Pannellum local **tira "webgl size error" (negro) si el panorama lo supera** — no reescala. Ahora se lee el `MAX_TEXTURE_SIZE` del dispositivo y se **reescala el panorama del lado del cliente** (canvas) para que entre y renderice en el celular. + **fallback legible** con botón "Abrir imagen 360°" en vez de pantalla negra si igual falla (ej. imagen de otro host sin CORS).
- `5cb19eb` **Reescalado de alta calidad** (imageSmoothingQuality=high + JPEG 0.95, solo si excede >2%) para no perder nitidez al achicar en móvil.
- `281e9e2` **Imagen borrosa/pixelada (causa REAL)**: el canvas WebGL se inicializaba **antes de que el layout tuviera su tamaño final** → quedaba con resolución interna chica y se estiraba (borroso). Pista del usuario: con F12 (resize de ventana) se veía nítido. Fix: **reintentos de `resize()`** (raf + timeouts) tras init + **`ResizeObserver`** que reajusta el canvas al tamaño real del contenedor (carga, rotación, F12, panel). ✅ **Verificado nítido por el usuario en PC.** Archivo: `src/components/properties/panorama-viewer.tsx`.

**Misc:** `281e9e2` también setea `metadataBase` (NEXT_PUBLIC_APP_URL || raicespilot.com) → silencia el warning de Next.js de imágenes OG/Twitter y arregla las previews de links compartidos.

**Auditoría ficha de propiedad (2026-06-18) — "100% real y funcionando":**
- ✅ **Data 100% real** (consultas Prisma en `getPropertyDetail`, sin mocks/TODOs): propiedad, leads vinculados, visitas, panoramas, fotos, plano, coordenadas. Formularios conectados a server actions reales (`updatePropertyAction`, `updatePanoramaSettingsAction`, subida de medios). Leads + Agenda de visitas muestran la feature nueva andando en prod (Daniel Pendiente + Confirmada). Subida de 360° funcional (escena `valles0` renderiza en catálogo). Mapa público genuinamente "próximamente" (coords sí se guardan).
- `64784a8` **Fix copy 360°**: quitado el badge "Pronto" engañoso de la pestaña Panorámica (subir 360° pro YA funciona); queda solo el aviso correcto "crear tour desde el celular → próximamente". (Aplica regla de acotar coming-soon al sub-feature exacto.)
- `64784a8` **Fix dedupe de visitas del agente**: `createAgentVisit` ahora deduplica por desarrollo O propiedad (antes solo uno) → evita visitas duplicadas del mismo lead cuando el match alterna; al reutilizar, completa propertyId/developmentId faltantes. ✅ **Verificado runtime** ejecutando la función real contra la DB (escenario del bug: A crea por propiedad → B matchea por desarrollo+propiedad → C solo por desarrollo → las 3 reutilizan la MISMA visita, 1 activa, sin duplicar; cancelación → CANCELED, 0 activas).
- `67f0be0` **Manual actualizado**: "Coordinación de visitas" (la IA ofrece horarios cargados, el humano confirma, la visita cae en Visitas+CRM) + troubleshooting 360° real (equirectangular 2:1, el visor móvil reescala solo) en vez del texto viejo de "stitching/18 fotos".
- ⏸️ No tocado por decisión del usuario: el botón "Crear plano demo con escenas actuales" (es función real de autoposicionar escenas; se deja el nombre tal cual).

**Auditoría panel de INICIO (dashboard) (2026-06-18) — "100% real" + todo en castellano:**
- ✅ **Data 100% real**: métricas calculadas de servicios reales (leadSummary, propertySummary, visitSummary, notifications, users, conversation counts). "Cobertura IA 0%" es real (cuenta conversaciones NO bajo control humano; como el usuario tomó el control, da 0%). Sin mocks.
- **Inglés → castellano** (pedido del usuario "no quiero palabras en inglés"):
  - Notificaciones (origen en código): "Follow-up needed" → "Seguimiento requerido" (`conversation-worker`); "Conversation follow-up resolved" → "Seguimiento resuelto" + bodies (`follow-up.ts`); subject "WhatsApp chat" → "Chat de WhatsApp".
  - Dashboard: "Stock disponible" → "Inventario disponible"; "leads" → "oportunidades"; "staff"/"workspace" → "equipo"/"espacio de trabajo".
  - Plan "Starter" → **"Inicial"** (dashboard, facturación y superadmin; id interno `starter` intacto; normaliza valor guardado).
- ⚠️ **Nota**: las notificaciones YA guardadas en la DB siguen mostrando el texto viejo (inglés) hasta que el usuario use "Limpiar todas"; las nuevas ya salen en español.
- Pendiente (otros paneles a limpiar de inglés si se quiere): Oportunidades, Inbox IA, Configuración, etc. (la tienda demo `workspace-store.ts` tiene inglés pero es showcase aparte, no afecta cuentas reales).

**Auditoría panel ENLACES DE WHATSAPP / Captación (2026-06-18):**
- ✅ **Data 100% real**: estado del canal (`getPlatformWhatsAppStatus`), canales del tenant (`whatsAppChannel`), solicitudes (`whatsAppChannelConnectionRequest`); QR/número/enlace `wa.me` del canal real conectado. Sin mocks ni componentes de dev/debug.
- 🧹 **Duplicado eliminado**: quitado el banner verde "Canal propio activo — +número" de arriba (repetía la tarjeta "Canal exclusivo activo / Marca Propia / 📱 número" que ya muestra el formulario). El `WhatsAppConnectionForm` es reutilizado (mismo de Integraciones), no duplicado.
- 🇪🇸 **Castellano**: "Links de WhatsApp" → "Enlaces de WhatsApp" (título + menú lateral + CTA del Inbox); "landing pages" → "páginas de captación"; "link" → "enlace"; "tracking/UTMs" → "seguimiento por origen / parámetros de campaña". Se dejan nombres propios/formatos (WhatsApp Business, Meta Ads, QR, PNG).

**Auditoría panel OPORTUNIDADES / CRM (lista + detalle) (2026-06-18):**
- ✅ **Data 100% real**: `listOrganizationLeads`, `getLeadSummary`, `createLeadAction` (alta), detalle con servicios reales. Sin mocks ni componentes temporales/dev; sin duplicados.
- 🇪🇸 **Castellano** (el producto usa "Oportunidad/Contacto"): "pipeline" → "embudo de ventas"; "lead/leads" → "oportunidad/oportunidades" (columna de nombre = "Contacto"); "Match (de inventario/automático)" → "Coincidencia"; "Email" → "Correo electrónico"; "link" → "enlace"; "Abrir lead" → "Abrir oportunidad"; placeholders/ejemplos de correo. Mensajes de éxito/error traducidos.

## 🏗️ DESARROLLOS ↔ CRM — paridad con Propiedades (2026-06-18, verificado runtime)

**Diagnóstico (el gap):** Desarrollos tenía capa transaccional (lotes, masterplan, reservas con pago) pero NO estaba enchufado al CRM como una Propiedad: `Lead` no tenía `developmentId`, la ficha del desarrollo no mostraba leads/visitas, y la IA no vinculaba el lead al desarrollo (por eso los interesados en Valles del Pino salían "Sin propiedad vinculada"). Disponibilidad por desarrollo y `Visit.developmentId` ya estaban de antes.

**Construido (`feat(developments): CRM parity`):**
- `Lead.developmentId` + `lotId` (scalar, sin FK; migración `20260618160000` + índice). Se aplica sola en deploy.
- **Vínculo automático lead↔desarrollo**: (a) el worker vincula cuando hay un único loteo con lotes y el lead califica / pide visita / está caliente-tibio; (b) `createAgentVisit` vincula al coordinar una visita a un desarrollo.
- **Ficha del desarrollo (tab Info)**: secciones nuevas **"Oportunidades vinculadas"** + **"Agenda de visitas"** (como en la ficha de propiedad). Server page trae `Lead`/`Visit` por `developmentId`.
- **Oportunidades**: muestra el nombre del desarrollo en vez de "Sin propiedad vinculada" para leads de loteo.
- ✅ **Verificado runtime**: una visita coordinada vincula el lead al desarrollo (`developmentId` seteado), aparece en Oportunidades con el nombre del loteo, y la visita queda atada al desarrollo para su ficha.
- ✅ **Ficha de la oportunidad** (`getLeadDetail`): resuelve el nombre del desarrollo → botón "Ver desarrollo relacionado", el título cae al nombre del loteo (no "Sin propiedad vinculada") y suma actividad "Desarrollo vinculado". `developmentId/developmentName` agregados a `LeadListItem`/`LeadDetail`. Verificado runtime. + inglés residual del historial traducido ("Lead" → "Oportunidad", "Sin email asignado" → "Sin correo asignado").

**Auditoría panel BANDEJA IA (Inbox / Conversaciones) (2026-06-18):**
- ✅ **Data 100% real**: `listOrganizationConversations` (Prisma). Sin componentes temporales/dev ni duplicados (la carpeta `[conversationId]` solo tiene la ruta `handoff`, no UI).
- 🇪🇸 **Castellano**: sección renombrada **"Inbox IA" → "Bandeja IA"** (elegido por el usuario) en sidebar, header, paginación ("Volver a la Bandeja"), onboarding, panel de prueba de WhatsApp y superadmin ("Ver en Bandeja"). "Ficha Lead" → "Ver oportunidad". El resto ya estaba en español ("Agente al control / IA en espera", "Envío fallido", "Pendientes/Errores"). Se deja "chat" (aceptado por RAE).

**Auditoría panel VISITAS (2026-06-18) — bug real encontrado y corregido:**
- 🐛 **Doble creación + debug en inglés filtrado**: el path automático viejo del worker creaba la visita EN PARALELO con `createAgentVisit` (duplicado) y volcaba `decision.internalNotes` (debug: "AI intent: … AI confidence: … routed to human") en la nota visible de la visita. **Deshabilitado**: las visitas del agente se crean SOLO al aceptar el cliente, vía `createAgentVisit` (nota en español = followUpReason). Se quitaron los imports muertos (`createVisitForAutomation`, `VisitAutomationError`) del worker.
- 🧹 **`sanitizeVisitNotes`**: limpia las notas YA guardadas con el debug viejo (rescata el motivo legible o cae a texto en español) en el tablero de Visitas y en la ficha de la oportunidad. Verificado: el texto filtrado → "Quiere visitar Valles del Pino el sabado a las 9".
- 🇪🇸 **Castellano**: "Ver lead" → "Ver oportunidad"; "ficha del Lead" → "ficha de la oportunidad"; "Lead desconocido" → "Contacto desconocido". El resto de la página ya estaba en español.
- ✅ Data real (`listOrganizationVisits`, `getVisitSummary`), sin componentes temporales.

**Auditoría panel PROPIEDADES + tarjeta de onboarding (2026-06-18):**
- ✅ **Propiedades 100% real** (`getPropertySummary`, `listOrganizationProperties`), todo en castellano (Disponible/Borrador/Público/Interno, "A consultar", "Ubicación pendiente"). Sin componentes temporales/duplicados.
- 🧹 **Footer flotante de onboarding eliminado**: el card fijo `fixed bottom-6` (`onboarding-footer.tsx`) se renderizaba en 4 páginas (Propiedades/Agentes/WhatsApp/Organización) con **paso hardcodeado** (Propiedades decía siempre "Paso 2 → conectá WhatsApp" aunque ya estuviera conectado), tapaba contenido y molestaba una vez hecho el setup. Removido de las 4 páginas + componente borrado.
- ➕ **Sidebar "Primeros pasos" (antes "Bienvenida") → `/onboarding`, ahora SIEMPRE visible** (antes se ocultaba al completar el onboarding) para repasar el progreso/guía cuando se quiera. Los usuarios nuevos siguen guiados por el banner "Tu cuenta requiere atención" del dashboard + la página `/onboarding` (que muestra el progreso real).

**Auditoría panel DESARROLLOS (lista + ficha) (2026-06-18):**
- 🎨 **Card de la lista rediseñado**: el card era texto plano "apagado" sin imagen. Ahora tiene **cabecera con el color de marca del desarrollo (`themeColor`) + logo** (ícono de fallback) + barra de progreso vendido/reservado. Se agregó `logoUrl`/`themeColor` al `listOrganizationDevelopments`.
- 🤖 **Hueco funcional cerrado — el agente IA ahora recibe info del DESARROLLO**: antes solo recibía datos por lote (nombre/ciudad/precio/superficie), NO los servicios ni la descripción del loteo. Ahora cada lote trae `developmentServices` (agua/luz/gas/cloacas/pavimento/seguridad…) y `developmentDescription`, y el prompt indica usarlos para responder "¿tiene agua/luz/gas?", "¿cómo es el barrio?" en vez de derivar.
- 📅 **Ficha del desarrollo → tarjeta "Horarios de visita"**: muestra los `AvailabilitySlot` atados a ese desarrollo + botón "Configurar →" (a *Configuración → Disponibilidad*), aclarando que el agente IA usa esos horarios para coordinar visitas a los lotes del loteo. (Cómo el agente toma la info: lotes disponibles + servicios/descripción del desarrollo + horarios de disponibilidad por desarrollo.)
- ✅ Data real; las secciones CRM (Oportunidades + Agenda de visitas) de la paridad CRM ya se ven en la ficha.
- 🖼️ **Imagen de portada elegible para la tarjeta** (`Development.coverImageUrl` + migración `20260618190000`): uploader "Imagen de portada (tarjeta) — foto, render o logo" en la ficha (Identidad de Marca). El card de la lista la muestra a sangre completa; fallback al logo sobre el color de marca, y luego gradiente + ícono. (Horarios de visita en ficha quedaron como ver + link, por decisión del usuario.)

**Auditoría panel AGENTES IA (2026-06-18):**
- ✅ Data real (`getAgentsForOrg`, `getAgentStatsForOrg`), form de edición y simulador "Probar agente" funcionales, todo en castellano. Sin componentes temporales.
- 🔎 **Hallazgo de arquitectura — UN agente por inmobiliaria**: `AiAgent.organizationId @unique` + el worker lo busca por organización + la API hace `upsert`. O sea **el multi-agente NO está construido** (crear un 2º agente chocaría con la restricción). La cuota `maxAiAgents` y el cartel "contactá a soporte para habilitar más" eran **engañosos**.
- 🩹 **Copy honesto**: reemplazado "Límite alcanzado. Para habilitar más agentes, contactá al soporte" → "Tu inmobiliaria opera con un agente IA que atiende todo tu inventario. Manejar varios agentes por zona o sector llegará próximamente."
- 💡 **Respuesta al usuario**: un agente se banca 200+ propiedades sin confundirse (no las lee todas: matchea por zona/tipo/presupuesto y ofrece ~3 relevantes; nunca lo reservado/vendido). Multi-agente por sector solo tendría sentido con números de WhatsApp distintos por marca → es feature a construir (agente por canal): pendiente si el usuario lo pide.

**Auditoría panel ACTIVIDAD AUTOMÁTICA (2026-06-18):**
- ✅ Data 100% real (conteos de `conversation`/`visit`/`availabilitySlot`/`lead.groupBy` por Prisma). Sin componentes temporales.
- 🔒 **Fuga técnica oculta**: "Redis conectado" → "Conectada", "Modo síncrono (dev)" → "Modo directo"; se quitó el nombre exacto del modelo "GPT-4.1" → "La IA" (no exponer interna ni envejecer el copy).
- 🇪🇸 **Castellano**: "intent" → "intención"; "Match de inventario" → "Coincidencia"; "bot"/"Bot:" → "agente"/"Agente:"; "leads" → "oportunidades"; "Ver lead" → "Ver oportunidad"; "captacion" → "captación". Label "Tasa de respuesta bot" → "Tasa de respuesta del agente" + hint "mensajes enviados / recibidos" (la >100% es real: el agente manda varios mensajes por cada uno recibido).

**Auditoría panel ADMINISTRACIÓN → WHATSAPP (2026-06-18):**
- ✅ Data real (`getPlatformWhatsAppStatus`, `whatsAppChannel`, `whatsAppChannelConnectionRequest`). Sin componentes temporales. Reusa `WhatsAppConnectionForm` (mismo de Captación) + secciones de Conexión Rápida (QR) y WhatsApp Business API (Meta).
- 🇪🇸 **Castellano**: "(QR Scan)" → "(escaneo de QR)"; form de Meta: "(Display Name)" → "(nombre visible)", "Email de contacto" → "Correo de contacto" (+ placeholder y texto de confirmación); "deriva el lead" → "deriva la oportunidad". Se dejan marcas/siglas (WhatsApp Business, Meta, API, QR, PNG).

**Auditoría panel DISPONIBILIDAD (2026-06-18):**
- ✅ Data real (`listAvailabilitySlots`, miembros, propiedades, desarrollos). Sin componentes temporales. Form con dropdowns de Agente/Propiedad/Desarrollo (ya existían).
- 🇪🇸 **Castellano** del texto de ayuda "¿Cómo usa el agente IA estos horarios?": "slot(s)" → "franja(s)", "lead" → "prospecto".
- 🩹 **Texto corregido a la conducta real**: decía "el agente busca el próximo slot y propone fecha y hora concreta" (auto-agendaba) → ahora "el agente OFRECE las franjas; vos confirmás el horario final". Y "primero slots vinculados al agente asignado del lead" (inexacto: el worker no prioriza por agente) → "generales + propiedad + desarrollo que consulta el prospecto". + guía: para visitas a lotes de un loteo, atar la franja al **desarrollo** (no a la propiedad). [Nota: las franjas del usuario están atadas a "Prop: Valles del Pino"; para el flujo de lotes conviene atarlas al desarrollo.]

**Auditoría panel EQUIPO / Usuarios (2026-06-18):**
- ✅ Data real (`listOrganizationUsers`, `getUserRoleBreakdown`). Editar miembro = dialog autocontenido (`updateMemberProfileAction`, con campos teléfono/WhatsApp). Sin componentes temporales.
- 🐛 **Fix del 404 reportado** ("al conectar el número del asistente saltaba ruta no encontrada"): el **enlace de invitación** se armaba SOLO con `NEXT_PUBLIC_APP_URL`; si esa env estaba mal/sin setear/localhost en prod, el link apuntaba a un host muerto → "ruta no encontrada". Ahora `inviteUserAction` deriva la base del **host real del request** (donde opera el admin, siempre accesible), con fallback a la env (ignorando localhost) y luego al dominio de prod. (La ruta `/invite/[token]` existe y maneja bien tokens inválidos/usados/vencidos con pantalla amigable, no 404.)
- 🇪🇸 **Castellano**: "Email" → "Correo electrónico" (dialog); "leads" → "oportunidades"; se quitaron los paréntesis en inglés de los roles (Titular/Administrador/Agente de ventas/Asistente, sin "Owner/Admin/Agent/Assistant").

**Auditoría panel ORGANIZACIÓN (2026-06-18):**
- ✅ Data real (perfil de la org). La **sincronización de propiedades desde URL** es REAL (no stub): el endpoint `api/properties/sync-from-source` usa `syncPropertiesFromUrl` para fetchear el listado del sitio y crear/actualizar Property (con estados IDLE/SYNCING/OK/ERROR). Sin componentes temporales.
- 🇪🇸 **Castellano**: "Perfil Enterprise" → "Perfil de empresa"; "Identificador (slug)" → "Identificador único" + "tenant" → "tu organización"; "Email institucional" → "Correo institucional"; "Error en sync" → "Error de sincronización".

> ✅ **CONFIGURACIÓN completa**: Disponibilidad · Equipo · Organización · (WhatsApp ya estaba). Queda solo el **Catálogo público** (lo que ve el cliente).

**Auditoría SOPORTE TÉCNICO + fix del bot de soporte (2026-06-18):**
- ✅ "Soporte Técnico" (sidebar/menú/error) = enlace `wa.me` real al número maestro de la plataforma `SUPPORT_WHATSAPP_NUMBER=5491166037990` (+54 9 11 6603-7990), mensaje en español, helper único en `constants.ts`. Confirmado por el usuario: es el número de la plataforma, conectado como canal.
- 🐛 **Bug crítico encontrado y corregido**: al escribir al número de soporte, **el agente IA COMERCIAL de la org plataforma auto-respondía** desviando los pedidos ("soy asesor comercial… contactá al equipo de soporte… ¿buscás propiedades?") en vez de dejar el mensaje en el panel **Superadmin → Soporte** para respuesta humana. Fix en el worker: si `targetOrgId === WHATSAPP_ORGANIZATION_ID` (org plataforma), se persiste la conversación/mensaje (aparece en el panel) pero **NO se genera respuesta IA** (`reason: "platform-support-org"`).
- ⚠️ **REQUIERE**: `WHATSAPP_ORGANIZATION_ID` seteada en el **servicio WORKER** de Railway (no solo en el web). Si falta en el worker, el bot sigue respondiendo. (Patrón conocido: el worker es servicio aparte con sus propias env vars.) → **Usuario confirmó: está en los 2 servicios.**

**Auditoría CATÁLOGO PÚBLICO (`/cat/[orgSlug]` + ficha propiedad + ficha desarrollo + ficha lote) (2026-06-18):**
- ✅ **Data 100% real**: org, desarrollos (`ACTIVE` + `publicVisible`), `listPublicPropertiesByOrgSlug`, y el **formulario de contacto** crea oportunidad real (`createLeadFromPublicPropertyAction`). Sin componentes temporales/mock/coming-soon.
- ✅ **Sin inglés visible** (lo único en inglés son comentarios de código `/* Premium… */`, no visibles). Cards de propiedad muestran foto real (`primaryImage`).
- 🎨 **Mejora**: el card de desarrollo del catálogo mostraba solo un emoji 🗺️; ahora usa la **imagen de portada** (`coverImageUrl`) del desarrollo, con fallback al emoji. Cara pública más prolija.

> ✅ **AUDITORÍA PANEL POR PANEL COMPLETA**: Inicio · Enlaces WhatsApp · Oportunidades · Desarrollos↔CRM · Bandeja IA · Visitas · Propiedades · Desarrollos · Agentes IA · Actividad automática · Administración WhatsApp · Disponibilidad · Equipo · Organización · Soporte Técnico · **Catálogo público**.

**Recordatorios automáticos de visita (2026-06-18, verificado runtime):**
- 🔔 Nuevo: ~24 h antes de una visita próxima, el sistema avisa **al prospecto por WhatsApp** ("te recordamos tu visita a X el <fecha> hs…") y **a la inmobiliaria/agente por push** ("⏰ Recordatorio de visita").
- Implementación: `Visit.reminderSentAt` (migración `20260618210000`) para idempotencia; `processVisitReminders()` (`src/modules/visits/reminders.ts`) corre **cada 15 min desde el worker** (`start.ts`), procesa visitas PENDING/CONFIRMED con `scheduledAt ∈ (ahora, ahora+24h]` y sin recordatorio previo. Envío WhatsApp reutiliza `resolveActiveChannelByOrgId` + `attemptWhatsAppOutboundDelivery`; push con `notifyVisitReminder`.
- ✅ Verificado runtime: detecta la visita en ventana, marca `reminderSentAt`, no reenvía. ⚠️ Requiere VAPID + canal activo en el **worker** (ya estaban) para que el envío real funcione.

**Bandeja IA — historial scrollable (2026-06-18):** el inbox traía solo 3 mensajes por conversación; ahora trae 50 (historial completo del prospecto) + `min-h-0` en la columna del chat para que el feed scrollee internamente. Permite revisión/análisis manual del prospecto deslizando los mensajes viejos.

**Responsive móvil — Bandeja IA + Desarrollos (2026-06-18):** (importante por la app móvil de Raíces Pilot)
- **Bandeja IA**: el chat y el panel lateral inteligente iban siempre lado a lado → en celular aplastaban el chat. Ahora **apilan en móvil** (panel a ancho completo debajo del chat), el feed de mensajes tiene alto acotado en móvil (`max-h-58vh`, scroll interno), y la altura fija + grid de 2 columnas aplican solo en `lg`. Ya tenía botón "Volver a conversaciones" en móvil.
- **Desarrollos (wizard)**: el header desbordaba en celular → "Volver a proyectos" ahora muestra solo la flecha, el progreso (X/5) se oculta en móvil y el nombre del desarrollo se trunca. El tab nav scrollea limpio en móvil (tabs a ancho de contenido) y se reparte parejo en escritorio. (Las herramientas de plano/masterplan/editor siguen siendo de escritorio por naturaleza.)

**Landing pública — sin humo (2026-06-18):** se alineó con lo real tras la auditoría.
- 🚫 **Humo corregido**: el hero decía que la IA "agenda visitas directamente en tu calendario, 100% autónoma" → falso desde el modelo humano-confirma. Reescrito a lo real: la IA califica, recomienda **propiedades y lotes**, y **coordina visitas según tu disponibilidad — siempre con tu confirmación** ("la IA ayuda a vender, vos tomás el control en el cierre").
- "Cómo funciona": pasos 2 y 3 actualizados al flujo real (IA coordina visita → el humano confirma el horario y cierra) + mención de **recordatorios automáticos** de visita.
- ✅ Resto de la landing ya era honesto (sin overclaims: no hay "100%/garantiza/autónoma/x2" en los componentes). DevelopersSection/Tour360 conservadores, se dejan.
- 🧱 **Amplitud del producto** (la landing estaba muy centrada en IA): la grid principal pasó de "beneficios de IA" a los **4 pilares reales** → (1) Atención con IA por WhatsApp 24/7, (2) CRM inmobiliario (oportunidades, embudo, agenda de visitas + recordatorios, equipo con roles), (3) Catálogo y fichas que venden (público, fotos, tours 360°), (4) Desarrollos y loteos (masterplan interactivo, lotes en tiempo real, reserva online). Heading: "Mucho más que un bot: una plataforma completa".
- 🗺️ **Ubicación geográfica / mapas**: agregado al pilar de catálogo. Real: `PropertyLocationMap` (MapLibre GL, estilo CartoDB gratuito sin API key) muestra **pin exacto** o **zona aproximada difusa** (privacidad), `enableMap` por defecto activo (`NEXT_PUBLIC_ENABLE_PROPERTY_MAP !== "false"`). Desarrollos: masterplan georreferenciado sobre satelital. ✅ **Confirmado por el usuario: el mapa con los pines se ve en el catálogo público.** Corregido el copy de la ficha de propiedad del workspace que decía "futuro mapa público" → ahora "se muestra en tu catálogo público" + explica pin exacto vs zona aproximada.
- 🔎🛒 **Portal/app de COMPRADORES + filtros (faltaba en la landing)**: descubrí que existe un **portal B2C real** en `/propiedades` (PWA propia: `manifest-b2c.json` + `sw-b2c.js`) que **agrega las propiedades públicas de TODAS las inmobiliarias** con **filtros avanzados** (operación, tipo, zona, precio, ambientes, baños, superficie, sup. total, cochera, apto crédito, apto profesional, mascotas, con video/plano/360°, moneda, fecha). Son **DOS apps**: la del panel (inmobiliarias, `manifest.json`) y la de compradores (`/propiedades`). Agregada sección a la landing: "Tus propiedades, donde la gente busca" — chips de filtros + las dos apps + CTA al portal. (El catálogo por inmobiliaria `/cat/[orgSlug]` tiene filtros básicos op/360; el portal global tiene los avanzados.)
- 🌎 **LATAM + modelo de precio (regla comercial oficial del dueño)**: hero con línea "Para toda Latinoamérica (multimoneda)" + el portal habla a "compradores e inversores de toda Latinoamérica" (real: multimoneda ARS/USD/UYU/CLP/MXN/PYG). **Modelo de precio**: "No cobramos por publicar" (sin límite ni costo por aviso); la suscripción es por las herramientas (CRM, WhatsApp, IA, automatizaciones, reservas, estadísticas, equipo, multimedia, desarrollos). Hero trust line + callout en la sección del portal. (Guardado en memoria `pricing-model`.) ✅ **Alineado** (`cb26cc7`): el catálogo `/cat` y el portal `/propiedades` no tienen paywall por suscripción (solo `isActive` + `publicVisible`), así que las orgs en prueba YA publican público. El master-manual decía erróneamente que en TRIALING "la página pública permanece inactiva" → corregido a SÍ + descripción "publicar es gratis desde el día uno". Lo único reservado a clientes pagos es el carrusel "Quienes ya usan" de la landing (filtra `subscription.status ACTIVE`).
- 🧹 **MobilitySection**: mockup del sidebar actualizado a la nomenclatura nueva (Primeros pasos / Enlaces de WhatsApp / Oportunidades / Bandeja IA). **Form de demo** verificado: funciona (valida + abre WhatsApp al número de ventas con los datos). **Borrado código muerto** `hero-showcase.tsx` (no usado, tenía "Lead" en inglés). Resto de componentes (carrusel, Tour360, Developers, Navbar) sin humo ni inglés.
- 🥽 **Tour 360° honesto — visor real, captura "Próximamente"** (`4c2f1d8` · `8ec6301`): la sección vendía el **"Escáner por Giroscopio"** (crear el tour con el celular) como función terminada → es próximamente. Reencarada para vender lo real (el **visor**): titular "Mostrá cada propiedad como si estuvieran ahí", 3 bloques reales del visor (recorrido inmersivo / sin apps / viviendas y desarrollos) + 1 bloque de captura con badge **"Próximamente"**. El mockup del celular pasó de pantalla de escaneo a **visor navegable** que **alterna dos tours** (vivienda ↔ loteo) con crossfade, HUD por escena (nombre, ambientes, tipo, indicador). Las **dos escenas son panoramas 360° equirectangulares reales**: loteo = aéreo REAL de Valles del Pino (de los uploads → 47 MB→131 KB en `/landing/tour/loteo-360.jpg`); vivienda = interior de un living **CC0 de Poly Haven** (`lythwood_lounge`, 8192×4096 → 73 KB en `/landing/tour/vivienda-360.jpg`, `975ae08`). Ambas panean como tour real. Carrusel slide 3 también corregido ("creá solo con tu celular" → "mostrá/recorré"). Limpieza de `**` markdown literales. 💡 La escena vivienda se puede swapear por un 360 real de un cliente cuando lo tengan.
- ✍️ **Pasada de copy de toda la landing** (`8195f9c`): ortografía/voseo/castellano. "empeza"→"empezá", "Configura"→"Configurá", "Raices/RAICESPILOT"→"Raíces/RAÍCES" (acentos), "Real Estate"→"Inmobiliaria"/quitado del alt (sin inglés), "Comienza Hoy"→"Empezá hoy", "25 de Mayo"→"25 de mayo", "A configuración"→"Ir a configurar", "Probar Demo en WhatsApp"→"Probar demo por WhatsApp", "el link"→"el enlace" (form solicitar-acceso). **Coherencia de modelo**: el chat del hero ya no dice que la IA "agenda" sola → "reservé el horario y tu asesor confirma la visita" (alineado con humano-confirma). **Portal de compradores** (`61da4be`): reescrito el inciso trabado "—además de en tu propio catálogo—" → "Publicás una vez y tu propiedad queda en tu catálogo y también en el portal y app…". **Title global del sitio** (`08ed106`): en `src/app/layout.tsx` (metadata) "RaicesPilot | Infraestructura Operativa Inmobiliaria" → "Raíces Pilot | Infraestructura Operativa Inmobiliaria". Validado `git diff --check` + `tsc` + `next build` (exit 0). ✅ **Verificado en prod**: el `<title>` público ya muestra "Raíces Pilot | Infraestructura Operativa Inmobiliaria". Alcance: solo metadata/title — sin tocar CTAs, WhatsApp, worker, Prisma, migraciones, base de datos, Railway ni lógica de negocio.

**Flujo público "Solicitar demo" — Fase 1 COMPLETADA** (merge `1ed8511`, rama `fix/unify-demo-cta`): había varios CTAs compitiendo ("Probar demo por WhatsApp", "Solicitar Acceso", "Solicitar demo para mi desarrollo") que **prometían probar una IA** pero en realidad caían en **soporte humano** (el número va a la org plataforma, bloqueada por el guard del worker). Se ordenó:
- ✅ **CTAs públicos unificados bajo un único "Solicitar demo"** (hero, navbar, carrusel, desarrolladoras, form).
- ✅ Se **normalizó/eliminó "Probar demo por WhatsApp"** como promesa de IA interactiva → "Solicitar demo".
- ✅ El **2º botón del carrusel** ("Solicitar Acceso" → #contacto) quedó como **"Acceder"** (`/login`, clientes existentes; ya no compite).
- ✅ Textos prellenados de WhatsApp centralizados en `constants.ts` (`DEMO_WHATSAPP_TEXT[_DEVELOPER]`). **El número sigue siendo `5491166037990`** (sin cambios).
- ✅ Copy honesto: la demo actual es **comercial/guiada por una persona** del equipo; el **acceso operativo real queda sujeto a validación manual** (sin publicación ni acceso real automático). No se insinúa IA interactiva.
- 🔒 **Sin tocar**: worker, channel-resolver, Evolution, Prisma, migraciones, base de datos, Railway ni variables de entorno. Validaciones OK: `tsc` limpio + `next build` exit 0.
- ⛔ **Fase 2 — demo IA real (PENDIENTE, NO terminada):** conectar un **número de WhatsApp separado** para la demo IA real → asociarlo a una **org demo/sandbox** (ej. `raicespilot-qa-test`, IA ya activa) con propiedades de muestra → activar **IA recepcionista/triage** (clasifica demo/inmobiliaria/desarrolladora/martillero/soporte y capta datos, sin aprobar accesos) → **crear/diseñar flujo de solicitudes con estados** (`NUEVA_SOLICITUD · EN_REVISION · FALTA_INFORMACION · DEMO_HABILITADA · VALIDADO_OPERATIVO · RECHAZADO · DERIVADO_A_SOPORTE`, requiere modelo + migración) → **validar inmobiliarias, desarrolladoras y martilleros/corredores antes de permitir publicación real**. La demo IA real **NO está terminada**.
- ⚠️ **Fase 2B preparada en RAMA LOCAL — pendiente de org demo, número demo, pruebas reales y merge.** (NO en producción.)
  - **Rama local:** `feat/reception-prompt-demo` · **commit:** `84fbf2e`. Estado: **NO mergeado a `main`**, **NO pusheado**, **NO desplegado en producción**. `main` sigue limpio en `b6e5135`, working tree limpio.
  - **Archivo preparado en la rama:** `src/modules/automations/decision-service.ts` (único, +101 líneas, 100% aditivo). **Cambio:** prompt **recepcionista/triage a nivel código** para la demo IA (clasifica demo/inmobiliaria/desarrolladora/martillero/soporte, capta datos, deriva soporte a `5491166037990`, cierra con mensaje de validación manual; mismo contrato JSON de salida).
  - **Activación prevista:** marcador **`[[MODO_RECEPCION]]`** en el campo *Personalidad* del agente de la futura org `raicespilot-demo`. **Alcance previsto:** solo la org demo/sandbox; sin marcador el comportamiento de ventas queda idéntico.
  - **Hoy NO afecta:** Panel Admin Inmobiliario, Panel Superadmin, producción, `raicespilot-qa-test`, soporte/plataforma. **No toca** worker, channel-resolver, Evolution, webhooks, Prisma, migraciones, base de datos, Railway ni variables de entorno.
  - **Pendiente (en orden):** (1) crear/preparar org `raicespilot-demo`; (2) conectar número demo separado por Evolution/QR; (3) cargar datos demo; (4) activar IA en la org demo; (5) pegar `[[MODO_RECEPCION]]` en el agente demo; (6) probar runtime por WhatsApp real; (7) recién después decidir si mergear `feat/reception-prompt-demo` a `main`; (8) recién después cambiar el CTA "Solicitar demo" al número demo.

**Manual de Uso actualizado (2026-06-18):** se puso al día con todo lo de la sesión.
- Visitas/Disponibilidad: modelo "la IA ofrece, vos confirmás" + horarios por desarrollo; la visita cae en Visitas + CRM.
- Desarrollos: imagen de portada + servicios en "Información general", y bloque nuevo "El agente IA y el CRM del desarrollo" (ofrece lotes, responde servicios/descripción, oportunidades + agenda de visitas en la ficha).
- Agentes IA: nota de un agente por inmobiliaria que maneja todo el inventario (matchea por consulta; multi-agente próximamente).
- "Conversaciones" → "Bandeja IA"; "lead/leads" → "oportunidad/oportunidades"; typos de Captación corregidos ("Captacion/Como/codigo/Donde" → con tilde, "link" → "enlace").

---

## 1. IDENTIDAD DEL PRODUCTO

**Auditoría (respondida)**
- **¿Qué es Raíces Pilot hoy?**
  R: Una **plataforma operativa inmobiliaria** que une WhatsApp + IA + CRM + portal público + masterplan de lotes. No es solo un CRM: atiende, califica y agenda automáticamente, y opera el inventario (incluido el plano transaccional de lotes).
- **¿Qué problema principal resuelve?**
  R: La **pérdida de leads por respuesta tardía y gestión desordenada** (WhatsApp manual + Excel + PDF). Responde 24/7, perfila al interesado y lo carga al CRM solo.
- **¿La landing comunica correctamente ese problema?**
  R: ✅ Sí. El hero ("Tu inmobiliaria en Piloto Automático") + la bajada explican atención 24/7 por WhatsApp, calificación de prospectos y agenda automática.
- **¿La propuesta de valor es clara en menos de 10 segundos?**
  R: ✅ Sí, el hero lo logra. ⚠️ Falta segmentar para desarrolladoras/loteos (sección pendiente, §2/§35).
- **¿Existe coherencia entre landing y producto?**
  R: ✅ En lo nuclear (WhatsApp/IA/CRM/portal). ⚠️ La landing aún no muestra Masterplan/Reservas (están 🟡 beta), lo cual es correcto para no prometer de más.
- **¿La demo coincide con lo que se vende?**
  R: ✅ Para el flujo inmobiliaria tradicional. ⚠️ Para desarrolladora/loteadora falta el recorrido específico (§43/§46).

**Estado:** 🟢 CRM · 🟢 WhatsApp+IA · 🟢 Portal · 🟡 AgentOS · 🟡 Desarrollos

---

## 2. LANDING PÚBLICA

**Comercial:** ☐ Hero · ☐ CTA principal · ☐ CTA secundaria · ☐ Sección WhatsApp · ☐ Sección IA · ☐ Beneficios · ☐ Tour 360 · ☐ Captación · ☐ Casos de uso
R: Hero ✅, CTA principal "Solicitar demo" ✅, CTA secundaria "Acceder" ✅, Beneficios ✅, Cómo funciona ✅, Tour 360 ✅, formulario de contacto ✅. **Falta:** sección de casos de uso por vertical y sección Desarrolladoras.

**UX:** Mobile/Tablet/Desktop responsive ✅ (Tailwind, navbar con menú mobile). UltraWide ☐ por validar.

**Conversión:** Solicitar Demo (WhatsApp) ✅ · Solicitar Acceso (form `AccessRequestForm`) ✅ · Tracking ☐ (sin analítica de eventos confirmada).

**Implementado esta sesión**
- ✔️ Link **"Contacto"** en navbar (`677977b`)

**App móvil (PWA)**
- ✔️ **Rediseño premium del hero `/app-movil`** (`0148248`): fondo fotográfico B2B + gradiente de legibilidad, tarjeta de texto glassmorphism, y mockup de iPhone en perspectiva 3D (status bar/notch, notificaciones push estilo banner iOS, grilla de apps y dock con badge). Validado (tsc) + pusheado a prod.
- ✔️ Landing `/app-movil` + botón "App" en navbar (`b438a32`)
- ✔️ Service worker passthrough + registro → la app es **instalable** (Desktop/Android/iPhone) (`b438a32`)
- ✔️ Rutas `/app-movil` y `/sw.js` hechas públicas en middleware (`0052174`)
- ✅ **Web Push REAL (Fase 1) — VERIFICADO EN PROD** (`ff1bc58`): SW con handlers `push`/`notificationclick`, modelo `PushSubscription` + migración aplicada, helper `web-push`, server actions (guardar/borrar/enviar prueba), y "Activar Alertas" suscribe + manda notificación de prueba. **Probado: la notificación llega en producción.** VAPID cargadas en Railway.
- ✅ Acceso **"App móvil y alertas"** en el sidebar del panel → `/app-movil` sin desloguear (resuelve la PWA sin barra de direcciones) (`5dbd6ef`).
- ✅ **Fase 2 — push automático real** (`d7fbf54`): "Nuevo lead" cuando la IA crea un lead desde WhatsApp (conversation-worker) y "Visita agendada" en `createVisitForAutomation` (cubre manual + worker IA). Best-effort, no bloquea los flujos. Falta verificar funcional con un WhatsApp entrante real.
- ✅ **Navbar de `/app-movil` = el de la landing (VERIFICADO EN PROD)** (`a7382bf`, rama `fix/app-mobile-navbar-layout` mergeada): es el **mismo componente** `Navbar`, pero en `/app-movil` heredaba **Inter** del `<body>` (más ancha que el `font-sans` que hereda en la landing) → en desktop partía los links en 2 líneas ("Cómo funciona", "Tour 360°", "Solicitar demo") y pegaba "App" al toggle de tema. Fix: `font-sans` en el `<header>` del navbar (misma fuente en todas las páginas) + `whitespace-nowrap` en links y "Solicitar demo". No-op para la landing. (Antes: intento fallido con prop `solid` que sacaba el toggle — revertido en `d852bf4`.)

**App B2C "Inmuebles" (compradores)**
- ✅ App pública en `/propiedades` separada de la B2B: `manifest-b2c.json` (id/scope `/propiedades`, splash blanco) + `sw-b2c.js` **passthrough SIN push** (compradores nunca reciben notificaciones) (`58f2d6f`).
- ✅ SW B2C acotado a scope `/propiedades` para **no pisar** el `sw.js` del panel B2B (que maneja el push) — fix mío sobre la implementación de Antigravity.
- ✅ Botón "App Móvil" en el navbar de `/propiedades` (prompt / iOS / fallback manual) en vez de banner flotante.
- ✅ `id` agregado a ambos manifests → Chrome los trata como 2 apps instalables distintas.
- ✅ `/manifest-b2c.json` y `/sw-b2c.js` públicos en middleware (`8eb9b02`). Todo verificado en prod (200).
- ✅ **Header limpio en app instalada/PWA** (merge `1249cf2`, rama `fix/pwa-hide-commercial-cta`, commit de trabajo `ea6a366`): en `/propiedades`, cuando el consumidor abre la **app instalada (`display-mode: standalone`)**, se ocultan del header **"App Móvil"** (ya está dentro de la app), **"Volver al Inicio"** (lleva a la landing comercial, innecesaria adentro) y **"Panel Admin"** (es para inmobiliarias, no para compradores) → queda **solo el logo/marca**. En **navegador normal sigue igual** (los 3 botones se ven). Implementado con CSS `@media (display-mode: standalone)` vía variante arbitraria de Tailwind (`!hidden`), sin JS. Archivos: `src/app/propiedades/page.tsx` + `src/components/pwa/install-app-navbar.tsx`. Validado `git status`/`diff --check`/`tsc`/`next build` (exit 0; el CSS `display-mode:standalone` quedó generado). Alcance: solo el header del portal público — **sin tocar** Panel Admin, Superadmin, CRM, propiedades/desarrollos internos, reservas, WhatsApp, AgentOS, worker, Prisma, migraciones, base de datos, Railway ni variables de entorno.
- ✅ **Tarjetas mobile compactas — COMPLETADO** (merge `1786f51`, rama `fix/propiedades-mobile-cards`, commit de trabajo `bf8814f`): en `/propiedades` las cards del listado mobile (`MediumCard` y `DevelopmentMediumCard` en `src/components/properties/public-map-wrapper.tsx`) eran muy altas y apretadas. Se compactaron: **imagen mobile ~128px** (`w-32 sm:w-40 lg:w-[210px]`), **menor altura** (`min-h-[140px]` mobile, `lg:min-h-[230px]`), **anti-colisión** (`gap-2` + `min-w-0`) para que superficie/lotes no choquen con "Ver ficha"/"Ver lotes", y en desarrollos/loteos la **descripción se oculta en mobile** (`hidden sm:line-clamp-2`). **Desktop protegido/restaurado con clases `lg:`**. Resultado: más propiedades por pantalla, sin datos encimados. Validado `git status`/`diff --check`/`tsc`/`next build` (exit 0). Alcance: solo la UI pública del portal — **sin tocar** Panel Admin, Superadmin, CRM, propiedades/desarrollos internos, reservas, cobros, WhatsApp, AgentOS, worker, Prisma, migraciones, base de datos, Railway ni variables de entorno.
- 📋 **Modelo de DESTACADOS / premium — AUDITADO, NO IMPLEMENTADO** (Fase B): modelo comercial futuro = **publicar sigue gratis e ilimitado**; la monetización adicional **no es por publicar sino por visibilidad/posicionamiento** en `/propiedades` (las publicaciones normales se siguen encontrando gratis por filtros/búsqueda/ubicación/inmobiliaria/mapa; el destacado es un **plus opcional** para aparecer primero). **Orden futuro sugerido:** 1) Premium · 2) Preferente/Superior · 3) Destacado · 4) Normal; dentro de cada nivel por fecha de activación/contratación o de publicación. **Precios tentativos a definir:** Destacado ARS 10.000 · Preferente/Superior ARS 20.000 · Premium ARS 30.000/35.000.
  - **Estado actual detectado:** hoy `/propiedades` ordena por **`createdAt desc`**; **no** hay orden real por premium/destacado; `Property.isFeatured` **existe en schema pero NO debe usarse** todavía (drift con la DB productiva/Railway — comentario en `page.tsx:196`); **no** hay tracking de vistas/ranking del portal; **no** se implementó Mercado Pago ni Superadmin Comercial; **no** se tocó Prisma ni se crearon migraciones.
  - **Fase C futura (pendiente, con autorización):** diseñar modelo de datos limpio para destacados (resolver el drift antes de tocar `isFeatured`, o reemplazarlo por una **tabla dedicada** `FeaturedListing`); niveles de visibilidad + ordenamiento por nivel; vencimientos (`featuredUntil`); link de pago Mercado Pago; reflejar pagos/vigencias/balance en **Superadmin Comercial / Publicidad destacada**; mantener claro el modelo: **publicar gratis, cobrar por herramientas + visibilidad opcional**.

**Sección Desarrolladoras / Loteos**
- ✔️ **Implementada y en prod** (`0907f4f`): `DevelopersSection` (chip + título + bajada + 3 tarjetas: Masterplan interactivo / Disponibilidad en tiempo real / Tour 360°) + CTA a WhatsApp con mensaje pre-cargado. Link "Desarrollos" (`#desarrollos`) en navbar (desktop + mobile). Copy honesto: solo lo que el producto ya hace, sin prometer "seña/pago online" (Reservas/MP no GA).

**Pendiente**
- 🟠 Sección Masterplan / Reservas (depende de GA)

**Estado:** 🟢 Landing principal · 🟢 Sección Desarrolladoras · 🟠 Masterplan/Reservas en landing

---

## 3. PANEL ADMIN INMOBILIARIO

**Inicio:** Dashboard ✅ · KPIs ✅ · Actividad reciente ✅ · Notificaciones ✅ · Bienvenida ✅ · Continuar configuración ✅

**Bienvenida — auditoría**
- **¿Flujo correcto?** R: ✅ Sí; el onboarding vive en `/onboarding` con checklist de pasos.
- **¿UX correcta?** R: ✅ El header muestra progreso (X/Y pasos) y CTA único.
- **¿Duplicidades?** R: ❌→✅ **Corregido esta sesión**: había doble "Continuar configuración" (header + card) y el ítem "Bienvenida" seguía en el menú tras completar. Ahora el CTA es único y "Bienvenida" se oculta al completar (`58d2f6e`).

**Estado:** 🟢 Dashboard/Leads/Conversaciones/Visitas/WhatsApp/Equipo/Organización · 🟢 Bienvenida (era 🟡)

---

## 4. CRM INMOBILIARIO

**Leads:** Captación ✅ · Pipeline ✅ · Prospectos→**Oportunidades** ✅ · Conversaciones→**Inbox IA** ✅ · Visitas ✅
**Operación:** Recordatorios/Seguimiento/Estados/Historial ✅

**Implementado esta sesión:** ✔️ "Prospectos" → "Oportunidades" en UI (`ab17688`)

**Estado:** 🟢 Producción

---

## 5. WHATSAPP CLOUD — 🟢 Producción
Canal oficial: recepción/envío/webhooks/historial ✅. IA: respuesta automática, clasificación, agenda, recomendación, escalado humano ✅.
- 🎤 **La IA entiende y responde NOTAS DE VOZ** (`57bf4e6`): antes los audios entrantes se descartaban en el webhook (`ignoredEmpty`) y el prospecto quedaba en visto. Ahora el webhook detecta `audioMessage`/ptt → el worker baja el audio de Evolution (`getBase64FromMediaMessage`) → lo transcribe con OpenAI (whisper-1, es) → sigue el flujo normal como si fuera texto. **Fallback**: si está apagada o falla, la IA pide que escriban el mensaje (nunca queda en visto). **Compuerta** en Superadmin → Settings → "Inteligencia Artificial" (`AI_AUDIO_TRANSCRIPTION_ENABLED`, default ON). Bonus: ahora se captura el caption de imágenes. ⚠️ **La transcripción corre en el WORKER (servicio aparte) → necesita `OPENAI_API_KEY` en sus env vars**; si no la tiene, los audios caen al fallback. ✅ **VERIFICADO EN PROD por el usuario: mandó una nota de voz y la IA respondió bien** (la `OPENAI_API_KEY` del worker está OK).
⛔ *No se toca sin autorización (área crítica).*

---

## 6. PROPIEDADES — 🟢
Gestión (crear/editar/publicar/ocultar/multimedia) ✅. Multimedia (imágenes/videos/planos/PDF/Tour 360) ✅.
- **Verificar persistencia de guardado:** R: ☑ Investigado a fondo — el "no guardado" del Admin era **tema de sesión/cookie cross-host**, no del código. Resuelto con `SESSION_COOKIE_DOMAIN=.raicespilot.com` + UX de sesión expirada.

---

## 7. TOUR 360 PROPIEDADES — 🟢 subida de 360° reales · 🟠 creación con celular
- ✔️ **Subir imágenes 360° reales** (cámara 360° profesional) → **habilitado** (`d2372b0`)
- 🟠 **Crear tour 360° con el celular** (panorámica + video→escena) → marcado **"Próximamente"** (aún no definido) (`d2372b0`)
- ✔️ Textos del **onboarding paso 5** y **manual de uso** realineados: promueven subir imágenes 360° reales y marcan la captura con celular como "Próximamente" (`74873cf`)

## 8. CATÁLOGO PÚBLICO — 🟢

**Tenant:** URL pública ✅ · Filtros ✅ · **SEO** ✅ · Responsive ✅
**Ficha pública:** Galería ✅ · WhatsApp ✅ · Formulario ✅ · Plano ✅ · Tour ☐(según propiedad)

**Implementado esta sesión:** ✔️ **SEO**: la ficha de lote pública ahora emite metadata propia (título/descr/OpenGraph) en vez del fallback genérico (`6921388`). Las fichas de propiedad/desarrollo/catálogo ya tenían `generateMetadata`.

---

## 9. PORTAL GENERAL — 🟢 Producción (búsqueda/filtros/mapa/fichas/performance ✅)

## 10. MAPA PÚBLICO — 🟢 portal · 🔴 `/map` legacy
- ☑ `/map` legacy cerrado (ver §29). Leaflet: performance/marcadores/popup/cluster ✅.

## 11. DESARROLLOS
- Paso 1 Info ✅ · Paso 2 Plano ✅ · Paso 3 Inventario ✅ · Paso 4 Editor Visual 🟠 · Paso 5 Mapa 🟡
- ⛔ GA de Paso 4/5 depende de validación de feature.

## 12. MASTERPLAN — 🟡 Beta — ⛔ (lotes/estados/precios/SVG/PDF/DXF/capas)

## 13. EDITOR VISUAL — 🟠 Próximamente — ⛔

## 14. MAPA INTERACTIVO — 🟡 Beta
- ☑ **Persistencia validada** (🟢). Overlay/escala/rotación ✅.

## 15. TOUR 360 DESARROLLOS — 🟠 Próximamente — ⛔

## 16. RESERVAS — 🟡 Beta — ⛔ *(PAY-LOCK / Mercado Pago — no tocar)*

## 17. COBROS (Mercado Pago) — 🟡 Beta — ⛔ *(no tocar)*

## 18. AGENTES IA — 🟡 Beta — ⛔ *(internals AgentOS)*
- ❌→✅ **FIX crítico: la pantalla de configuración del agente daba 404 para todos** (`dd41c2f`): `getAgentDetail(orgId, agentId)` se llamaba con los argumentos invertidos. No se podía configurar ningún agente ni asignar WhatsApp. + link "Asignar WhatsApp →" corregido (iba a integraciones, ahora va a la config del agente).
- ✅ **RESUELTO — el canal QR no aparecía en la asignación del agente** (era `❌→✅`, cerrado 2026-06-22): el diagnóstico (`GET /api/whatsapp-debug`, `3c38e74`) confirmó que la causa NO era el filtro `isActive` sino que un canal recién conectado por QR **no tiene `name`/`displayPhoneNumber`/`verifiedDisplayName`** → se renderizaba como "Canal sin nombre" / opción vacía (parecía ausente). **Fix `5017f05`**: `getAvailableChannels` ahora trae `provider` y el form etiqueta los canales `EVOLUTION_API` como **"WhatsApp conectado por QR"** (seleccionable). Combinado con `dd41c2f` (404 de la config) destrabó la asignación. Verificado de hecho por el **end-to-end WhatsApp funcionando en prod (2026-06-18)**: el agente recibe/califica/responde por el canal QR (imposible sin canal asignado). Endpoint debug ya removido (`dc2726d`). Re-auditado el código el 2026-06-22: `getAvailableChannels` (`service.ts:776`) selecciona `provider` + fallback si falta la columna `isActive` (drift); `agent-form.tsx:164-170` renderiza el label QR. (El gate `isManager` que limita la lista de canales a OWNER/ADMIN en la config del agente es intencional, no un bug.)

## 19. AUTOMATIZACIONES — 🟢 Terminado
- ☑ Replanteado como **"Actividad automática"** (`f0b0850`).

## 20. AGENTOS — 🟡 Beta
- **Auditoría:** UI bien construida (biblioteca de agentes con estados legítimos, prospecting con degradación elegante si falta `SERPER_API_KEY`). El 🟡 viene de profundidad (prompts/HITL/validación = internals ⛔) y costos IA (§40).
- ✅ **Control de costos de IA REAL** implementado (ver §40, `a3d556d`).
- 🟡 Opcional: setear `SERPER_API_KEY` en Railway enciende el Buscador Web (API paga de terceros, decisión tuya).

### AgentOS — CEO IA B2B Fase 0/1
* **Commit original:** `15baecce97b6a48911ec541cf77eb48cf36c0a52`
* **Estado:** 🟢 Mergeado a main / Listo para deploy a Producción. Fase 2 pendiente y NO iniciada.
* **Secciones:** §18 · §19 · §20 · §21 · §40 · §46
* **Alcance:** Se reencuadró AgentOS como Director IA / CEO IA B2B. Se redujo el sesgo de Marketing y se amplió el diagnóstico hacia activación, First WOW, soporte, costos IA, salud operativa y próximas mejores acciones.
* **Seguridad:** HITL, solo lectura, sin acciones automáticas.
* **Fase 2:** Pendiente (NO iniciada) — Modelado en BD y asignación de agentes especializados reales.
* **No tocado:** Prisma, DB, Railway, worker, WhatsApp, pagos/reservas.

### AgentOS — UI Ejecutiva Director IA Fase 1.1
* **Commit:** `ea40354`
* **Estado:** 🟢 Mergeado a main / listo para deploy a producción.
* **Secciones:** §18 · §20 · §21 · §26 · §40 · §41 · §46
* **Alcance:** La pantalla `/platform/agents` se reordenó como centro de mando ejecutivo del Director IA. El diagnóstico deja de mostrarse solo como texto largo y se priorizan métricas ejecutivas: semáforo operativo, First WOW, soporte B2B, costos IA, jobs fallidos y próxima mejor acción.
* **Seguridad:** Solo lectura, HITL, sin acciones automáticas.
* **Pendiente:** Fase 2 con agentes especializados reales y estructura de permisos.
* **No tocado:** Prisma, DB, Railway, worker, WhatsApp, pagos/reservas.

### AgentOS — Limpieza UI Ejecutiva Fase 1.1.1
* **Commit:** `ff27cfc`
* **Estado:** 🟢 Mergeado a main / listo para producción. Fase 2 NO iniciada.
* **Secciones:** §20 · §21 · §40 · §41 · §46
* **Alcance:** Se eliminó el semáforo hardcodeado en verde ("Operable") cuando no hay dato estructurado real → ahora cae al fallback honesto neutral ("Sin dato estructurado" + "Solicitá un diagnóstico para evaluar el estado operativo"). Se limpió el ruido autogenerado de `next-env.d.ts` (revertido `.next` → `.next-dev`, la convención del repo: dev usa distDir `.next-dev`, prod `.next`). Auditado: el cliente solo recibe `DirectorAgentStatus` (sin métricas operativas estructuradas), por eso no se inventó estado ni se hizo parsing del texto del LLM.
* **Seguridad:** Sin cambios funcionales sensibles, sin acciones automáticas, HITL intacto.
* **Pendiente:** Conectar las tarjetas ejecutivas (semáforo, First WOW, tickets, costo IA) a datos estructurados reales en una fase posterior.
* **No tocado:** Prisma, DB, Railway, env vars, worker, WhatsApp/webhooks, pagos/reservas, AgentType, Fase 2.

### AgentOS — ✅ Producción validada / Fase 1 cerrada (QA 2026-06-22)
* **Estado:** ✅ **Producción validada / Fase 1 cerrada.** Cubre Fase 0/1 + 1.1 + 1.1.1 probadas en producción real.
* **Ruta probada:** `/platform/agents`.
* **Evidencia visual:** título `AGENTOS — DIRECTOR IA`, subtítulo `Centro de dirección IA...`, tarjetas ejecutivas superiores visibles. Semáforo Operativo en tarjeta = **"Sin dato estructurado"** (correcto: aún sin métrica estructurada real, fallback honesto de la Fase 1.1.1).
* **Diagnóstico operativo generado OK.** El informe (texto del Director IA) detectó datos reales: **4 inmobiliarias sin First WOW**, **26 tickets B2B abiertos**, **costo IA mensual $0.08**, **2 jobs fallidos**, **semáforo operativo amarillo** (en el informe), **próximas mejores acciones** y **nota HITL**.
* **Seguridad confirmada en prod:** NO se ejecutaron acciones automáticas (solo lectura / HITL). **Fase 2 NO iniciada.**
* **Pendiente (no bloqueante):** (1) conectar las tarjetas ejecutivas a datos estructurados reales (hoy el informe los tiene en texto, las tarjetas en fallback); (2) diseñar Fase 2 con agentes especializados reales (requiere revisar Prisma/AgentType, planificación aparte).
* **No tocar:** Prisma, DB, Railway, worker, WhatsApp, pagos/reservas ni AgentType.

### AgentOS — Tarjetas ejecutivas con datos estructurados Fase 1.2
* **Commit:** `a17bfc4`
* **Estado:** 🟢 Mergeado a main / listo para validación en producción. Fase 2 NO iniciada.
* **Secciones:** §20 · §21 · §26 · §40 · §41 · §46
* **Alcance:** Las tarjetas ejecutivas superiores de `/platform/agents` ya **NO** muestran "Sin dato estructurado" cuando hay datos reales: consumen un objeto estructurado nuevo `getExecutiveMetrics()` (`service.ts`) con `firstWowPendingCount`, `openB2BTicketsCount`, `monthlyAiCostUsd`, `failedJobsCount`, `operationalStatus`+razón, `nextBestActionSummary` y `lastUpdatedAt`. Las fuentes son **las mismas reales que ya alimentan el diagnóstico** (`getPlatformActivationSnapshot`, `getAiUsageSummary`, `prisma.conversation.count` de la org soporte, `prisma.agentAutomation.count` FAILED, log de cuota OpenAI, `getOperationalAlerts`). **No se parsea el texto del LLM**: si una fuente falta, el campo queda `null` y la tarjeta sigue mostrando "Sin dato estructurado". Cada tarjeta linkea a su panel (Activación / Soporte / Operaciones IA / QA). Próxima Mejor Acción se calcula por prioridad desde los mismos datos. Semáforo: ROJO (cuota IA o alerta crítica), AMARILLO (jobs fallidos / First WOW / tickets > 0), VERDE (datos OK y sin pendientes), SIN_DATO (sin datos suficientes) — **nunca verde por defecto**.
* **Seguridad:** Solo lectura, HITL, sin acciones automáticas (la Próxima Mejor Acción es texto informativo).
* **Pendiente:** Fase 2 con agentes especializados reales y permisos.
* **No tocado:** Prisma, DB, Railway, worker, WhatsApp, pagos/reservas, AgentType.

### AgentOS — ✅ Producción validada / Fase 1.2 cerrada (QA 2026-06-22)
* **Estado:** ✅ Producción validada.
* **Ruta probada:** `/platform/agents`.
* **Evidencia visual:** Las tarjetas ejecutivas superiores consumen datos estructurados reales y muestran Semáforo Operativo `Atención`, First WOW pendientes `4`, Tickets B2B abiertos `26`, Costo IA mensual `$0.08`, Jobs fallidos `0` y Próxima Mejor Acción `Contactar inmobiliarias pendientes de First WOW`.
* **Seguridad:** HITL visible, sin acciones automáticas.
* **Observación no bloqueante:** El diagnóstico anterior mencionó 2 jobs fallidos, mientras que la tarjeta estructurada actual muestra 0. Se deja registrado como diferencia temporal/fuente estructurada y no bloquea la validación.
* **Pendiente:** Diseñar Fase 2 con agentes especializados reales, permisos y posible revisión de Prisma/AgentType.
* **No tocado:** Prisma, DB, Railway, worker, WhatsApp, pagos/reservas, AgentType.

### AgentOS — Fase 2A: especialistas de diagnóstico read-only (IMPLEMENTADA 2026-06-22)
* **Commit:** `2d2d2b3`
* **Estado:** 🟢 Mergeado a main / listo para validación en producción. Fase 2B/2C NO iniciadas.
* **Implementado:** 6 especialistas read-only del Director IA en `service.ts` (`getOnboardingSpecialistReport`, `getSupportB2BSpecialistReport`, `getQASpecialistReport`, `getFinanceSpecialistReport`, `getIntegrationsSpecialistReport`, `getProductSpecialistReport` + agregador `getAgentSpecialistReports()`), tipos `AgentSpecialistReport`/`AgentSpecialistStatus`. Cada uno devuelve `{ status, summary, findings[], recommendation, source, lastUpdatedAt }` desde fuentes reales (activación, conversaciones soporte, jobs/alertas/cuota, costos IA, estado WhatsApp/Meta, métricas ejecutivas). UI: sección "Equipo de especialistas IA" en `/platform/agents` (`AgentSpecialistsPanel.tsx`) con 6 tarjetas, badges "Solo lectura" + "HITL". Fuente faltante → estado `SIN_DATO` honesto. Sin LLM-parsing.
* **Alcance (plan):** 6 especialistas de diagnóstico: (1) Onboarding / Activación, (2) Soporte B2B, (3) QA / Producción, (4) Finanzas / Costos IA, (5) Integraciones / WhatsApp / Meta, (6) Producto / Mejoras.
* **Decisión arquitectónica:** NO expandir `AgentType` por ahora. Usar camino dinámico/configurable por `slug` en fases posteriores.
* **Motivo:** `AgentType` hoy solo tiene `ORCHESTRATOR` y `MARKETING`; expandirlo a muchos agentes generaría rigidez y migraciones innecesarias. Además, el pipeline (`AgentTask/Run/Approval/Log/Governance`) ya es agnóstico al type (keyeado por `agentId`).
* **Fase 2A:** CERO migraciones. Los especialistas serán primero módulos de análisis read-only del Director IA (mismo patrón que `getExecutiveMetrics()`), reusando fuentes reales ya existentes (activación, costos, alertas, logs, conversaciones).
* **Backbone reutilizable (sin cambios):** `AgentTask`, `AgentRun`, `AgentApproval`, `AgentLog`, `AgentGoal`, `AgentAutomation`, `AgentGovernancePolicy`.
* **Permisos:** Todos los especialistas de Fase 2A en `SUGGEST_ONLY` (vía `AgentGovernancePolicy.autonomyLevel`).
* **Seguridad:** Solo lectura, HITL, sin acciones automáticas, sin envío de mensajes.
* **Hallazgo de auditoría:** `getAgentLibraryData()` hoy devuelve un array hardcodeado (consulta `prisma.agent` pero lo ignora); solo ORCHESTRATOR y MARKETING son agentes reales en DB, los otros 4 de la Biblioteca son visuales/maqueta. Hacer que la Biblioteca lea agentes reales queda para 2B.
* **No tocar en Fase 2A:** Prisma, DB, migraciones, Railway, worker, WhatsApp/webhooks, pagos/reservas, AgentType.
* **Pendiente Fase 2B:** Evaluar persistir agentes como filas reales `Agent` con `slug` (migración mínima aditiva `Agent.slug String?`), previo análisis del drift de producción (la DB de Railway está desincronizada del schema — no aplicar `migrate dev` a ciegas).
* **Pendiente Fase 2C:** Catálogo completo de agentes, borradores con aprobación humana (`CREATE_DRAFTS`) y expansión gradual.

### AgentOS — ✅ Producción validada / Fase 2A cerrada (QA 2026-06-22)
* **Estado:** ✅ Producción validada. (main `38c6118`)
* **Ruta probada:** `/platform/agents`.
* **Evidencia visual:** La sección `Equipo de especialistas IA` aparece correctamente con 6 especialistas read-only: Onboarding/Activación, Soporte B2B, QA/Producción, Finanzas/Costos IA, Integraciones/WhatsApp/Meta y Producto/Mejoras. Siguen visibles el Director IA y las tarjetas ejecutivas superiores.
* **Datos visibles:** Cada especialista muestra estado, resumen, hallazgos, recomendación, fuente y fecha/hora de actualización.
* **Seguridad:** Badges `Solo lectura` y `HITL` visibles. No hay acciones automáticas ni botones de ejecución, sin envío de mensajes, sin escritura en DB.
* **Arquitectura validada:** Fase 2A funciona como módulos de análisis read-only del Director IA. No se persistieron agentes nuevos como filas `Agent`.
* **Pendiente:** Fase 2B queda pendiente para evaluar agentes persistidos por `slug`, Biblioteca real desde DB y posible migración aditiva, previo análisis de drift de producción. Fase 2C no iniciada.
* **No tocado:** Prisma, DB, migraciones, Railway, worker, WhatsApp/webhooks, pagos/reservas, AgentType, AiAgent.

## 21. SUPERADMIN — 🟢 Producción (navegación agrupada en 6 secciones)

## 22. SOPORTE — 🟢 Producción (Manual Vivo + Soporte IA)

## 23. ONBOARDING — 🟢 (Bienvenida revisada + pasos rediseñados)
- ✔️ Revisión "Bienvenida" cerrada con §3 (`58d2f6e`).
- ✔️ **Pasos rediseñados** a la ruta de activación esencial (`26b26c8`): Perfil → WhatsApp → Agente → Propiedad → **Probá tu agente** (WOW). Eliminado el tour 360° como paso.
- ✔️ **Fix `isComplete`**: ahora se basa en los 4 pasos de activación (antes exigía el tour opcional, por eso nunca completaba). (`26b26c8`)
- ☐ Wizard primeros 15 min / recorrido guiado → §46.

## 24. SEGURIDAD — 🟢 Producción
- ☑ Roles/permisos/delegación/auditoría ✅ · Aviso de sesión expirada (🟢).

## 25. MULTI-TENANT — 🟢 Producción (aislamiento por `organizationId`)

## 26. OBSERVABILIDAD — 🟢 Producción (logs/alertas/métricas/salud)

## 27. PERFORMANCE — 🟡
- Frontend Landing/CRM/Mapas ✅ · **Desarrollos ⚠️ a revisar** · Backend Prisma/caché ✅.

## 28. PRODUCCIÓN (Railway) — 🟢 (variables/deploy/monitoreo ✅; backups → §39)

## 29. DEUDA TÉCNICA — 🟢 Cerrado
- ☑ /map legacy · Debug Verify · Fichas lote duplicadas (falsa alarma) · Captación duplicada · AgentOS vs Automatizaciones (movido a §38).

## 30. AUDITORÍA DE NAVEGACIÓN — 🟢 (Landing/Tenant/Superadmin sin duplicados, <3 clics)

## 31. AUDITORÍA DE DEMO COMERCIAL — 🟢
- **¿Qué ve el cliente en los primeros 5 minutos?**
  R: Login → Dashboard con KPIs → conecta WhatsApp → ve el **Inbox IA** respondiendo y creando la oportunidad sola (el momento WOW, §46). ⚠️ Hoy ese recorrido no está guiado: el cliente debe navegarlo (lo resuelve §46).

## 32. AUDITORÍA DE CONSISTENCIA VISUAL — 🟡 (unificación en curso)
- ☑ Auditoría de colores/botones/badges/tipografías/espaciados/iconografía completada · duplicados identificados.
- ✔️ **Badge de lote público unificado** (`f794c9a`) — 1ª divergencia cerrada.
- ✔️ **Badge de estado de lote en fichas públicas unificado** (`d4233a5`): eliminados 2 `StatusBadge` locales duplicados (ficha del lote + plan de cuotas) → `LotStatusBadge audience="public"`. Labels en masculino ("Reservado/Vendido") y "No disponible" en vez de exponer "Bloqueado" al cliente.
- ☑ **Estado de badges de lote:** divergencias estáticas de estado de lote cerradas. Lo que queda usa `STATUS_COLORS` por diseño (no son badges): `<select>` editable de `inventario-client`, rellenos del canvas/SVG del masterplan, y `masterplan-side-panel` (lógica de acciones + 2 enums). Otros `STATUS_COLORS` son de otros dominios (prospecting/billing/goals).
- ☐ **Botón primario** "azul primario + negro secundario": aplicación **incremental** (215 usos de `bg-brand-*` en 98 archivos, mayoría NO son botones; se evita repintado masivo de riesgo).

## 33. MÓDULOS HUÉRFANOS — ☐ auditar Canvas/Prospecting/Comercial/QA

## 34. ESCALABILIDAD — 🟢 (10/100/1000 clientes auditado; cuellos identificados → §39)

## 35. AUDITORÍA DE DESARROLLADORAS — ☐
- Flujos desarrolladora/lote/reserva/vendedor/masterplan/mapa → pendientes de auditar end-to-end. Relacionado con §2 (landing) y §16 (reservas).

## 36. ROADMAP FUTURO — ⚪ — ⛔ (Propietarios, Cta Cte, Documentación, Sindicación Zonaprop/Argenprop/MercadoLibre, Publicador XML/API)

## 37. AUDITORÍA FINAL EJECUTIVA (respondida)
- **¿Está listo para venderse?** R: ✅ Sí, para inmobiliaria tradicional (CRM+WhatsApp+IA+portal en 🟢). Para desarrolladora/loteadora: vendible con acompañamiento, con Masterplan/Reservas en beta.
- **¿Qué está al 100%?** R: CRM, WhatsApp+IA, Propiedades, Portal/Catálogo, Landing, Superadmin, Multi-tenant, Seguridad.
- **¿Qué está al 80%?** R: Desarrollos (Paso 1-3 + Mapa), nomenclatura LATAM (alta), empty states/onboarding.
- **¿Qué está en beta?** R: AgentOS, Masterplan, Reservas, Mapa Interactivo, Agentes IA, Operación IA.
- **¿Qué genera riesgo?** R: Reservas+Cobros (dinero/legal), dependencia de WhatsApp/Meta, infra prod sin backups automáticos (§39).
- **¿Qué debe congelarse?** R: Editor Visual Pro y Tour 360 (mostrar como "Próximamente"), no prometer en demo.
- **¿Qué debe priorizarse?** R: First-WOW guiado (§46), unificación visual final (§32), sección Desarrolladoras (§2), backups/infra (§39).

## 38. NOMENCLATURA Y UX — 🟢 Terminado

## 39. INFRAESTRUCTURA Y ESCALABILIDAD — 🟡 Planificado — ⛔
- PostgreSQL prod / pooling / workers / backups automáticos / retención logs / recuperación ante fallos → **infra, no-codeable desde la app**.

## 40. OPERACIÓN IA — 🟢 (costos reales) / 🟡 (alertas/límites)
- ☑ AI Operations visible en Superadmin (🟢).
- ✅ **Costos OpenAI / consumo por tenant REAL** (`a3d556d`): `AiUsageEvent` registra tokens reales de cada respuesta IA (instrumentado en el decision-service del worker), con costo estimado por modelo. Panel en el Radar de Operaciones IA: costo/tokens/llamadas + desglose por cliente.
- ✅ **Límites de consumo + alertas por organización** (`c130692`): límite mensual de costo por org (editable inline por el Superadmin) con default de plataforma; estado ok/cerca/excedido por cliente + banners de alerta cuando hay orgs ≥80% o excedidas. Alertas informativas (no cortan el servicio).
- ☐ (Opcional futuro) Enforcement duro / throttling al exceder el límite.

## 41. ESTABILIZACIÓN PRE-DEMO — 🟡 En ejecución
- ☑ Persistencia overlay Paso 5 · UX sesión expirada (`8c8ffb3`) · AI Operations visible · Automatizaciones Tenant (`f0b0850`) · Menú Superadmin agrupado · Navegación AgentOS.
- ✔️ Iniciada **unificación de badges** (`f794c9a`).
- ☐ Unificar badges del sistema (completar) · ☐ Unificar botón primario (incremental).

## 42. NOMENCLATURA COMERCIAL LATAM — 🟢 Auditoría completada (mappings aprobados → §44)

## 43. ESTRATEGIA COMERCIAL DE DEMO — 🟢 Definido — ⛔ comercial
- Guiones 5min/15min ✅, demo ejecutiva/técnica ☐. Módulos WOW y prohibidos definidos ✅.

## 44. IMPLEMENTACIÓN NOMENCLATURA LATAM — 🟡→🟢 (alta)
- ✔️ Captación → "Links de WhatsApp" (UI) (`ab17688`)
- ✔️ Prospectos → "Oportunidades" (UI) (`ab17688`)
- ✔️ Conversaciones → "Inbox IA" (UI) (`ab17688`)
- ☐ "Pipeline" → "Oportunidades" (textos sueltos, ej. "tu pipeline de ventas")
- ☐ Revisar AgentOS comercial / textos B2B Platform

## 45. ONBOARDING Y EMPTY STATES — 🟡→🟢 (alta cobertura)
- ☑ CRM/Propiedades/Leads/Portal vacíos con CTA (`7a1cdc5`) · Desarrollos/WhatsApp (ya existían).
- ✔️ **Conversaciones vacías con CTA** → verificado, ya tenía CTA a Captación.
- ✔️ **Visitas vacías con CTA** → verificado, ya tenía CTAs a Oportunidades/Propiedades.
- ☐ Wizard primeros 15 min / recorrido guiado → §46.

**Hallazgos funcionales (confirmados):** Inbox IA = primer WOW · Oportunidades = CRM · sin duplicación funcional · mostrar Inbox antes que CRM en demos.

## 46. RECORRIDO DEL PRIMER WOW — 🟢 Completado (Fases A·B·C + gate de prueba)
**El WOW** ocurre cuando WhatsApp responde y crea la oportunidad solo.
- ✔️ **Paso "Probá tu agente"** agregado como cierre del onboarding, apuntando al Inbox IA (`26b26c8`).
- ✔️ **Fase A implementada y en prod** (`4dff3f1`, verificada runtime por HTTP):
  - ✔️ **Preguntar tipo de negocio al iniciar** → Inmobiliaria/Desarrolladora/Ambas, guardado en `marketFocus` (sin migración).
  - ✔️ **Pantalla de prueba interactiva** `/onboarding/probar`: número conectado + link `wa.me` + estado en vivo con polling.
  - ✔️ **Redirección automática al Inbox IA** tras el primer mensaje (polling 0→1). Diferencia "ya recibiste" (revisita) de "llegó en vivo".
  - ✔️ Paso 4 **adaptado** a propiedad vs. desarrollo/loteo según el tipo.
- ✔️ **Fase B — Modo Express** (`96ca822`, verificada runtime): atajo en el onboarding que publica la primera propiedad ya disponible (AVAILABLE + pública) con 5 campos mínimos, para que la IA tenga algo que ofrecer en <1 min. Aparece solo si el paso 4 está pendiente y el negocio no es Desarrolladora pura (esos usan el wizard de loteo).
- ✔️ **Fase C — Métricas time-to-WOW** (`18b28c2`, verificada runtime): sección "Tiempo al WOW" en `/platform/activation` (onboarding visto → primer lead) con agregados (llegaron al WOW · mediana · cuántas en <10 min) + columna por org. Reusa `getPlatformActivationSnapshot` (que ya existía con funnel y tiempo-a-activación).
- ✔️ **Prueba del agente como paso obligatorio — gate suave** (`ace4c06`, verificada runtime): `isComplete` ahora requiere setup (4 pasos) + primera conversación (el WOW); `readyToOperate` se mantiene en los 4 de setup. Banner prominente "Falta el paso clave: probá tu agente" cuando el setup está listo pero falta probar. No lockea la app. **§46 cerrado.**

## 47. DEMO PLAYBOOK Y EJECUCIÓN DE VENTAS — 🟡 — ⛔ comercial
Demo rápida/comercial ✅; demo ejecutiva/técnica, validación con cliente real, video demo, sandbox → pendientes (material comercial).

## 48. PRICING Y PLANES — 🟢 Auditoría — ⛔ comercial
Planes Agencia (USD 49-89) / Desarrollos (USD 149-299) / Setup (~USD 300) definidos; faltan validar precios, moneda por país, límites de IA/usuarios, pasarela y contrato.

## 49. ROI Y CASOS DE NEGOCIO — 🟢 Auditoría — ⛔ comercial
Calculadora ROI definida (leads/comisión/cierre/tiempo de respuesta); falta implementarla en landing/sistema y validar con clientes reales.

## 50. GO TO MARKET (primeros 10 clientes) — 🟢 Auditoría — ⛔ comercial
Cliente ideal: loteadora chica/media + inmobiliaria mediana. Falta lista de 50 targets, video demo, one-pagers y ejecución de campaña 30 días.

## 51. COMPETENCIA Y POSICIONAMIENTO — 🟢 Auditoría — ⛔ comercial
Categoría: "Plataforma Operativa Transaccional para Real Estate". FOAT: **plano transaccional** (cliente elige lote → reserva/pago bloquea → estado se actualiza para todos). Diferencial vs Tokko: "Tokko publica; Raíces Pilot opera y cobra".

## 52. REFERIDOS Y CASOS DE ÉXITO — 🟢 Auditoría — ⛔ comercial
Programa "Colegas VIP" definido; faltan testimonios reales, muro de prueba social y tracking de referidos.

## 53. OBJECIONES LEGALES / CONFIANZA / RIESGO — 🟢 Auditoría — ⛔ comercial
Riesgo principal = confianza, no precio. Mensajes oficiales: "Tus datos son tuyos", "La IA ayuda a vender, no decide por vos". Faltan FAQ comercial, doc de seguridad y de garantías.

---

## FOTO ACTUAL DEL PRODUCTO
- 🟢 **Producción:** CRM · WhatsApp · Propiedades · Portal · Catálogo · Landing · Superadmin · Multi-tenant · Seguridad
- 🟡 **Beta:** AgentOS · Desarrollos · Masterplan · Reservas · Mapa Interactivo · Agentes IA
- 🟠 **Próximamente:** Editor Visual (Paso 4) · Tour 360 (Propiedades y Desarrollos)
- 🔴 **Oculto/Corregir:** /map legacy · Debug Verify *(ambos ya cerrados)*
- ⚪ **Futuro:** Propietarios · Cta Cte · Documentación · Sindicación a portales

---

## Cambios recientes cerrados — Junio 2026

### 1. `/propiedades` mobile UX3 — botón “Ver” y precio compacto
- **Commit:** `b528e2b` (rama `fix/propiedades-mobile-ux3`, trabajo `85e05a6`)
- **Estado:** ✅ Completado / Producción
- **Archivo:** `src/components/properties/public-map-wrapper.tsx`
- **Alcance:** En mobile, el botón de propiedades pasó a “Ver”. Precio mobile más compacto y legible. Se respetó el formatter existente `fmt(prop)`. Desktop intacto. Sin tocar Panel Admin, Superadmin, Prisma ni Mercado Pago.

### 2. `/propiedades` mobile UX4 — tarjeta desarrollo/masterplan alineada con propiedades
- **Commit:** `b772625` (rama `fix/propiedades-dev-card-mobile-ux4`, trabajo `e45caab`)
- **Estado:** ✅ Completado / Producción
- **Archivo:** `src/components/properties/public-map-wrapper.tsx`
- **Alcance:** `DevelopmentMediumCard` en mobile adaptada. Lotes subieron debajo de la ubicación. Precio bajó al CTA usando `fmt(dev)`. Botón a “Ver”. Desktop intacto. Sin tocar lógica comercial ni Prisma.

### 3. `/propiedades` mobile UX5 — altura de tarjeta MASTERPLAN igualada
- **Commit:** `7bc3191` (rama `fix/propiedades-dev-card-height-ux5`, trabajo `97ee427`)
- **Estado:** ✅ Completado / Producción
- **Archivo:** `src/components/properties/public-map-wrapper.tsx`
- **Alcance:** Se forzó `h-[140px] sm:h-[160px]` en mobile + `h-full overflow-hidden line-clamp-1` para igualar visualmente la tarjeta de Masterplan con la de propiedades sin crecer extra. Sin tocar DB, Railway ni lógica.

### 4. Superadmin Soporte — “Sugerir con IA” para consultas ajenas / número equivocado
- **Commit:** `98b857c` (rama `fix/support-ai-wrong-number-suggestion`, trabajo `7ed4b0c`)
- **Estado:** ✅ Completado / Producción
- **Archivo:** `src/app/platform/support/actions/support-actions.ts` (`generateSupportDraft`)
- **Alcance:** Lógica/prompt de sugerencia IA ajustada para responder como número equivocado ante consultas ajenas al rubro (ropa, comida, etc). Mantiene HITL (solo sugiere) y responde que el canal corresponde a Raíces Pilot sin inventar stock ni especular sobre el titular anterior. IA automática intacta.

### 5. Superadmin Soporte — Sugerencia IA restringida a soporte de plataforma B2B
- **Commit:** `2e96a6b` (rama `fix/support-ai-platform-scope`, trabajo `e6445b4`)
- **Estado:** ✅ Completado / Producción
- **Archivo:** `src/app/platform/support/actions/support-actions.ts` (`generateSupportDraft`)
- **Alcance:** Lógica/prompt ajustada para dejar claro que `/platform/support` es soporte técnico/comercial B2B de la plataforma Raíces Pilot y no una inmobiliaria. Consultas de compradores finales ("busco casa", "precio de lote") o ajenas ("kg de papa") se tratan como fuera de alcance sin pedir zonas ni presupuesto. Consultas reales (accesos, facturación, problemas del panel, demo B2B) se atienden correctamente. Mantiene flujo HITL manual, no activa auto-respuestas ni afecta la IA automática del worker. Sin tocar Prisma, DB, webhooks ni Railway.


### 6. Superadmin Soporte — Fase 1 Router estructurado JSON + plantillas seguras
- **Commit:** `56f331d` (rama `feat/support-ai-structured-router`, trabajo `f3f0a54`)
- **Estado:** ✅ Completado / Producción
- **Archivo:** `src/app/platform/support/actions/support-actions.ts` (`generateSupportDraft`, `SupportIntent`, `getTemplateForIntent`, `classifySupportIntent`)
- **Alcance:** La función manual “Sugerir con IA” ahora funciona con un router estructurado. Primero clasifica el último mensaje en formato JSON validando la intención dentro de una lista permitida (ej: `SALUDO_SIMPLE`, `AYUDA_AMBIGUA`, `SOPORTE_ACCESO`, `COMPRADOR_FINAL_INMOBILIARIO`, `OTRO_RUBRO_AJENO`, `DEMO_ACCESO_B2B`). Para intenciones simples (como saludos o consultas ajenas) devuelve plantillas seguras sin procesar el manual. Para soporte real (accesos, plataforma, WhatsApp), usa el manual/contexto para generar soporte técnico estructurado. Si falla OpenAI o el JSON, cae en un fallback seguro ("AYUDA_AMBIGUA"). Mantiene UI igual y el operador decide enviar (HITL). No activa IA automática ni auto-respuestas. Sin tocar worker, Evolution, Prisma ni DB.

### 7. `/propiedades` PWA B2C — fichas `/cat` dentro de app instalada
- **Commit:** `58ae5a6` · merge `2d9f85b` (rama `fix/pwa-b2c-cat-tour360-mobile`)
- **Estado:** ✅ Completado / Producción (mergeado y pusheado a `main`; `tsc` + `next build` exit 0)
- **Secciones:** §2 · §8 · §27 · §41
- **Archivo:** `public/manifest-b2c.json`
- **Alcance:** La app B2C mantiene `start_url` en `/propiedades` pero amplía el `scope` de `/propiedades` a `/` para que las fichas públicas `/cat/...` abran dentro del modo standalone (sin barra blanca / custom tab al tocar “Ver”). El botón “Ver” no se tocó porque ya usa navegación interna correcta. `sw-b2c.js` sigue sin push y no pisa la app B2B.
- **No tocado:** Panel Admin, Superadmin, CRM, WhatsApp, AgentOS, Prisma, DB, migraciones, Railway, env, worker, Mercado Pago.

### 8. Tour 360 mobile — panoramas grandes y límites WebGL
- **Commit:** `58ae5a6` + `3c95774` · merge `2d9f85b` (rama `fix/pwa-b2c-cat-tour360-mobile`)
- **Estado:** 🟡 Parcial — **la prueba real en celular FALLÓ**: salía “No pudimos cargar el tour 360°” y el botón **“Abrir imagen 360°” mandaba al login**. La causa real **NO era solo WebGL/tamaño** sino que el **proxy de media estaba protegido** (`/api/storage/view` → `307 /login` para anónimos, confirmado en prod). **Corregido por hotfix `def7856` (ver entrada 9).** Pendiente: re-test en celular real.
- **Secciones:** §7 · §8 · §27 · §41
- **Archivo:** `src/components/properties/panorama-viewer.tsx`
- **Alcance (lo de esta entrada):** optimización de fuente para mobile (`/_next/image`) midiendo desde la optimizada para no cargar el gigante. Correcto, pero **inútil mientras el proxy estuviera protegido** (el optimizador hace fetch interno a `/api/storage/view` y también recibía login). Resuelto en la entrada 9.
- **No tocado:** captura de tours / creación con celular, Prisma, DB, Railway, worker, almacenamiento, reservas, cobros.

### 9. Hotfix público Tour 360 — proxy de media público + fallback sin login + ancho por maxTex
- **Commit:** `def7856` · merge `68c0aee` (rama `hotfix/public-tour360-mobile-fallback`)
- **Estado:** ✅ Completado / Producción (mergeado y pusheado a `main`; `tsc` + `next build` exit 0; causa confirmada en prod `GET /api/storage/view` anónimo → `307 /login`). ⚠️ **Pendiente de re-test en celular real** después del deploy.
- **Secciones:** §2 · §7 · §8 · §27 · §41
- **Archivos:** `src/middleware.ts`, `src/components/properties/panorama-viewer.tsx`, `src/components/properties/unified-media-viewer.tsx`
- **Causa raíz:** `/api/storage/view` (proxy CORS de los panoramas 360°, usado vía `getPanoramaSourceUrl` para hosts `*.r2.dev`) **no estaba en `PUBLIC_PATHS`** → el comprador anónimo era redirigido a login; Pannellum recibía HTML de login, el optimizador interno también, y el botón "Abrir imagen 360°" (href = el proxy) mandaba al login.
- **Hotfix B (causa):** `/api/storage/view` agregado a `PUBLIC_PATHS`. El param `url` está restringido a hosts `r2.dev` (bucket público), así que no expone nada que no sea ya público.
- **Hotfix A (login):** `PanoramaViewer` recibe `audience` (`'public' | 'admin'`, default `admin`). En **público** el fallback de error **NO** muestra el botón "Abrir imagen 360°" (orienta a la pestaña "Imágenes Reales"); en admin se conserva. La ficha `/cat` (`UnifiedMediaViewer`) pasa `audience="public"`.
- **Hotfix C (WebGL):** el ancho de la fuente optimizada se elige por `maxTex` (2048 si el dispositivo limita a 2048, si no 3840; ambos deviceSizes válidos).
- **Hotfix D (PWA scope) — DOCUMENTADO, no implementado:** el `scope: "/"` (entrada 7) es correcto para **instalaciones nuevas**; las **instalaciones existentes** mantienen el manifest viejo cacheado (WebAPK) → la barra blanca/custom tab persiste hasta **reinstalar la app**. Solución robusta propuesta (PR aparte): rutas de ficha **in-scope** bajo `/propiedades/...` que reutilicen la ficha `/cat`, y los botones "Ver" del portal navegando dentro de `/propiedades`; opcionalmente revertir el scope a `/propiedades`. No se implementó en este hotfix para mantenerlo acotado al bug de login.
- **No tocado:** Prisma, DB, migraciones, Railway, env, worker, WhatsApp/webhooks, CRM, Superadmin, AgentOS, reservas, cobros, `sw-b2c.js`, botón "Ver", rutas `/cat`, captura/creación de tours.

### 10. Tour 360 mobile — rollback de `/_next/image` y uso de proxy público directo
- **Commit:** `b60b0a9`
- **Estado:** ✅ Completado / Producción — mergeado y pusheado a main
- **Secciones:** §7 · §8 · §27 · §41
- **Archivos:** `src/components/properties/panorama-viewer.tsx`
- **Causa:** Desktop funcionaba porque usaba proxy directo; mobile fallaba porque entraba en la rama `/_next/image`. El patrón `/_next/image?url=/api/storage/view?url=...` se tomó como regresión probable.
- **Cambio:** Se quitó el uso de `/_next/image` para el Tour 360 mobile. El visor vuelve a cargar desde `/api/storage/view` directo, ahora público, y reescala por canvas si supera `MAX_TEXTURE_SIZE`.
- **Se mantiene:** fallback público sin botón a login; admin conserva comportamiento interno si corresponde.
- **Pendiente:** prueba física en celular real post-deploy.
- **No tocado:** Prisma, DB, Railway, worker, WhatsApp, CRM, Superadmin, AgentOS, reservas/cobros, `sw-b2c.js`, rutas `/cat`, botón “Ver”.

### 11. Tour 360 mobile — restaurar optimizador server-side `/_next/image` (causa raíz real)
- **Commit:** `a18a8cc`
- **Estado:** ✅ Completado / Producción — mergeado y pusheado a main. ⚠️ Pendiente de prueba física en celular real post-deploy.
- **Secciones:** §7 · §8 · §27 · §41
- **Archivos:** `src/components/properties/panorama-viewer.tsx`
- **Diagnóstico definitivo:** La causa raíz del crasheo mobile era que el celular intentaba cargar el panorama original (8K = ~33 Megapíxeles) en RAM, lo que agotaba la memoria del navegador antes de que WebGL pudiera renderizarlo. El rollback anterior (entrada 10) quitó el optimizador `/_next/image` pero no resolvió el problema de RAM.
- **Cambio:** Se restauró `buildOptimizedPanoramaSource`. En mobile (maxTex ≤ 4096) el visor pide la imagen ya reescalada al servidor (`/_next/image` → sharp): el celular recibe solo 3840px o 2048px según su límite real. Desktop (maxTex alto) queda intacto, sigue usando la fuente original directa.
- **Condición que permite esto:** El proxy `/api/storage/view` ya es público (hotfix entrada 9), por lo que el optimizador de Next.js puede hacer fetch sin redireccionamiento a login.
- **Se mantiene:** `downscaleToFit` por canvas como fallback extremo; fallback visual público sin botón a login.
- **Pendiente:** merge a main, push, prueba física en celular real post-deploy.
- **No tocado:** Prisma, DB, Railway, worker, WhatsApp, CRM, Superadmin, AgentOS, reservas/cobros, `sw-b2c.js`, rutas `/cat`, botón "Ver", captura/creación de tours.

---

## 🛑 TOUR 360° PÚBLICO — INVARIANTES (NO ROMPER) — verificado funcionando 2026-06-22

> El visor 360° real del catálogo público (`/cat/...`, ej. `/cat/seventoop-marketing-digital/<devId>`) se **rompió varias veces** y SIEMPRE por uno de los 5 puntos de abajo. **`tsc` y `next build` pasan igual aunque esto quede roto** (es comportamiento runtime, no de tipos) → no confiar solo en que "compila". Antes de tocar middleware, el proxy de media o los assets de Pannellum, releer esto.

**La cadena (cómo carga el visor):** ficha pública → `UnifiedMediaViewer` (`audience="public"`) → `PanoramaViewer` → inyecta `<script src="/pannellum.js">` + `<link href="/pannellum.css">` → `getPanoramaSourceUrl()` rutea la imagen por `/api/storage/view?url=...` → `buildOptimizedPanoramaSource()` agrega `w`/`q` → el proxy reescala con `sharp` server-side y devuelve la imagen.

**Los 5 invariantes que NO se pueden romper:**
1. **`/api/storage/view` DEBE estar en `PUBLIC_PATHS`** de `src/middleware.ts` (regex `/^\/api\/storage\/view(\/|$)/`). Si se saca → el comprador anónimo es redirigido a `/login`, el visor recibe HTML en vez de la imagen → pantalla negra/error en PC y móvil.
2. **El `config.matcher` de `src/middleware.ts` DEBE excluir `js` y `css`** (`...|css|js|js\\.map)).*)`) para que `/pannellum.js` y `/pannellum.css` se sirvan sin gate de auth. **Y el comentario `/* ... */` arriba del matcher DEBE conservar su cierre `*/`**: una vez se borró el `*/` y el string del matcher quedó DENTRO del comentario → matcher vacío → todo roto (commits `40c4c9c`→`5d270ee`).
3. **`public/pannellum.js` y `public/pannellum.css` DEBEN existir.** El visor los inyecta por ruta absoluta; si faltan, no hay visor.
4. **El proxy `/api/storage/view` (`route.ts`) DEBE:** (a) permitir URLs https externas + leer `/uploads/` same-origin directo de disco; (b) devolver el body como `new Response(buffer as any, ...)` (el `as any` es necesario para TS con Buffer — quitarlo rompió el response, ver `3e89fc4`); (c) soportar `w`/`q` (resize `sharp` con `limitInputPixels:false`) sin tirar en el caso normal.
5. **`PanoramaViewer audience="public"` NO debe mostrar el botón "Abrir imagen 360°"** en el fallback de error (esa URL puede redirigir a login). El público va a "Imágenes Reales"; el botón queda solo para `admin`.

**Regla operativa:** cualquier cambio a `src/middleware.ts`, `src/app/api/storage/view/route.ts`, `src/components/properties/panorama-viewer.tsx` o `public/pannellum.*` exige (a) correr **`node scripts/check-tour360-invariants.mjs`** (chequea estáticamente los invariantes 1–4; sale con error si alguno se rompió) y (b) **probar el visor real en una ficha de `/cat` en PC y móvil después del deploy** (compilar no alcanza; `tsc`/`build` pasan aunque el runtime quede roto). Opcional: cablear el script como `prebuild` en `package.json` para que un deploy con un invariante roto falle solo (no aplicado todavía por precaución con el flujo de build).

---

## ⏭️ PRÓXIMO PASO (bloqueado en tu decisión)
1. ✔️ ~~Copy sección "Desarrolladoras" (§2)~~ → **hecho y en prod** (`0907f4f`).
2. ✔️ ~~Unificación de badges (§32/41)~~ → divergencias estáticas de estado de lote **cerradas** (`d4233a5`).
3. ✔️ ~~Onboarding First-WOW §46 completo~~ → Fases A·B·C + gate de prueba **hechos y en prod** (`4dff3f1` · `96ca822` · `18b28c2` · `ace4c06`, verificados runtime).
4. — sin pendientes abiertos de mi lado; a tu decisión qué priorizar (otra sección del checklist).
