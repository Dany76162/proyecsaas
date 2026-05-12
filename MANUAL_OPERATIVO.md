# Manual Operativo — RaicesPilot SaaS

**Versión**: 1.0  
**Fecha**: Abril 2026  
**Documento**: Guía centralizada de operación técnica y comercial para Superadmins.

> [!NOTE]
> Este documento es el **Manual Maestro Técnico**. Para guías de uso diario integradas en la plataforma, consulta el **Manual de Inmobiliarias** (en el workspace del cliente) y el **Manual Operativo Vivo** (en el panel Superadmin).

---

## 1. Visión General del Sistema

**RaicesPilot** es una plataforma SaaS multi-tenant B2B diseñada exclusivamente para agencias inmobiliarias argentinas. Su objetivo es automatizar la captación y calificación de leads mediante inteligencia artificial, centralizando la operación en un CRM especializado.

### Propósito Core
- **Automatización 24/7**: Captación de leads vía WhatsApp usando GPT-4o-mini.
- **Calificación Inteligente**: Filtrado de prospectos según zona, presupuesto y tipo de propiedad.
- **Escalamiento Humano**: Handoff fluido a operadores humanos cuando la IA detecta una intención de cierre o duda compleja.
- **Gestión Inmobiliaria**: CRM integrado con módulos de propiedades, visitas y analítica.

### Stack Tecnológico Principal
- **Framework**: Next.js 15 (App Router).
- **Base de Datos**: PostgreSQL con Prisma ORM.
- **Colas/Background**: BullMQ con Redis.
- **Integraciones**: WhatsApp Cloud API (v21.0), OpenAI (GPT-4o / GPT-4o-mini), Mercado Pago (Checkout Pro), UploadThing.

### Arquitectura de Datos (ERD)
- **Organization (Tenant)**: La entidad raíz. Posee su propio subdominio (slug), base de propiedades y configuración de IA.
- **User (Global)**: El usuario existe a nivel plataforma. Su email es único.
- **Membership**: El puente entre User y Organization. Define el rol (OWNER, ADMIN, etc.).
- **WhatsAppChannel**: Vinculado a la Org. Soporta múltiples números, pero uno actúa como primario para la IA.

---

## 2. Gestión de Roles y Permisos

El sistema utiliza una estructura jerárquica de permisos basada en membresías por organización.

| Rol | Siglas | Descripción |
| :--- | :--- | :--- |
| **OWNER** | OW | Titular de la inmobiliaria. Acceso total a facturación, configuración de la organización y gestión de equipo. |
| **ADMIN** | AD | Administrador operativo. Puede gestionar agentes IA, propiedades y supervisar a todos los agentes. |
| **AGENT** | AG | Agente de ventas. Operación comercial diaria: gestión de sus propios leads, conversaciones y visitas. |
| **ASSISTANT** | AS | Soporte operativo. Acceso limitado a carga de datos y visualización. |
| **Platform Admin** | PA | Administrador de la infraestructura global (`isPlatformAdmin: true`). Acceso al panel `/platform`. Puede auditar workspaces ajenos bajo protocolo de seguridad. |

---

## 4. Seguridad, Privacidad y Auditoría

Para garantizar el cumplimiento legal y la transparencia operativa, el sistema implementa tres capas de control:

### 4.1. Aceptación Obligatoria de Políticas
Todo usuario, al ingresar por primera vez o tras una actualización legal, debe aceptar las **Políticas de Uso y Privacidad** en `/auth/accept-policies`. El acceso a los datos de la inmobiliaria está bloqueado hasta que se confirme esta aceptación.

### 4.2. Registro de Auditoría (Audit Logs)
El sistema registra acciones sensibles de los administradores de plataforma:
- **SUPERADMIN_WORKSPACE_ACCESS**: Registra cada vez que un Superadmin accede al workspace de una inmobiliaria para soporte técnico.
- El log incluye: Actor, Fecha, Organización accedida y Contexto del acceso.

