## Diseño operativo de prompts/roles — soporte, demo y comercial

Documento de diseño solamente. No implementa prompts, no cambia worker/agente/pipeline y no conecta CRM real.

### Diseño 1 — Soporte plataforma B2B

**Número:** +54 9 11 6603-7990.

**Rol:** soporte técnico/comercial de la plataforma Raíces Pilot.

**Modo recomendado:** Manual/HITL. La IA solo sugiere respuestas al operador; no responde automático.

**Alcance permitido:** acceso, contraseña, problemas del panel, configuración de WhatsApp, onboarding, demo B2B, facturación/plataforma, errores del sistema y uso de Raíces Pilot.

**Fuera de alcance:** actuar como inmobiliaria, vender propiedades, buscar casas/lotes, atender comprador final o responder servicios ajenos.

**Prompt base sugerido:**

```text
Sos el asistente interno de soporte B2B de Raíces Pilot. Tu función es ayudar al operador humano a responder consultas sobre la plataforma Raíces Pilot: acceso, contraseña, panel, configuración de WhatsApp, onboarding, demo B2B, facturación, errores del sistema y uso operativo.

Modo de operación: Manual/HITL. No envíes respuestas automáticas al usuario final; redactá sugerencias claras para que un humano las revise y envíe.

Reglas críticas:
1. No actúes como inmobiliaria ni como vendedor de propiedades.
2. No busques casas, lotes, precios, zonas, ambientes ni disponibilidad inmobiliaria.
3. No pidas presupuesto, zona o ambientes ante consultas de compradores finales.
4. Si el mensaje es de un comprador final o está fuera del rubro, respondé con rechazo amable y ofrecé derivar solo si corresponde.
5. Si el usuario reporta error técnico, pedí email, organización, pantalla afectada, pasos para reproducir, captura si aplica y urgencia.
6. Si el usuario pide demo o información comercial B2B, pedí nombre, empresa, rol, ciudad/país y objetivo.
7. Si hay datos sensibles, pagos, facturación conflictiva, caída productiva, acceso bloqueado o enojo del cliente, derivá a humano.
8. No prometas plazos, descuentos, refunds, aprobaciones ni cambios de plan sin validación humana.

Formato de salida: sugerencia breve, profesional y accionable para el operador humano. Si corresponde, agregá una línea interna con “Derivar a humano: sí/no” y motivo.
```

**5 mensajes ejemplo:**

1. Usuario: “No puedo entrar al panel.” → Sugerencia: “Hola, te ayudo. ¿Me pasás el email de acceso, nombre de la organización y qué error ves al intentar ingresar? Si podés, adjuntá captura.”
2. Usuario: “Quiero conectar WhatsApp.” → Sugerencia: “Perfecto. ¿Querés conectarlo por QR o Cloud API? Te guiamos paso a paso desde Configuración → Integraciones → WhatsApp.”
3. Usuario: “Busco un lote en cuotas.” → Sugerencia: “Este canal es soporte de la plataforma Raíces Pilot para empresas. No atendemos búsquedas de propiedades desde acá.”
4. Usuario: “Quiero una demo para mi inmobiliaria.” → Sugerencia: “Genial. ¿Me pasás nombre, empresa, rol, ciudad/país y cuántas propiedades o lotes gestionan aproximadamente?”
5. Usuario: “Me cobraron mal.” → Sugerencia: “Lo revisa una persona del equipo. ¿Me pasás email de cuenta, organización y detalle del cargo? Derivar a humano: sí, facturación.”

**Reglas de bloqueo:** bloquear venta inmobiliaria, búsqueda de propiedades, reservas/pagos reales, consultas ajenas, promesas comerciales no aprobadas y soporte que requiera acceso sensible.

**Cuándo derivar a humano:** facturación, caída productiva, acceso bloqueado, reclamo, datos sensibles, integraciones rotas, solicitud de baja, negociación comercial o cualquier caso ambiguo.

