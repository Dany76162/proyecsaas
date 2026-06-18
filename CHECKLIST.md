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

**App B2C "Inmuebles" (compradores)**
- ✅ App pública en `/propiedades` separada de la B2B: `manifest-b2c.json` (id/scope `/propiedades`, splash blanco) + `sw-b2c.js` **passthrough SIN push** (compradores nunca reciben notificaciones) (`58f2d6f`).
- ✅ SW B2C acotado a scope `/propiedades` para **no pisar** el `sw.js` del panel B2B (que maneja el push) — fix mío sobre la implementación de Antigravity.
- ✅ Botón "App Móvil" en el navbar de `/propiedades` (prompt / iOS / fallback manual) en vez de banner flotante.
- ✅ `id` agregado a ambos manifests → Chrome los trata como 2 apps instalables distintas.
- ✅ `/manifest-b2c.json` y `/sw-b2c.js` públicos en middleware (`8eb9b02`). Todo verificado en prod (200).

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
- ⚠️ **En diagnóstico:** un usuario conectó WhatsApp por QR (canal ACTIVE, visible en integraciones) pero el número **no aparece** en la lista de asignación del agente, pese a que ambas pantallas usan el mismo filtro `isActive: true`. Desplegado `GET /api/whatsapp-debug` (`3c38e74`) para obtener el estado real del canal en prod. **Pendiente:** ver el JSON del usuario y corregir. *(Quitar el endpoint debug cuando se resuelva.)*

## 19. AUTOMATIZACIONES — 🟢 Terminado
- ☑ Replanteado como **"Actividad automática"** (`f0b0850`).

## 20. AGENTOS — 🟡 Beta
- **Auditoría:** UI bien construida (biblioteca de agentes con estados legítimos, prospecting con degradación elegante si falta `SERPER_API_KEY`). El 🟡 viene de profundidad (prompts/HITL/validación = internals ⛔) y costos IA (§40).
- ✅ **Control de costos de IA REAL** implementado (ver §40, `a3d556d`).
- 🟡 Opcional: setear `SERPER_API_KEY` en Railway enciende el Buscador Web (API paga de terceros, decisión tuya).

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

## ⏭️ PRÓXIMO PASO (bloqueado en tu decisión)
1. ✔️ ~~Copy sección "Desarrolladoras" (§2)~~ → **hecho y en prod** (`0907f4f`).
2. ✔️ ~~Unificación de badges (§32/41)~~ → divergencias estáticas de estado de lote **cerradas** (`d4233a5`).
3. ✔️ ~~Onboarding First-WOW §46 completo~~ → Fases A·B·C + gate de prueba **hechos y en prod** (`4dff3f1` · `96ca822` · `18b28c2` · `ace4c06`, verificados runtime).
4. — sin pendientes abiertos de mi lado; a tu decisión qué priorizar (otra sección del checklist).