### 4.3. Recuperación de Accesos (Contraseñas)
Dado que RaicesPilot es un entorno corporativo controlado, la recuperación de claves se gestiona mediante soporte administrativo:
1. **Solicitud**: El usuario utiliza el enlace "¿Olvidaste tu clave?" en el login para enviar un mensaje de WhatsApp al Superadmin.
2. **Reinicio**: El Superadmin utiliza la función **"Reiniciar Clave"** en el panel de control.
3. **Link Único**: Se genera un enlace de invitación temporal (48hs) que permite al usuario establecer una nueva clave.

---

## 5. Guía Funcional por Módulos

### 3.1. CRM de Leads (Prospectos)
Centraliza toda la información de los clientes potenciales.
- **Ciclo de Vida**: `NEW` -> `CONTACTED` -> `INTERESTED` -> `VISIT` -> `CLOSED`.
- **Scoring**: El sistema califica automáticamente al lead basándose en "señales comerciales" detectadas por la IA.
- **Asignación**: Los leads pueden asignarse manualmente o automáticamente a un `OWNER` o `AGENT`.

### 3.2. Gestión de Propiedades
Inventario digital sincronizable.
- **Atributos**: Soporte para tipo de operación (Venta/Alquiler), ubicación (lat/long), moneda (ARS/USD), expensas y galería de imágenes.
- **Sincronización**: Posibilidad de importar propiedades desde fuentes externas vía URL (PropertySource).
- **Catálogo Público**: Cada inmobiliaria tiene un `/catalog` público y un `/map` interactivo.

### 3.3. Agentes IA (WhatsApp)
El "cerebro" conversacional del sistema.
- **Configuración**: Se define el tono (Formal/Amigable), persona, y filtros específicos (zonas permitidas, presupuesto min/max).
- **Disponibilidad**: Sincronización con el módulo de horarios para proponer visitas reales.
- **Handoff (Escalamiento)**: Se activa automáticamente cuando la IA detecta una intención de cierre, duda compleja o solicitud explícita de "humano". 
    - **isHumanControlled**: Bandera en la conversación que silencia a la IA para permitir la intervención manual sin interferencias.

### 3.4. Radar de Operaciones IA (Superadmin)
Herramienta de auditoría profunda para el equipo de plataforma.
- **Salud por Cliente**: Detecta si una inmobiliaria tiene el canal WABA caído o si su IA no tiene propiedades cargadas para vender.
- **Auditoría de Derivaciones**: Permite ver qué conversas terminaron en "atascadas" (sin respuesta humana post-IA) para asesorar al cliente.
- **Métricas de Impacto**: Visualización del volumen de mensajes procesados vs. derivaciones exitosas.
- **Inbox**: Filtra por estado de conversación (`OPEN`, `QUALIFIED`, `CLOSED`).
- **Follow-up**: Sistema de seguimiento automático para mensajes que requieren respuesta técnica o comercial.
- **Control Humano**: Permite a un agente tomar el control total del chat, pausando la IA momentáneamente.

### 3.5. Gestión de Disponibilidad y Visitas
Permite configurar cuándo la IA puede agendar citas físicas o virtuales.
- **Configuración**: Se realiza en `/[orgSlug]/settings/availability`.
- **Inteligencia**: La IA consulta estos slots en tiempo real para proponer turnos a los leads calificados.
- **Seguimiento**: Gestión de estados de citas (`PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELED`) y recordatorios automáticos.

---

## 4. Configuraciones Críticas

### 4.1. Integración WhatsApp (Meta)
Para que el sistema funcione, cada organización debe vincular su WABA (WhatsApp Business Account).
- **Requisito**: `phoneNumberId`, `wabaId` y `accessToken` cifrado.
- **Validación**: El sistema monitorea el estado del canal (`ACTIVE`, `DISCONNECTED`, `ERROR`).