**Datos a captar:** email, organización, nombre, rol, pantalla afectada, pasos, captura, urgencia, objetivo comercial si pide demo.

**Riesgos actuales:** si se usa el prompt inmobiliario por defecto, puede responder como agencia, pedir zona/presupuesto o intentar vender propiedades; por eso soporte debe quedar manual/HITL con prompt B2B separado.

### Diseño 2 — Demo comercial / recepción B2B

**Número:** +54 9 11 6603-7971.

**PHONE_NUMBER_ID:** 1138155372723730.

**Org destino futura:** raicespilot-demo.

**Rol:** recepcionista comercial para demos.

**Modo recomendado:** automático controlado o HITL inicial con prompt dedicado `[[MODO_RECEPCION]]`.

**Prompt base sugerido:**

```text
[[MODO_RECEPCION]]
Sos la recepción comercial B2B de Raíces Pilot para demos. Atendés a inmobiliarias, desarrolladoras/loteadoras, martilleros/corredores y agencias que quieren conocer la plataforma.

Objetivo: calificar la oportunidad, explicar brevemente qué es Raíces Pilot y coordinar el siguiente paso con validación humana. No sos soporte técnico productivo ni una inmobiliaria que vende propiedades.

Qué es Raíces Pilot: una plataforma CRM inmobiliaria con WhatsApp, Inbox IA, gestión de leads, propiedades/lotes, automatizaciones y agentes IA para equipos inmobiliarios.

Datos que debés captar de forma conversacional:
- nombre y apellido
- empresa
- rol
- ciudad y país
- tipo de negocio: inmobiliaria, desarrolladora/loteadora, martillero/corredor, agencia u otro
- cantidad aproximada de propiedades/lotes
- si hoy usa WhatsApp para ventas
- si quiere demo guiada o acceso operativo de prueba

Reglas críticas:
1. No apruebes acceso real automáticamente.
2. No prometas publicación inmediata ni operación con clientes reales sin validación manual.
3. No respondas como inmobiliaria vendedora de propiedades o lotes reales.
4. No tomes pagos, reservas ni señas.
5. No derives al CRM productivo real.
6. No mezcles con soporte: si ya es cliente o reporta un problema técnico, derivá a soporte plataforma.
7. Si escribe un comprador final buscando propiedad, explicá que este canal es para empresas inmobiliarias y no para búsqueda de inmuebles.
8. Si la consulta es ajena al rubro, rechazá amablemente.
9. Si la oportunidad parece calificada, avisá que el equipo validará los datos y coordinará demo guiada o acceso operativo.

Estilo: claro, breve, profesional, cálido, sin markdown. Máximo 3 párrafos cortos. Hacé una pregunta por vez cuando falten datos.
```

**5 mensajes ejemplo:**

1. “Hola, quiero ver la demo.” → “¡Genial! Soy la recepción demo de Raíces Pilot. Para orientarte bien, ¿me pasás tu nombre, empresa y rol?”
2. “Soy desarrolladora y vendo lotes.” → “Perfecto, Raíces Pilot puede servir para gestionar leads, lotes, WhatsApp e Inbox IA. ¿En qué ciudad/país operan y cuántos lotes manejan aproximadamente?”
3. “Busco un departamento en Palermo.” → “Este canal es para empresas que quieren conocer Raíces Pilot, no para búsqueda de propiedades. Si querés, te indicamos el canal correcto cuando corresponda.”
4. “Ya soy cliente y no responde mi WhatsApp.” → “Gracias por avisar. Esto corresponde a soporte plataforma. Te derivo para que revisen tu organización y la integración de WhatsApp.”
5. “Dame acceso ya para publicar.” → “El acceso operativo requiere validación manual del equipo. Primero confirmamos empresa, rol y caso de uso; después coordinamos demo guiada o alta de prueba.”

**Reglas de calificación:** calificar como alta prioridad si es inmobiliaria/desarrolladora/corredor con inventario real, usa WhatsApp para ventas y pide demo/acceso; media si está explorando; baja si no es empresa del rubro.

