# RaicesPilot SaaS 🚀

Plataforma SaaS multi-tenant B2B industrial diseñada para automatizar la captación y calificación de leads en el sector inmobiliario mediante Inteligencia Artificial (WhatsApp Cloud API + GPT-4).

---

## 🌟 Funcionalidades Core

### 1. Motor Conversacional IA
- **Agentes Especializados**: Cada inmobiliaria tiene un bot con tono, persona y conocimientos específicos.
- **Conocimiento de Inventario**: La IA tiene acceso en tiempo real a las propiedades para responder consultas técnicas.
- **Agendamiento Autónomo**: La IA propone turnos de visita basados en la disponibilidad real del equipo comercial.

### 2. Gestión de Inventario (PropertySource)
- **Scraping Inteligente**: Permite importar propiedades desde sitios web externos pegando una URL.
- **Indexación Vectorial**: Los datos se procesan para ser consumidos de forma eficiente por el modelo de lenguaje.
- **Catálogo Público**: Generación automática de `/catalog` y `/map` interactivo para cada cliente.

### 3. CRM y Pipeline de Ventas
- **Lead Scoring**: Calificación automática de leads según intención de compra/alquiler.
- **Inbox Unificado**: Gestión de chats de WhatsApp con control humano (Handoff).
- **Notificaciones Push**: Alertas inmediatas vía WhatsApp y web cuando un lead está listo para el cierre.

### 4. Panel Superadmin (Plataforma)
- **Radar IA**: Monitoreo de la performance de los bots por cliente.
- **Control de Facturación**: Integración con Mercado Pago para gestión de suscripciones.
- **Hardening de Seguridad**: Auditoría de accesos administrativos y aceptación obligatoria de políticas.

---

## 🛠 Stack Tecnológico

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS, Lucide Icons.
- **Backend**: Node.js, Next.js Server Actions, BullMQ (Colas de procesamiento).
- **Base de Datos**: PostgreSQL + Prisma ORM (Cifrado en reposo para tokens).
- **IA**: OpenAI API (GPT-4o / GPT-4o-mini), LangChain.
- **Mensajería**: WhatsApp Business Cloud API.
- **Infraestructura**: Railway, Redis (para BullMQ), UploadThing (Media).

---

## 📂 Estructura del Proyecto

El proyecto es un monorepo basado en `pnpm workspaces`:

- **`artifacts/proyecsaas/src/app`**: Rutas y páginas (Estructura Next.js).
- **`artifacts/proyecsaas/src/modules`**: Lógica de negocio desacoplada (Platform, Organizations, Agents, etc.).
- **`artifacts/proyecsaas/src/server`**: Servicios centrales (Auth, DB, Audit, Billing).
- **`artifacts/proyecsaas/src/components`**: Design System y componentes de UI (Workspace y Platform).

---

## ⚙️ Configuración (Variables de Envorno)

Se requiere un archivo `.env` en `artifacts/proyecsaas/` con las siguientes claves:

| Variable | Descripción |
| :--- | :--- |
| `DATABASE_URL` | Conexión a PostgreSQL. |
| `REDIS_URL` | Conexión a Redis para el worker de colas. |
| `OPENAI_API_KEY` | API Key para GPT-4. |
| `WHATSAPP_TOKEN` | Token de acceso a Meta Cloud API. |
| `WHATSAPP_ORGANIZATION_ID` | ID de la organización de plataforma para captación central. |
| `NEXT_PUBLIC_APP_URL` | URL base de la aplicación (ej. https://raicespilot.com). |

---

## 🚀 Guía de Desarrollo y Despliegue

### Desarrollo Local
```bash
# Instalar dependencias (raíz)
pnpm install

# Iniciar Next.js
pnpm --filter @workspace/proyecsaas run dev

# Iniciar Worker (procesamiento de mensajes)
pnpm --filter @workspace/proyecsaas run worker:dev
```

### Despliegue en Producción
El sistema opera bajo una política de **estabilidad absoluta**:
- **Cero Mutaciones Automáticas**: El build de producción NO ejecuta `db push` ni `migrate`.
- **Rama Recomendada**: `proyecsaas2` (entorno de estabilización).
- **Manual Operativo**: Para detalles de administración, consultar el [Manual Operativo Vivo](/platform/manual-operativo).

---

## 🛡 Seguridad y Cumplimiento
- **Audit Log**: Registro inmutable de acciones administrativas sensibles.
- **Aislamiento Multi-tenant**: Validación estricta de `organizationId` en cada capa de datos.
- **Recovery**: Sistema de reinicio de claves gestionado por Superadmin para cuentas bloqueadas.

---
© 2026 Inmuebles Digitales — RaicesPilot Enterprise.