### 4.2. Pagos y Facturación (Mercado Pago)
Gestión de suscripciones y cobros.
- **Checkout**: Integración con Mercado Pago Checkout Pro.
- **Webhook**: Procesamiento automático de notificaciones de pago para activar/suspender organizaciones.

---

## 5. Panel de Plataforma (Superadmin)

Ubicado en `/platform`, es el centro de control para los dueños del software.

### 5.1. Onboarding Flow (Alta de Cliente)
1. **Creación**: Se genera la `Organization` con su slug único.
2. **Primer Acceso**: Se genera un `InviteToken` para el email del titular (OWNER).
3. **Activación**: El cliente recibe el link, establece su contraseña y acepta las políticas de uso.
4. **Setup WABA**: El Superadmin vincula el `phoneNumberId` y el token de Meta.
5. **Carga Inicial**: El cliente carga sus propiedades (vía manual o scraping) y activa su Agente IA.

### 5.2. Gestión de Accesos y Recuperación
- **Reiniciar Clave**: Función crítica para generar nuevos enlaces de acceso para usuarios que olvidaron su contraseña o quedaron bloqueados.
- **Limpiar Accesos**: Permite purgar todas las membresías de una inmobiliaria en caso de rescisión de contrato, manteniendo los datos históricos.

### 5.2. Salud y Monitoreo
- **Health Check**: Monitoreo en tiempo real de WhatsApp, OpenAI y el Worker.
- **Worker Heartbeat**: Si el worker no reporta señal en > 5 minutos, se considera caído.

### 5.3. Control Comercial
- **Billing Table**: Control de cobranzas manuales y seguimiento de pagos de Mercado Pago.
- **Suscripciones**: Gestión del estado comercial (Activo/Suspendido) de cada cliente.

---

## 6. Flujos Operativos Críticos

### 6.1. Flujo de Captación Automática
1. Lead envía mensaje a WhatsApp.
2. `webhook/whatsapp` recibe y encola el job en BullMQ.
3. El `conversation-worker` consulta a la IA con el contexto de la organización y propiedades.
4. IA responde calificando al lead si detecta interés claro.
5. Se crea/actualiza el registro en el CRM.

### 6.2. Handoff a Operador Humano
Si el lead dice "quiero hablar con un humano" o "quiero coordinar una visita":
1. La IA detecta el marcador de escalamiento.
2. Marca la conversación como `isHumanControlled: true`.
3. Dispara una `Notification` interna para los miembros de la organización.
4. El agente humano recibe la alerta y continúa el chat desde el Inbox.

---

## 7. Landing Page y Captación Central

El ecosistema comienza en la web pública, que sirve tanto de vitrina como de embudo para la plataforma misma.

### 7.1. Web Pública (Landing)
- **Propósito**: Conversión de inmobiliarias interesadas.
- **CTAs**: Todos los botones de "Solicitar Demo" apuntan al WhatsApp central de ventas de la plataforma.
- **Marquee de Clientes**: Carrusel dinámico que muestra logos de inmobiliarias que ya operan con RaicesPilot.

### 7.2. Módulo de Captación (Superadmin)
- **Inbox Central**: Ubicado en `/platform/support`, centraliza las consultas de inmobiliarias interesadas que entran por el número oficial de RaicesPilot.
- **Link Comercial**: Ubicado en `/platform/captacion`, permite generar enlaces con el prefijo `[ref:orgslug]` para que la IA sepa de qué inmobiliaria viene el interesado (si aplica) o tratarlo como un lead de plataforma.

---

## 8. Mantenimiento y Seguridad

- **Estabilidad de DB**: Nunca ejecutar `db push` en producción. Los cambios de esquema se realizan mediante scripts controlados.
- **Seguridad**: Todas las sesiones son validadas vía HMAC-SHA256. El acceso a los workspaces está restringido estrictamente por el `organizationId` del usuario autenticado.
- **Logs de Auditoría**: El sistema registra acciones críticas (borrado de leads, cambios de plan) en una tabla de auditoría.
