# Manual Operativo — RaicesPilot SaaS

**Versión**: 1.0  
**Fecha**: Abril 2026  
**Documento**: Guía centralizada de operación técnica y comercial.

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
- **Integraciones**: WhatsApp Cloud API, OpenAI API, Mercado Pago, UploadThing.

---

## 2. Gestión de Roles y Permisos

El sistema utiliza una estructura jerárquica de permisos basada en membresías por organización.

| Rol | Siglas | Descripción |
| :--- | :--- | :--- |
| **OWNER** | OW | Titular de la inmobiliaria. Acceso total a facturación, configuración de la organización y gestión de equipo. |
| **ADMIN** | AD | Administrador operativo. Puede gestionar agentes IA, propiedades y supervisar a todos los agentes. |
| **AGENT** | AG | Agente de ventas. Operación comercial diaria: gestión de sus propios leads, conversaciones y visitas. |
| **ASSISTANT** | AS | Soporte operativo. Acceso limitado a carga de datos y visualización. |
| **Platform Admin** | PA | Administrador de la infraestructura global (`isPlatformAdmin: true`). Acceso al panel `/platform`. |

---

## 3. Guía Funcional por Módulos

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
- **Disponibilidad**: Puede operar 24x7 o en horarios específicos.
- **Handoff (Escalamiento)**: Se activa por palabras clave o tras N mensajes sin resolución. Envía una notificación inmediata al equipo humano.

### 3.4. Conversaciones y Mensajería
Interfaz unificada para comunicación.
- **Inbox**: Filtra por estado de conversación (`OPEN`, `QUALIFIED`, `CLOSED`).
- **Follow-up**: Sistema de seguimiento automático para mensajes que requieren respuesta técnica o comercial.
- **Control Humano**: Permite a un agente tomar el control total del chat, pausando la IA momentáneamente.

### 3.5. Agenda de Visitas
Gestión de citas presenciales.
- **Estados**: `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELED`.
- **Automatización**: Recordatorios automáticos post-visita para solicitar feedback del lead.

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
- **Onboarding de Org**: Creación rápida de nuevos tenants con un par de clics.
- **Health Check**: Monitoreo del `Worker Heartbeat`. Si el worker no reporta señal en > 5 minutos, se considera caído.
- **Billing Table**: Control de cobranzas manuales y seguimiento de pagos de Mercado Pago.

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

## 7. Mantenimiento y Seguridad

- **Estabilidad de DB**: Nunca ejecutar `db push` en producción. Los cambios de esquema se realizan mediante scripts controlados.
- **Seguridad**: Todas las sesiones son validadas vía HMAC-SHA256. El acceso a los workspaces está restringido estrictamente por el `organizationId` del usuario autenticado.
- **Logs de Auditoría**: El sistema registra acciones críticas (borrado de leads, cambios de plan) en una tabla de auditoría.