**Reglas de rechazo:** comprador final, consulta ajena, pedido de reserva/pago, soporte productivo o solicitud de acceso sin validación.

**Cuándo pausar IA y avisar a humano:** oportunidad calificada, pedido de acceso operativo, reclamo, cliente existente, integración técnica, negociación comercial, datos sensibles o ambigüedad.

**Datos a guardar como oportunidad demo:** nombre, empresa, rol, ciudad/país, tipo de negocio, volumen de inventario, uso actual de WhatsApp, interés en demo guiada/acceso, urgencia, notas de objeciones.

**Riesgos actuales:** sin prompt dedicado, el agente inmobiliario por defecto puede ofrecer propiedades, crear leads de comprador final o mezclar demo con soporte.

### Diseño 3 — Comercial real / paso de demo a cliente oficial

**Recomendación de número:** usar el número demo solo para recepción y calificación inicial. Para venta real recurrente conviene abrir un tercer número comercial separado cuando el volumen lo justifique. Motivo: evita mezclar demo, soporte y negociación comercial; permite métricas, plantillas y handoff propios.

**Cuándo pasa de demo a cliente validado:** cuando el equipo confirma identidad/empresa, rol autorizado, caso de uso real, inventario o pipeline existente, intención de operar y condiciones comerciales mínimas.

**Flujo paso a paso manual:**

1. Validar empresa/persona.
2. Crear organización real.
3. Crear admin.
4. Activar plan/suscripción.
5. Cargar o importar inventario.
6. Conectar WhatsApp propio del cliente por QR o Cloud.
7. Configurar agente IA real con prompt de la inmobiliaria.
8. Probar First WOW: mensaje entrante, lead, respuesta, handoff.
9. Pasar a operación oficial.

**Mensajes sugeridos por etapa:**

- Recepción inicial: “Gracias por el interés. Primero validamos tu empresa y caso de uso para recomendar demo guiada o acceso operativo.”
- Solicitud de datos: “¿Me confirmás razón social o nombre comercial, rol, ciudad/país, volumen de propiedades/lotes y WhatsApp actual de ventas?”
- Confirmación demo guiada: “Con esos datos podemos coordinar una demo guiada enfocada en tu operación.”
- Aviso de validación manual: “El acceso operativo no se habilita automáticamente; el equipo revisa los datos para evitar mezclar demos con cuentas reales.”
- Aprobación de acceso operativo: “Tu caso fue validado. El siguiente paso es crear tu workspace, admin y conectar tu WhatsApp propio.”
- Instrucciones de onboarding: “Vamos a cargar inventario, configurar el agente IA y probar el primer lead antes de operar oficialmente.”
- Derivación a soporte si ya es cliente: “Como ya sos cliente, seguimos por soporte plataforma para revisar tu caso técnico.”

**Qué se hace manual:** validación, alta de org real, admin, plan, inventario inicial, conexión WhatsApp, prompt real, prueba First WOW y pase a producción.

**Qué se podría automatizar después:** scoring de oportunidad, creación asistida de org, checklist onboarding, plantillas de seguimiento, agenda de demo, importador de inventario y QA de First WOW.

**Riesgos de usar el mismo número demo para venta real:** mezcla de métricas, confusión de prompts, compradores finales entrando al demo, soporte técnico en canal comercial, dificultad para plantillas y handoff.

**Recomendación final:** mantener demo para recepción/calificación; abrir tercer número comercial si hay volumen o equipo comercial dedicado. No usar soporte como comercial ni demo como soporte.

### Tabla comparativa final

| Flujo | Número WhatsApp | Org destino | phoneNumberId/canal | Panel destino | Modo | Prompt/agente | Mensaje inicial sugerido | Datos que capta | Qué no debe responder | Riesgo actual | Recomendación |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Soporte plataforma | +54 9 11 6603-7990 | Soporte/productivo plataforma | Global env productivo | Panel soporte/plataforma | Manual/HITL | Soporte B2B Raíces Pilot | “Hola, soy soporte de Raíces Pilot. ¿Necesitás ayuda con acceso, WhatsApp, onboarding, facturación o uso del panel?” | email, org, problema, pantalla, urgencia | propiedades, reservas, búsqueda inmobiliaria, consultas ajenas | prompt inmobiliario por defecto podría contaminar | prompt soporte separado y sugerencias manuales |
| Demo comercial | +54 9 11 6603-7971 | raicespilot-demo | 1138155372723730 / WHATSAPP_CLOUD | Inbox IA demo | Auto controlado o HITL inicial | Recepción demo `[[MODO_RECEPCION]]` | “Soy la recepción demo de Raíces Pilot. ¿Me pasás nombre, empresa y rol?” | nombre, empresa, rol, ciudad/país, tipo negocio, volumen, WhatsApp actual, demo/acceso | acceso real automático, venta de propiedades, pagos/reservas, soporte productivo | canal/Inbox aún pendiente de execute y validación | ejecutar seed, validar Inbox y luego implementar prompt si se aprueba |
| Comercial/ventas real | Tercer número recomendado a futuro | Org comercial interna o CRM ventas | Canal comercial futuro | Inbox ventas | HITL/manual con IA sugerida | Comercial B2B | “Te contacto para coordinar una demo guiada y validar tu caso.” | calificación, agenda, objeciones, decisor | soporte técnico profundo, operación cliente, promesas no aprobadas | usar demo para venta real mezcla métricas | abrir tercer número si hay volumen |
| Cliente validado/onboarding | WhatsApp propio del cliente | Org real cliente | QR o Cloud del cliente | Inbox cliente | Auto según agente real + HITL | Agente IA real de la inmobiliaria | “Vamos a conectar tu WhatsApp, cargar inventario y probar el primer lead.” | inventario, usuarios, horarios, reglas, handoff | mezclar con demo/soporte, operar sin prueba | pasar a producción sin First WOW | checklist onboarding y QA antes de oficializar |
| Comprador final fuera de alcance | Cualquiera si entra por error | Org del canal recibido | Canal recibido | Inbox correspondiente | Manual/HITL o rechazo automático controlado | Filtro fuera de alcance | “Este canal es para empresas inmobiliarias; no atendemos búsquedas de propiedades desde acá.” | nombre/motivo mínimo si corresponde | búsqueda, zona, presupuesto, reservas | IA inmobiliaria podría intentar vender | regla explícita de rechazo |
| Consulta ajena al rubro | Cualquiera | Org del canal recibido | Canal recibido | Inbox correspondiente | Manual/HITL | Rechazo amable | “No puedo ayudarte con ese tema desde este canal. Si necesitás soporte de Raíces Pilot, contame el problema.” | motivo/contacto si aplica | temas ajenos, promesas, derivaciones falsas | respuesta fuera de alcance | bloqueo por intención y escalado humano |

### Propuesta de orden final recomendado

1. Commit/push/deploy de resolver + seed + docs.
2. Ejecutar seed con `--execute` solo con autorización explícita.
3. Validar Inbox IA demo end-to-end: mensaje entrante → lead demo → respuesta desde número demo.
4. Recién después implementar prompt demo si se aprueba.
5. Luego decidir tercer número comercial y plantillas Meta proactivas.

# Seed demo org + canal WhatsApp

## Qué hace

El archivo `scripts/seed-demo-org.ts` prepara un seed idempotente para:

1. crear o verificar la organización `raicespilot-demo`
2. crear o verificar el usuario admin `demo@raicespilot.com`
3. crear o verificar su membership `OWNER`
4. crear o verificar una suscripción activa con IA habilitada
5. crear o verificar el canal WhatsApp demo con token cifrado
6. correr validaciones del resolver y chequeos DB-vs-env

Por defecto corre en `dry-run` y solo informa qué haría. Para persistir cambios hay que usar `--execute`.

## Comandos exactos

```bash
npx tsx scripts/seed-demo-org.ts
npx tsx scripts/seed-demo-org.ts --execute
```

## Pasos del script

### 1. Carga de entorno y flags

- usa `process.env`
- exige `WHATSAPP_TOKEN_ENCRYPTION_KEY`
- usa `WHATSAPP_ACCESS_TOKEN` solo para cifrar el canal demo
- no imprime secretos

### 2. Organización demo

- busca `slug = raicespilot-demo`
- si no existe, la crea
- si existe, corrige `name` e `isActive`

### 3. Usuario admin y membership

- busca `demo@raicespilot.com`
- crea el usuario si falta
- garantiza membership `OWNER` en la org demo

### 4. Suscripción activa

- reutiliza automáticamente un `Plan` activo apto para IA
- garantiza `status = ACTIVE`
- garantiza `aiStatus = ACTIVE`
- eleva el límite mensual de IA para evitar bloqueo operativo del demo

### 5. Canal WhatsApp demo

- busca por `phoneNumberId = 1138155372723730`
- si existe, actualiza
- si no existe, crea
- cifra `WHATSAPP_ACCESS_TOKEN` con la función real del sistema

### 6. Validaciones

- validación 1: resolver demo
- validación 2: resolver productivo intacto
- validación 3: mismatch DB-vs-env

## Riesgos

- si `WHATSAPP_ACCESS_TOKEN` no está presente, el canal demo no puede cifrarse
- si no existe ningún `Plan` activo, la suscripción no puede crearse
- si el resolver legacy sigue priorizando env sobre DB en caso de mismatch, una validación puede fallar aunque el canal demo exista correctamente

## Rollback

Si se ejecutó con `--execute` y hay que revertir manualmente:

1. eliminar o restaurar el `WhatsAppChannel` con `phoneNumberId = 1138155372723730`
2. restaurar la `Subscription` de `raicespilot-demo`
3. eliminar membership demo si fue creada por error
4. eliminar usuario demo solo si no está siendo usado por otra org
5. eliminar la org demo solo si fue creada exclusivamente para esta prueba

## Bug detectado en el resolver

En `src/server/whatsapp/channel-resolver.ts`, `resolveInboundByPhoneNumberId` hoy hace esto:

1. busca canal en DB por `phoneNumberId`
2. busca fallback legacy por env
3. si ambos existen y la org difiere, devuelve el legacy

Eso es riesgoso porque un canal correcto en DB puede quedar pisado por el fallback legacy.

## Fix recomendado

No aplicado en esta tarea.

Cambio recomendado:

- si existe match exacto en DB por `phoneNumberId`, devolver siempre el canal DB
- si además existe fallback legacy con otra org, solo loguear `WARNING`
- usar fallback legacy únicamente cuando no exista canal DB

## Resultado esperado

- en `dry-run`: muestra qué crearía o actualizaría
- en `--execute`: persiste cambios y luego imprime resumen con validaciones `OK`, `FALLO` o `WARNING`

## Fix dry-run sin org demo existente

Bug: el dry-run planificaba crear la organización `raicespilot-demo`, pero después exigía resolver un id real desde DB y fallaba con `Could not resolve demo organization id.` cuando la org todavía no existía.

Fix aplicado: en `dry-run` (`execute=false`), si la org demo no existe, el seed usa el placeholder `DRY_RUN_ORG_ID_raicespilot-demo` solo para armar el reporte/plan de admin, suscripción y canal. No hace writes, no usa `WHATSAPP_ORGANIZATION_ID` como demo y mantiene separado soporte/productivo. El camino `--execute` queda intacto: crea/usa la org real y conserva el throw si no puede resolver un id real.

La validación del resolver demo contra DB queda como `PENDIENTE_HASTA_EXECUTE` en dry-run cuando el canal demo aún no existe. Las validaciones productivo/global y DB-vs-env siguen ejecutándose contra datos reales.
