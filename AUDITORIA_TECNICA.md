# AUDITORÍA TÉCNICA COMPLETA — RaicesPilot SaaS

> **Fecha**: Abril 2026  
> **Rama analizada**: `dev-proyecsaas1`  
> **Propósito**: Documentación técnica de referencia para mantenimiento, mejora y onboarding de nuevos desarrolladores.

---

## ÍNDICE

1. [Visión General del Sistema](#1-visión-general-del-sistema)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Estructura de Directorios](#3-estructura-de-directorios)
4. [Base de Datos — Modelos Prisma](#4-base-de-datos--modelos-prisma)
5. [Arquitectura y Flujo de Datos](#5-arquitectura-y-flujo-de-datos)
6. [Sistema de Autenticación](#6-sistema-de-autenticación)
7. [Módulos Principales](#7-módulos-principales)
8. [Flujos Críticos del Sistema](#8-flujos-críticos-del-sistema)
9. [API Routes (Endpoints)](#9-api-routes-endpoints)
10. [Worker y Jobs en Background](#10-worker-y-jobs-en-background)
11. [Integraciones Externas](#11-integraciones-externas)
12. [Sistema Multi-Tenant](#12-sistema-multi-tenant)
13. [Seguridad](#13-seguridad)
14. [Puntos Críticos y Riesgos](#14-puntos-críticos-y-riesgos)
15. [Variables de Entorno](#15-variables-de-entorno)
16. [Logging y Monitoreo](#16-logging-y-monitoreo)
17. [Deployment e Infraestructura](#17-deployment-e-infraestructura)

---

## 1. Visión General del Sistema

**RaicesPilot** es una plataforma **SaaS multi-tenant B2B** diseñada exclusivamente para agencias inmobiliarias argentinas.

### Propósito
Automatiza la captación y calificación de leads vía WhatsApp usando inteligencia artificial (GPT-4o-mini), operando 24/7 y escalando a operadores humanos cuando es necesario. Centraliza la operación comercial del equipo en un CRM integrado con módulos de propiedades, visitas, conversaciones y automatizaciones.

### Tipo de sistema
- **Monolito modular** basado en Next.js 15 App Router
- **Multi-tenant**: Cada inmobiliaria (org) opera en un workspace aislado identificado por `orgSlug`
- **Arquitectura**: Server Components + Server Actions + Worker BullMQ separado
- **Base de datos**: PostgreSQL con Prisma ORM, aislamiento por `organizationId`

### Roles de usuario
| Rol | Nivel | Permisos |
|-----|-------|----------|
| `OWNER` | 4 | Titular — acceso total |
| `ADMIN` | 3 | Administrador — gestión y operación |
| `AGENT` | 2 | Agente de ventas — operación comercial |
| `ASSISTANT` | 1 | Asistente — soporte operativo |
| Platform Admin | — | `isPlatformAdmin=true` — acceso al panel superadmin `/platform` |

---

## 2. Stack Tecnológico

### Frontend & Framework
| Tecnología | Versión | Uso |
|---|---|---|
| Next.js | 15.2.0 | App Router, React Server Components, Server Actions |
| React | 19.0.0 | UI |
| TypeScript | 5.8.2 | Tipado estático (target ES2022) |
| Tailwind CSS | 3.4.17 | Estilos utilitarios |
| Framer Motion | — | Animaciones en flujo de onboarding |
| Zod | 3.24.2 | Validación de schemas en server actions |
| Lucide React | — | Iconografía |

### Backend & ORM
| Tecnología | Versión | Uso |
|---|---|---|
| Prisma Client | 6.5.0 | ORM PostgreSQL |
| Node.js crypto | nativo | HMAC-SHA256 para sesiones y webhooks |
| bcrypt | — | Hash de contraseñas |

### Colas y Jobs en Background
| Tecnología | Versión | Uso |
|---|---|---|
| BullMQ | 5.46.1 | Sistema de colas distribuido |
| IORedis | 5.4.1 | Cliente Redis para BullMQ |

### Integraciones Externas
| Servicio | Uso |
|---|---|
| OpenAI GPT-4o-mini | Agente IA conversacional |
| WhatsApp Cloud API (Meta) | Mensajería entrante y saliente |
| Mercado Pago | Webhooks de pagos, Checkout Pro, suscripciones |
| UploadThing 7.7.4 | Subida de imágenes de propiedades |

### Herramientas de Desarrollo
| Herramienta | Versión | Uso |
|---|---|---|
| ESLint | 9.22.0 | Linting |
| Prettier | 3.8.1 | Formateo de código |
| tsx | 4.19.2 | Ejecutor TypeScript para el worker |
| PostCSS | 8.5.3 | Procesamiento CSS |

### Deployment
| Tecnología | Uso |
|---|---|
| Railway | Hosting con health checks y restart on failure |
| Nixpacks | Build automatizado |
| PostgreSQL | Base de datos principal (Railway plugin) |
| Redis | Backend de BullMQ (Railway plugin) |

---

## 3. Estructura de Directorios

```
proyecsaas/
├── artifacts/proyecsaas/           ← Proyecto principal (monorepo workspace)
│   ├── prisma/
│   │   ├── schema.prisma           ← Todos los modelos de datos
│   │   └── seed.js                 ← Datos iniciales
│   ├── src/
│   │   ├── app/                    ← Next.js App Router
│   │   │   ├── layout.tsx          ← Layout global (Inter font, metadata)
│   │   │   ├── page.tsx            ← Home (lista de módulos disponibles)
│   │   │   ├── globals.css
│   │   │   ├── login/
│   │   │   │   └── page.tsx        ← Autenticación email + password
│   │   │   ├── suspended/
│   │   │   │   └── page.tsx        ← Pantalla para orgs suspendidas
│   │   │   ├── invite/[token]/
│   │   │   │   ├── page.tsx        ← Mostrar formulario de aceptar invite
│   │   │   │   ├── actions.ts      ← acceptInviteAction()
│   │   │   │   └── invite-accept-form.tsx
│   │   │   ├── map/
│   │   │   │   ├── page.tsx        ← Visor público de propiedades (sin auth)
│   │   │   │   └── [propertyId]/page.tsx
│   │   │   ├── [orgSlug]/          ← Workspace multi-tenant dinámico
│   │   │   │   ├── (workspace)/    ← Grupo de rutas autenticadas
│   │   │   │   │   ├── layout.tsx      ← WorkspaceShell (sidebar + header)
│   │   │   │   │   ├── page.tsx        ← Dashboard del tenant
│   │   │   │   │   ├── agents/         ← CRUD de agentes IA
│   │   │   │   │   ├── automations/    ← Reglas de automatización
│   │   │   │   │   ├── conversations/  ← Historial de chat WhatsApp
│   │   │   │   │   ├── leads/          ← CRM de prospects
│   │   │   │   │   ├── properties/     ← Inventario inmobiliario
│   │   │   │   │   ├── visits/         ← Agenda de visitas
│   │   │   │   │   └── settings/       ← Configuración del tenant
│   │   │   │   │       ├── organization/
│   │   │   │   │       ├── users/
│   │   │   │   │       ├── integrations/
│   │   │   │   │       └── availability/
│   │   │   │   └── catalog/
│   │   │   │       └── page.tsx    ← Landing público de la inmobiliaria
│   │   │   ├── platform/           ← Panel Superadmin
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx            ← Dashboard superadmin
│   │   │   │   ├── organizations/      ← Gestión de tenants
│   │   │   │   ├── billing/            ← Cobranzas y facturación
│   │   │   │   ├── onboarding/         ← Historial de invitaciones
│   │   │   │   ├── health/             ← Dashboard salud del sistema
│   │   │   │   ├── settings/           ← Configuración global
│   │   │   │   │   ├── PlatformSettingsUI.tsx
│   │   │   │   │   └── actions/settings-actions.ts
│   │   │   │   ├── support/            ← Chat de soporte a tenants
│   │   │   │   ├── ImpactSection.tsx   ← Analítica de rendimiento (client)
│   │   │   │   └── analytics-actions.ts
│   │   │   └── api/
│   │   │       ├── health/route.ts
│   │   │       ├── webhooks/
│   │   │       │   ├── whatsapp/route.ts       ← GET verification + POST messages
│   │   │       │   └── mercadopago/route.ts    ← POST notifications
│   │   │       ├── uploadthing/route.ts
│   │   │       ├── properties/
│   │   │       │   └── sync-from-source/route.ts
│   │   │       ├── whatsapp/
│   │   │       │   └── simulate/route.ts       ← Testing
│   │   │       └── internal/
│   │   │           └── automation-simulate/route.ts  ← Testing
│   │   ├── components/
│   │   │   ├── crm/
│   │   │   │   └── conversation-inbox.tsx      ← Inbox WhatsApp con filtros
│   │   │   ├── onboarding/
│   │   │   │   └── OnboardingManager.tsx       ← Video de bienvenida
│   │   │   ├── platform/
│   │   │   │   ├── platform-sidebar.tsx        ← Sidebar superadmin
│   │   │   │   ├── platform-shell.tsx          ← Shell superadmin (hamburger menu)
│   │   │   │   ├── platform-ui.tsx             ← HealthBadge, WhatsAppStatus, etc.
│   │   │   │   ├── onboarding-controls.tsx     ← Controles por tenant en tabla
│   │   │   │   ├── create-org-dialog.tsx       ← Nuevo tenant (3 campos)
│   │   │   │   └── billing-table.tsx           ← Tabla de cobros con búsqueda
│   │   │   ├── workspace/
│   │   │   │   ├── workspace-shell.tsx         ← Shell workspace (hamburger menu)
│   │   │   │   ├── workspace-sidebar.tsx       ← Sidebar workspace
│   │   │   │   ├── workspace-header.tsx
│   │   │   │   ├── metric-card.tsx
│   │   │   │   └── section-card.tsx
│   │   │   ├── organizations/
│   │   │   │   └── organization-settings-forms.tsx
│   │   │   ├── properties/
│   │   │   │   └── property-image-gallery.tsx
│   │   │   ├── users/
│   │   │   │   └── edit-member-dialog.tsx
│   │   │   └── ui/                             ← Componentes reutilizables genéricos
│   │   ├── modules/                ← Lógica de negocio (domain layer)
│   │   │   ├── agents/
│   │   │   │   ├── types.ts
│   │   │   │   ├── service.ts
│   │   │   │   └── actions.ts
│   │   │   ├── auth/
│   │   │   │   └── index.ts
│   │   │   ├── automations/
│   │   │   │   ├── types.ts
│   │   │   │   ├── decision-service.ts     ← OpenAI + parseo de marcadores
│   │   │   │   └── delivery-service.ts     ← Envío vía WhatsApp API
│   │   │   ├── availability/
│   │   │   │   ├── service.ts
│   │   │   │   └── actions.ts
│   │   │   ├── conversations/
│   │   │   │   ├── types.ts
│   │   │   │   ├── service.ts
│   │   │   │   ├── actions.ts
│   │   │   │   └── follow-up.ts
│   │   │   ├── leads/
│   │   │   │   ├── types.ts
│   │   │   │   ├── service.ts
│   │   │   │   ├── actions.ts
│   │   │   │   ├── commercial-signals.ts   ← Scoring y temperatura del lead
│   │   │   │   └── schemas.ts
│   │   │   ├── organizations/
│   │   │   │   ├── types.ts
│   │   │   │   ├── service.ts
│   │   │   │   ├── actions.ts
│   │   │   │   └── schemas.ts
│   │   │   ├── platform/
│   │   │   │   ├── actions.ts              ← quickOnboardOrgAction, etc.
│   │   │   │   ├── billing-actions.ts
│   │   │   │   ├── service.ts
│   │   │   │   └── types.ts
│   │   │   ├── properties/
│   │   │   │   ├── types.ts
│   │   │   │   ├── service.ts
│   │   │   │   ├── actions.ts
│   │   │   │   ├── matching.ts             ← Algoritmo lead ↔ propiedad
│   │   │   │   └── schemas.ts
│   │   │   ├── users/
│   │   │   │   ├── types.ts
│   │   │   │   ├── service.ts
│   │   │   │   ├── actions.ts
│   │   │   │   └── schemas.ts
│   │   │   ├── visits/
│   │   │   │   ├── types.ts
│   │   │   │   ├── service.ts
│   │   │   │   └── actions.ts
│   │   │   └── types.ts                    ← ActionResult (tipo global compartido)
│   │   ├── server/
│   │   │   ├── auth/
│   │   │   │   ├── session.ts              ← HMAC-SHA256, createSession(), getSessionUser()
│   │   │   │   ├── actions.ts              ← loginAction(), logoutAction()
│   │   │   │   ├── access.ts               ← Guards de acceso
│   │   │   │   └── password.ts             ← hashPassword(), verifyPassword()
│   │   │   ├── db/
│   │   │   │   ├── prisma.ts               ← PrismaClient singleton
│   │   │   │   └── prisma-worker.ts        ← Instancia separada para el worker
│   │   │   ├── whatsapp/
│   │   │   │   ├── channel-resolver.ts     ← Resuelve canal por phoneNumberId
│   │   │   │   └── meta.ts                 ← Configuración WhatsApp Meta
│   │   │   ├── billing/
│   │   │   │   └── mp-webhook-processor.ts ← Procesamiento pagos MP
│   │   │   ├── audit/
│   │   │   │   └── log.ts                  ← logAudit()
│   │   │   ├── workers/
│   │   │   │   ├── start.ts                ← Inicia worker + heartbeat
│   │   │   │   ├── conversation-worker.ts  ← Procesamiento mensajes WhatsApp
│   │   │   │   └── post-visit-worker.ts    ← Follow-up automático post-visita
│   │   │   ├── queues/
│   │   │   │   ├── index.ts                ← getAutomationQueue()
│   │   │   │   └── connection.ts           ← Conexión Redis
│   │   │   ├── security/
│   │   │   │   └── token-encryption.ts     ← encryptToken() / decryptToken()
│   │   │   └── config/
│   │   │       ├── runtime.ts              ← Validación de env vars al iniciar
│   │   │       └── whatsapp-channels.ts    ← Parsing configuración legacy
│   │   └── lib/
│   │       ├── ai/
│   │       │   ├── openai.ts               ← getOpenAIClient() singleton
│   │       │   └── agent-pipeline.ts       ← runAgentPipeline()
│   │       ├── tenant.ts
│   │       └── utils.ts                    ← formatDateTime(), cn()
│   ├── middleware.ts                        ← Auth middleware global
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
├── nixpacks.toml                            ← Config build/start Railway
├── railway.json                             ← Health check + restart policy
└── AUDITORIA_TECNICA.md                    ← Este documento
```

---

## 4. Base de Datos — Modelos Prisma

### Datasource
```prisma
provider = "postgresql"
url      = env("DATABASE_URL")
```

### Enums

| Enum | Valores |
|------|---------|
| `MembershipRole` | OWNER, ADMIN, AGENT, ASSISTANT |
| `LeadStatus` | NEW, CONTACTED, INTERESTED, VISIT, CLOSED |
| `PropertyStatus` | DRAFT, AVAILABLE, RESERVED, SOLD, RENTED |
| `VisitStatus` | PENDING, CONFIRMED, COMPLETED, CANCELED |
| `ConversationStatus` | OPEN, QUALIFIED, CLOSED |
| `MessageDirection` | INBOUND, OUTBOUND |
| `MessageDeliveryStatus` | RECEIVED, PENDING, SENT, FAILED, SKIPPED |
| `BillingStatus` | PENDING, PAID, CANCELLED |
| `InvoiceStatus` | PENDING, ISSUED, EXEMPT |
| `AiAgentStatus` | DRAFT, ACTIVE, PAUSED |
| `AiAgentTone` | FORMAL, FRIENDLY, NEUTRAL |
| `SubscriptionStatus` | TRIALING, ACTIVE, PAST_DUE, CANCELLED, EXPIRED |
| `WhatsAppChannelStatus` | ACTIVE, INACTIVE, DISCONNECTED, ERROR |
| `WhatsAppChannelVerificationStatus` | PENDING, VERIFIED, FAILED, REVOKED |
| `NotificationType` | VISIT_CREATED, OPERATOR_ACTION_REQUIRED, FOLLOW_UP_RESOLVED |
| `FollowUpCategory` | TECHNICAL, COMMERCIAL |

---

### Modelo: `User`
Entidad de identidad global. Un usuario puede pertenecer a múltiples organizaciones.
```
id            String   @id @default(cuid())
email         String   @unique
fullName      String
jobTitle      String?
phone         String?
whatsapp      String?
zone          String?
agentNotes    String?
isActive      Boolean  @default(true)
isPlatformAdmin Boolean @default(false)
passwordHash  String?  ← null hasta que el usuario activa su invite
createdAt     DateTime @default(now())
updatedAt     DateTime @updatedAt

Relaciones:
  memberships[]       ← Orgs a las que pertenece
  inviteTokens[]
  ownedLeads[]        ← Leads asignados como asesor
  availabilitySlots[]
  createdVisits[]
```

---

### Modelo: `Organization`
Cada tenant de la plataforma. Una organización = una inmobiliaria.
```
id                    String   @id @default(cuid())
name                  String
slug                  String   @unique  ← Identificador único, permanente
city                  String?
planLabel             String?
marketFocus           String?
description           String?
contactEmail          String?
contactPhone          String?
contactWhatsapp       String?
website               String?
businessHours         String?
propertySourceUrl     String?  ← URL de fuente de propiedades externa
propertySourceType    String?
propertySourceStatus  String?
propertySourceSyncedAt DateTime?
maxAiAgents           Int      @default(1)
agentQuotaNote        String?
isActive              Boolean  @default(true)
createdAt             DateTime @default(now())
updatedAt             DateTime @updatedAt

Relaciones:
  memberships[]
  leads[]
  properties[]
  conversations[]
  visits[]
  whatsappChannels[]
  billingRecords[]
  aiAgents[]
  subscription         ← Una suscripción activa (optional)
  automations[]
  notifications[]
  availability
```

---

### Modelo: `Membership`
Tabla pivote que vincula Users con Organizations y define el rol.
```
id             String         @id @default(cuid())
userId         String
organizationId String
role           MembershipRole
createdAt      DateTime       @default(now())

@@unique([userId, organizationId])
@@index([organizationId, role])
```

---

### Modelo: `InviteToken`
Token de invitación de un solo uso para onboarding.
```
id        String    @id @default(cuid())
token     String    @unique  ← hex de 32 bytes aleatorios
userId    String
usedAt    DateTime? ← null si no fue usado aún
expiresAt DateTime
createdAt DateTime  @default(now())

@@index([userId])
```
**Duración**: 7 días para primer acceso de titular, 72h para invitación de equipo.

---

### Modelo: `Lead`
Prospect del CRM. Creado manualmente o automáticamente desde WhatsApp.
```
id             String     @id @default(cuid())
organizationId String
ownerId        String?    ← Agente asignado
propertyId     String?    ← Propiedad de interés
fullName       String
email          String?
phone          String?
status         LeadStatus @default(NEW)
source         String?
notes          String?
interestLabel  String?    ← "Interesado en comprar"
budgetLabel    String?    ← "Hasta $200.000"
lastContactAt  DateTime?
createdAt      DateTime   @default(now())
updatedAt      DateTime   @updatedAt

@@unique([id, organizationId])    ← Aislamiento multi-tenant
@@index([organizationId, status])
@@index([organizationId, ownerId])
@@index([organizationId, propertyId])
```

---

### Modelo: `Property`
Inventario inmobiliario del tenant.
```
id                 String         @id @default(cuid())
organizationId     String
title              String
description        String?
operationType      String?        ← "Venta", "Alquiler"
address            String?
city               String?
neighborhood       String?
propertyType       String?        ← "Casa", "Departamento", "Oficina"
latitude           Decimal?       @db.Decimal(10, 7)
longitude          Decimal?       @db.Decimal(10, 7)
priceCents         Int?
currency           String         @default("USD")
expensesCents      Int?
status             PropertyStatus @default(DRAFT)
publicVisible      Boolean        @default(false)
rooms              Int?
bedrooms           Int?
bathrooms          Int?
surfaceM2          Decimal?
parkingSpots       Int?
amenities          String[]
externalLink       String?
videoUrl           String?
externalSourceUrl  String?
externalId         String?
createdAt          DateTime       @default(now())
updatedAt          DateTime       @updatedAt

@@unique([id, organizationId])
@@index([organizationId, status])
@@index([organizationId, publicVisible])

Relaciones:
  images[]
  interestedLeads[]   (Lead[])
  visits[]
  conversations[]
  availability[]
```

---

### Modelo: `PropertyImage`
Imágenes asociadas a una propiedad.
```
id             String   @id @default(cuid())
propertyId     String
organizationId String
url            String
altText        String?
sortOrder      Int      @default(0)
isPrimary      Boolean  @default(false)
```

---

### Modelo: `Conversation`
Hilo de chat. Generalmente uno por lead por canal (WhatsApp).
```
id                    String             @id @default(cuid())
organizationId        String
leadId                String?
propertyId            String?
channel               String             ← "whatsapp"
status                ConversationStatus @default(OPEN)
followUpActive        Boolean            @default(false)
followUpCategory      FollowUpCategory?
followUpReason        String?
followUpActiveAt      DateTime?
followUpResolvedAt    DateTime?
nextBestAction        String?
nextBestActionAt      DateTime?
participantName       String?
participantPhone      String?
propertyContextNote   String?
subject               String?
lastMessageAt         DateTime?
isHumanControlled     Boolean            @default(false)
createdAt             DateTime           @default(now())
updatedAt             DateTime           @updatedAt

@@unique([id, organizationId])
@@index([organizationId, channel])
@@index([organizationId, leadId])
@@index([organizationId, propertyId])
@@index([organizationId, status])
```

---

### Modelo: `Message`
Mensaje individual dentro de una conversación.
```
id                   String               @id @default(cuid())
organizationId       String
conversationId       String
externalId           String               @unique  ← ID WhatsApp (wamid.xxx), previene duplicados
direction            MessageDirection
deliveryStatus       MessageDeliveryStatus
body                 String
senderName           String?
senderPhone          String?
providerMessageId    String?
deliveryError        String?
deliveryAttemptedAt  DateTime?
deliveredAt          DateTime?
sentAt               DateTime             @default(now())
createdAt            DateTime             @default(now())

@@index([organizationId, conversationId, sentAt])
@@index([organizationId, direction, deliveryStatus])
```

---

### Modelo: `Visit`
Visita agendada a una propiedad.
```
id             String      @id @default(cuid())
organizationId String
propertyId     String
leadId         String?
createdById    String
status         VisitStatus @default(PENDING)
scheduledAt    DateTime
notes          String?
createdAt      DateTime    @default(now())
updatedAt      DateTime    @updatedAt

@@index([organizationId, status])
@@index([organizationId, scheduledAt])
@@index([organizationId, propertyId])
@@index([organizationId, leadId])
```

---

### Modelo: `AvailabilitySlot`
Horarios de disponibilidad por agente o propiedad.
```
id             String   @id @default(cuid())
organizationId String
propertyId     String?
userId         String?
label          String?
weekday        Int      ← 0=Domingo, 6=Sábado
startMinute    Int      ← Minutos desde las 00:00
endMinute      Int
timezone       String   @default("America/Buenos_Aires")
isActive       Boolean  @default(true)
createdAt      DateTime @default(now())
updatedAt      DateTime @updatedAt

@@index([organizationId, weekday, isActive])
```

---

### Modelo: `AiAgent`
Configuración del agente IA por tenant.
```
id                    String        @id @default(cuid())
organizationId        String
name                  String
description           String?
status                AiAgentStatus @default(DRAFT)
tone                  AiAgentTone   @default(NEUTRAL)
language              String        @default("es-AR")
persona               String?       ← Instrucciones de personalidad custom
is24x7                Boolean       @default(true)
whatsappChannelId     String?       @unique  ← Canal asignado
zoneFilters           String[]
propertyTypes         String[]
minBudget             Int?
maxBudget             Int?
escalateAfterMessages Int?          ← Escalar si N mensajes sin resolución
escalateOnKeywords    String[]      ← Palabras clave que fuerzan escalada
humanHandoffMessage   String?       ← Mensaje al escalar
createdAt             DateTime      @default(now())
updatedAt             DateTime      @updatedAt

@@index([organizationId, status])
```

---

### Modelo: `WhatsAppChannel`
Canal WABA (WhatsApp Business Account) por tenant.
```
id                            String                             @id @default(cuid())
organizationId                String
provider                      String                             ← "WHATSAPP_CLOUD"
status                        WhatsAppChannelStatus
verificationStatus            WhatsAppChannelVerificationStatus
phoneNumberId                 String                             @unique
wabaId                        String?
businessAccountId             String?
displayPhoneNumber            String?
verifiedDisplayName           String?
accessTokenEncrypted          String?  ← Token cifrado con AES-256
tokenLastValidatedAt          DateTime?
tokenExpiresAt                DateTime?
webhookSubscribed             Boolean  @default(false)
webhookSubscriptionCheckedAt  DateTime?
lastInboundAt                 DateTime?
lastDeliveryAt                DateTime?
lastErrorAt                   DateTime?
lastErrorCode                 String?
lastErrorMessage              String?
isPrimary                     Boolean  @default(false)
providerMetadata              Json?
createdAt                     DateTime @default(now())
updatedAt                     DateTime @updatedAt

@@index([organizationId, provider, status])
@@index([organizationId, isPrimary])
```

---

### Modelo: `OrgBillingRecord`
Registro de cobro generado desde el panel superadmin.
```
id             String        @id @default(cuid())
organizationId String
description    String
amountCents    Int
currency       String        @default("ARS")
status         BillingStatus @default(PENDING)
mpPreferenceId String?       ← ID de preference en Mercado Pago
mpPaymentUrl   String?       ← URL de checkout MP
mpPaymentId    String?       ← ID del pago confirmado
planId         String?       ← Referencia loose a Plan.id (sin FK)
invoiceStatus  InvoiceStatus @default(PENDING)
invoiceNumber  String?
notes          String?
createdAt      DateTime      @default(now())
updatedAt      DateTime      @updatedAt

@@index([organizationId, status])
@@index([organizationId, createdAt])
```

---

### Modelo: `Plan`
Catálogo de planes disponibles.
```
id              String   @id  ← "piloto" | "starter" | "growth"
name            String
description     String?
sortOrder       Int      @default(0)
isActive        Boolean  @default(true)

Límites (null = ilimitado):
  maxUsers                    Int?
  maxProperties               Int?
  maxAiAgents                 Int?
  maxWhatsAppChannels         Int?

Feature flags:
  canUseAiAgents              Boolean @default(false)
  canUseAutomations           Boolean @default(false)
  canUsePropertySync          Boolean @default(false)
  canExportData               Boolean @default(false)
  canUseMultipleWhatsAppChannels Boolean @default(false)
```

---

### Modelo: `Subscription`
Suscripción activa de un tenant. Una por organización.
```
id                   String             @id @default(cuid())
organizationId       String             @unique
planId               String
status               SubscriptionStatus @default(TRIALING)
currentPeriodStart   DateTime
currentPeriodEnd     DateTime
cancelAtPeriodEnd    Boolean            @default(false)
activatedByRecordId  String?            ← ID del OrgBillingRecord que activó
createdAt            DateTime           @default(now())
updatedAt            DateTime           @updatedAt

@@index([status])
@@index([currentPeriodEnd, status])
```

---

### Modelo: `AutomationRule`
Regla de automatización configurable por tenant.
```
id             String   @id @default(cuid())
organizationId String
name           String
trigger        String
config         Json
isActive       Boolean  @default(true)
createdAt      DateTime @default(now())
updatedAt      DateTime @updatedAt

@@index([organizationId, isActive])
```

---

### Modelo: `Notification`
Alertas internas del workspace.
```
id             String           @id @default(cuid())
organizationId String
type           NotificationType
title          String
body           String
metadata       Json?
link           String?
entityType     String?
entityId       String?
readAt         DateTime?
createdAt      DateTime         @default(now())

@@index([organizationId, createdAt])
@@index([organizationId, type])
```

---

### Modelo: `WorkerHeartbeat`
Singleton para monitoreo del worker BullMQ.
```
id         String   @id  ← Siempre = "singleton"
lastSeenAt DateTime     ← Actualizado cada 30 segundos
```
**Evaluación en dashboard**:
- `< 2 minutos` → ✅ Operativo
- `< 5 minutos` → ⚠️ Lento
- `≥ 5 minutos` → ❌ Caído

---

### Modelo: `GlobalSetting`
Configuración global de la plataforma (key-value).
```
key         String @id
value       String
description String?
updatedAt   DateTime @updatedAt

Claves conocidas:
  PLATFORM_WHATSAPP_NUMBER    ← Número de soporte
  BASE_PLAN_PRICE_ARS         ← Precio base plan (ARS)
  OPERATOR_NAME               ← Nombre del operador
  OPERATOR_LASTNAME           ← Apellido del operador
  OPERATOR_CUID               ← DNI/CUID del operador
  OPERATOR_COMPANY            ← Razón social
```

---

### Modelo: `AuditLog`
Log de auditoría de acciones críticas del sistema.
```
id          String   @id @default(cuid())
event       String   ← Ver tipos abajo
actorId     String?
actorEmail  String?
entityType  String?
entityId    String?
entityName  String?
metadata    Json?
createdAt   DateTime @default(now())

@@index([createdAt])
@@index([event])

Eventos registrados:
  billing.record_created    billing.paid       billing.cancelled
  billing.mp_link_generated billing.status_changed
  org.reactivated           org.suspended
  settings.updated
  admin.access_granted      admin.access_revoked
```

---

## 5. Arquitectura y Flujo de Datos

### Diagrama general

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER / CLIENTE                            │
│  Superadmin (/platform)        Tenant (/orgSlug)     Público        │
└────────────────┬────────────────────┬─────────────────┬────────────┘
                 │                    │                  │
                 ▼                    ▼                  ▼
┌────────────────────────────────────────────────────────────────────-┐
│                        NEXT.JS SERVER (Railway)                      │
│                                                                      │
│  middleware.ts ─── Validación de sesión en cada request              │
│                                                                      │
│  Server Components ── Renderizado server-side                        │
│  Server Actions ──── Mutaciones validadas con Zod                   │
│  API Routes ──────── Webhooks (WhatsApp, MercadoPago), /api/health   │
│                                                                      │
│  src/server/auth/ ── Guards, sesiones HMAC-SHA256                   │
│  src/modules/ ────── Lógica de negocio por dominio                  │
└──────────────────────────┬─────────────────────────────────────────-┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
┌─────────────────────┐   ┌──────────────────────────────────────-┐
│  PostgreSQL          │   │  Redis (BullMQ)                        │
│  (via Prisma)        │   │                                        │
│                      │   │  Queue: "automation-jobs"              │
│  Aislamiento por     │   │  Worker: conversation-worker.ts        │
│  organizationId en   │   │  Heartbeat: cada 30s                   │
│  CADA query          │   └───────────────┬──────────────────────-┘
└─────────────────────┘                   │
                                          ▼
                             ┌────────────────────────┐
                             │  OpenAI GPT-4o-mini     │
                             │  WhatsApp Cloud API     │
                             └────────────────────────┘
```

### Flujo de un request autenticado
```
1. Browser hace request a /{orgSlug}/leads
2. middleware.ts verifica cookie "proyecsaas_session"
   → Si inválida: redirect /login?next=/orgSlug/leads
3. Server Component carga
4. Llama requireOrganizationMembership(orgSlug)
   → Verifica membership + org activa
5. Server Component hace queries Prisma con organizationId
6. Renderiza HTML con datos del servidor
7. Browser recibe HTML ya renderizado
```

---

## 6. Sistema de Autenticación

### Cookie de sesión
| Propiedad | Valor |
|---|---|
| Nombre | `proyecsaas_session` |
| Algoritmo | HMAC-SHA256 (no JWT estándar) |
| Duración | 12 horas (43200 segundos) |
| httpOnly | true |
| sameSite | lax |
| secure | true (producción) |
| path | / |

### Estructura del token
```
Cookie = base64url({payload}).hex({signature})

Payload (JSON → base64url):
  { "userId": "cuid-del-usuario", "issuedAt": 1712345678000 }

Firma:
  HMAC-SHA256(payload, AUTH_SESSION_SECRET)
```

### Guards de acceso (`src/server/auth/access.ts`)

**`requireSessionUser(nextPath?)`**
- Lee cookie → decodifica payload → verifica firma HMAC y expiración
- Si inválida o expirada → `redirect("/login?next=" + nextPath)`
- Retorna: `{ id, email, fullName, isPlatformAdmin }`

**`requirePlatformAdmin()`**
- Llama `requireSessionUser()`
- Verifica `user.isPlatformAdmin === true`
- Si no → `notFound()` (HTTP 404)
- Retorna: el usuario actor (para audit logging)

**`requireOrganizationMembership(orgSlug)`**
```
1. requireSessionUser()
2. Buscar Organization por slug
3. Si org.isActive === false → redirect "/suspended?org=slug&name=name"
4. Buscar Membership (userId + organizationId)
5. Si no existe → notFound()
6. Retorna: { user, membership, organization }
```

**`assertMinimumRole(actual, minimum)`**
```
Jerarquía numérica:
  OWNER=4, ADMIN=3, AGENT=2, ASSISTANT=1

Si actual < minimum → notFound()
```

### Flujo completo de login
```
loginAction(formData):
  1. Rate limit: 10 intentos / 15 min por IP (Map en memoria)
  2. Validar con Zod: email (string().email()), password (string().min(1))
  3. Buscar User en DB: { email, isActive: true }
  4. Verificar password:
     a) Si user.passwordHash existe:
        → bcrypt.compare(inputPassword, user.passwordHash)
     b) Si user.passwordHash es null:
        → timingSafeEqual(HMAC(inputPassword), HMAC(AUTH_SHARED_PASSWORD))
     c) Si user no encontrado:
        → Ejecutar dummy bcrypt.compare() (previene timing attack)
  5. Si password inválida → error "credenciales inválidas"
  6. Verificar memberships activas:
     → Si isPlatformAdmin → redirect /platform
     → Si sin memberships → error "no-memberships"
  7. createSession(userId) → generar token + escribir cookie
  8. Redirect:
     → Si ?next= param (sanitizado) → redirect allí
     → Si tiene memberships → redirect /{primerOrgSlug}
     → Si solo admin → redirect /platform
```

### Flujo de logout
```
logoutAction():
  1. clearSession() → delete cookie "proyecsaas_session"
  2. redirect("/login?signedOut=1")
```

---

## 7. Módulos Principales

### `modules/leads/` — CRM de Prospects

**Propósito**: Gestionar el pipeline de leads desde la captación hasta el cierre.

**Servicios principales**:
- `listOrganizationLeads(orgSlug, q?)` — Búsqueda fulltext en name/phone/email, take 100
- `getLeadSummary(orgSlug)` — Conteos por status (NEW, CONTACTED, etc.)
- `getLeadDetail(orgSlug, leadId)` — Completo con conversations, visits, activity timeline

**Commercial Signals** (`commercial-signals.ts`):
- Analiza `notes`, `interestLabel`, `budgetLabel` del lead
- Calcula `leadTemperature`: "hot" / "warm" / "cold" / "unclear"
- Determina `propertyMatch` con el algoritmo de matching
- Genera `nextBestAction` y `automationSummary`

**Actions**:
- `createLeadAction(orgSlug, input)` — Crear lead con validación Zod
- `updateLeadAction(orgSlug, leadId, input)` — Actualizar datos
- `assignLeadAction(orgSlug, leadId, ownerId)` — Asignar a agente
- `updateLeadStatusAction(orgSlug, leadId, status)` — Cambiar status

---

### `modules/conversations/` — Chat WhatsApp

**Propósito**: Gestionar hilos de conversación WhatsApp por tenant.

**Servicios principales**:
- `listOrganizationConversations(orgSlug, cursor?)` — Paginación de 50 items por cursor ID
- `getConversationDetail(orgSlug, conversationId)` — Completo con todos los mensajes

**Follow-up** (`follow-up.ts`):
- Si 24h sin mensaje y `followUpActive=true` → marcar resolved
- Determina si requiere escalada humana

**Actions**:
- `takeConversationAction()` — Marcar `isHumanControlled=true`
- `releaseConversationAction()` — Volver a control automático
- `resolveConversationFollowUpAction()` — Marcar follow-up como resuelto
- `sendManualMessageAction(conversationId, text)` — Enviar mensaje como operador

---

### `modules/automations/` — Motor IA

**Propósito**: Orquestar respuestas automáticas de IA vía WhatsApp.

**Decision Service** (`decision-service.ts`):
```
Entrada: PreparedConversationContext {
  conversation, lead, property, propertyMatch,
  availability, recentMessages[]
}

System prompt incluye:
  - Nombre y personalidad del agente
  - Tono: FORMAL / FRIENDLY / NEUTRAL
  - Lista de propiedades disponibles (filtradas por zona/tipo/precio)
  - Instrucciones de marcadores de acción

Marcadores que parsea:
  [LEAD_INTERESTED]              → lead.status = INTERESTED
  [PROPOSE_VISIT: YYYY-MM-DD HH:MM | PROPERTY_ID:xxx]  → CREATE Visit
  [ESCALATE: motivo]             → isHumanControlled=true + Notification
  [LEAD_NAME: nombre completo]   → actualizar lead.fullName
```

**Delivery Service** (`delivery-service.ts`):
- Envía respuesta vía `POST graph.instagram.com/v20.0/{phoneNumberId}/messages`
- Si delivery falla → `deliveryStatus=FAILED` + retry por BullMQ
- Persiste cada mensaje con `direction=OUTBOUND`

---

### `modules/properties/` — Inventario Inmobiliario

**Servicios**:
- `listOrganizationProperties(orgSlug)` — Hasta 400 propiedades
- `getPropertySummary(orgSlug)` — Total, disponibles, precio promedio
- `getPropertyDetail(orgSlug, propertyId)` — Con imágenes, leads interesados, visitas

**Matching** (`matching.ts`):
Algoritmo que cruza preferencias del lead con propiedades:
- Inputs: zona, tipo de propiedad, presupuesto, señales de interés
- Output: `LeadPropertyMatchTrace { status, score, reasons[], consideredSignals[] }`

---

### `modules/users/` — Gestión de Equipo

**Actions**:
- `inviteUserAction(orgSlug, input)`:
  1. Requiere rol ADMIN o superior
  2. UPSERT User (email → fullName)
  3. UPSERT Membership (userId + orgId + role)
  4. CREATE InviteToken (token hex32, expiresAt +72h)
  5. Retorna `inviteUrl = {APP_URL}/invite/{token}`
- `updateMemberProfileAction()` — Actualizar datos operativos del agente

---

### `modules/platform/` — Superadmin

**Servicios**:
- `listOrganizationsForPlatform()` — Lista con métricas de salud, leads 7d, fallas WABA
- `getWorkerHeartbeatStatus()` — ok / stale / down según `lastSeenAt`

**Actions principales**:
```typescript
// Crea org + primer invite en UNA transacción
quickOnboardOrgAction({ orgName, ownerEmail })
  → auto-slug desde nombre (con deduplicación -2, -3...)
  → CREATE Organization
  → UPSERT User (fullName="Titular")
  → CREATE Membership (role=OWNER)
  → CREATE InviteToken (7 días)
  → Retorna inviteUrl

deactivateOrganizationAction(orgSlug)   → isActive=false + logAudit
reactivateOrganizationAction(orgSlug)   → isActive=true + logAudit
setOrgAgentQuotaAction(orgSlug, quota)  → maxAiAgents update
```

---

## 8. Flujos Críticos del Sistema

### Flujo 1: Alta de nueva inmobiliaria (Onboarding completo)

```
PASO 1 — Superadmin crea tenant
  → /platform/organizations → "Nueva Inmobiliaria"
  → Formulario: nombre org, email titular, WhatsApp (opcional)
  → quickOnboardOrgAction():
      - slugify(nombre) → "raices-pilar" (deduplicado si ya existe)
      - CREATE Organization { name, slug, isActive: true }
      - UPSERT User { email, fullName: "Titular" }
      - CREATE Membership { role: OWNER }
      - CREATE InviteToken { token: hex32, expiresAt: +7 días }
      - Retorna inviteUrl = https://app.com/invite/{token}

PASO 2 — Compartir acceso
  → UI muestra botón verde "Enviar por WhatsApp"
  → Abre: wa.me/{phone}?text=Hola! Tu link de acceso: {inviteUrl}
  → O copiar link para enviar por otro medio

PASO 3 — Titular activa su cuenta
  → Abre /invite/{token}
  → Validaciones: token existe, usedAt=null, expiresAt > now()
  → Muestra formulario con email pre-llenado
  → Titular ingresa contraseña

PASO 4 — acceptInviteAction()
  → hashPassword(password) → bcrypt hash
  → UPDATE User { passwordHash, isActive: true }
  → UPDATE InviteToken { usedAt: now() }
  → createSession(userId) → cookie httpOnly
  → redirect /{orgSlug}

RESULTADO: Tenant activo, titular con acceso OWNER, sesión de 12h
```

---

### Flujo 2: Login y gestión de sesión

```
loginAction(email, password):
  1. Rate limit: 10 intentos / 15 min por IP
  2. Validar Zod (email + password)
  3. Buscar User { email, isActive: true }
  4. Verificar password:
     - bcrypt.compare(input, user.passwordHash)
     - O timingSafeEqual con AUTH_SHARED_PASSWORD
     - Dummy bcrypt si user no encontrado (anti timing attack)
  5. Verificar memberships activas
  6. createSession(userId) → cookie 12h
  7. Redirect a /{primerOrgSlug} o /platform

logoutAction():
  → clearSession() → delete cookie
  → redirect /login?signedOut=1
```

---

### Flujo 3: Mensaje WhatsApp → Respuesta IA (flujo principal)

```
1. Lead manda mensaje al número WhatsApp de la agencia

2. Meta envía POST /api/webhooks/whatsapp
   ├─ Validar firma HMAC-SHA256(body, WHATSAPP_APP_SECRET)
   │  Header: x-hub-signature-256
   ├─ Parsear payload JSON
   ├─ Por cada message en entry[].changes[].value.messages[]:
   │   ├─ Resolver channel por phoneNumberId (DB → env legacy)
   │   ├─ Extraer organizationId
   │   └─ Enqueue job "whatsapp-inbound" en BullMQ
   └─ Retorna {ok: true} inmediatamente (200)

3. Worker BullMQ procesa job de forma asíncrona:
   a) Resolver WhatsAppChannel y Organization
   b) UPSERT Lead por phone number
   c) Buscar/crear Conversation (channel + participantPhone + orgId)
   d) Resolver AiAgent activo de la org
   e) Construir PreparedConversationContext:
      - Conversación con últimos N mensajes
      - Lead con sus preferencias y temperatura
      - Propiedades filtradas por zona/tipo/presupuesto del lead
      - Slots de disponibilidad del equipo
   f) Llamar OpenAI GPT-4o-mini:
      - System prompt: agente + tono + catálogo + instrucciones
      - User message: texto recibido
   g) Parsear marcadores en la respuesta:
      - [LEAD_INTERESTED] → UPDATE lead.status = INTERESTED
      - [PROPOSE_VISIT: 2026-04-15 14:00 | PROPERTY_ID:xxx]
        → CREATE Visit { scheduledAt, propertyId, leadId, status: PENDING }
      - [ESCALATE: motivo]
        → UPDATE conversation.isHumanControlled = true
        → CREATE Notification { type: OPERATOR_ACTION_REQUIRED }
      - [LEAD_NAME: Juan García]
        → UPDATE lead.fullName
   h) Enviar respuesta por WhatsApp Cloud API:
      POST graph.instagram.com/v20.0/{phoneNumberId}/messages
      { to: phone, type: "text", text: { body: response } }
   i) CREATE Message { direction: OUTBOUND, deliveryStatus: SENT }
   j) UPDATE Conversation { lastMessageAt, nextBestAction }

4. Si delivery falla:
   → Retry automático (3 intentos, backoff 5s→25s→125s)
   → Después de 3 fallos: message.deliveryStatus = FAILED
   → Job queda en BullMQ failed set
```

---

### Flujo 4: Cobro con Mercado Pago

```
1. Superadmin → /platform/billing → "Nuevo cobro"
   Input: organizationId, amountCents, description, planId (opt)
   
   createBillingRecordAction():
   → CREATE OrgBillingRecord { status: PENDING }
   → generateMPPaymentLinkAction():
       POST api.mercadopago.com/checkout/preferences
       { external_reference: recordId, items: [...], back_urls: {...} }
   → UPDATE OrgBillingRecord { mpPreferenceId, mpPaymentUrl }
   → logAudit(billing.record_created)

2. Superadmin comparte mpPaymentUrl con cliente

3. Cliente paga en MP Checkout Pro

4. MP envía POST /api/webhooks/mercadopago
   ├─ Validar firma x-signature:
   │   HMAC-SHA256("id:{id};request-id:{req};ts:{ts}", MP_WEBHOOK_SECRET)
   ├─ Filtrar: type="payment" + action="payment.created|updated"
   ├─ Fetch-back: GET api.mercadopago.com/v1/payments/{paymentId}
   │   Con Authorization: Bearer MERCADO_PAGO_ACCESS_TOKEN
   ├─ Verificar payment.status === "approved"
   ├─ Buscar OrgBillingRecord por payment.external_reference
   ├─ Idempotencia: si record.mpPaymentId === paymentId → skip
   └─ Transacción atómica:
       ├─ UPDATE OrgBillingRecord { status: PAID, mpPaymentId }
       ├─ UPSERT Subscription:
       │   - Si nueva: currentPeriodStart=now(), currentPeriodEnd=+30 días
       │   - Si renovación: currentPeriodStart=prevEnd, currentPeriodEnd=prevEnd+30 días
       │   - status: ACTIVE
       ├─ UPDATE Organization { isActive: true } (si estaba suspendida)
       └─ logAudit(billing.paid)

5. Retorna {ok: true} (200)
```

---

### Flujo 5: Multi-tenant — Aislamiento por organización

```
Cada request a /{orgSlug}/*:

1. middleware.ts:
   → Verificar cookie "proyecsaas_session" existe
   → Si no → redirect /login?next=/{orgSlug}/ruta

2. requireOrganizationMembership(orgSlug):
   → requireSessionUser() → extraer userId del token
   → Organization.findUnique({ slug: orgSlug })
     → Si no existe: notFound()
     → Si isActive=false: redirect /suspended
   → Membership.findUnique({ userId, organizationId })
     → Si no existe: notFound()
   → Retorna: { user, membership, organization }

3. TODAS las queries Prisma usan organizationId:
   prisma.lead.findMany({
     where: {
       organizationId: organization.id,  ← SIEMPRE presente
       ...otrosFilters
     }
   })

4. Constraints en DB garantizan unicidad:
   @@unique([id, organizationId])  en Lead, Property, Conversation
   → Un lead con id=X solo existe en una organización
   → Imposible acceder a datos de otro tenant aunque se adivine el ID
```

---

## 9. API Routes (Endpoints)

| Método | Ruta | Autenticación | Descripción |
|--------|------|---------------|-------------|
| `GET` | `/api/health` | Ninguna | `{ok, ts, env}` — health check Railway |
| `GET` | `/api/webhooks/whatsapp` | Verificación Meta | Responde `hub.challenge` para activar webhook |
| `POST` | `/api/webhooks/whatsapp` | HMAC-SHA256 | Recibe mensajes WhatsApp, encola job BullMQ |
| `POST` | `/api/webhooks/mercadopago` | HMAC-SHA256 | Recibe notificaciones de pago |
| `POST` | `/api/uploadthing` | Sesión | Subida de imágenes de propiedades |
| `POST` | `/api/properties/sync-from-source` | Sesión + ADMIN | Importar propiedades desde fuente externa |
| `POST` | `/api/whatsapp/simulate` | Ninguna | Testing: simular mensaje sin firma |
| `POST` | `/api/internal/automation-simulate` | Ninguna | Testing: simular job de automatización |

### Detalle: `POST /api/webhooks/whatsapp`
```typescript
// 1. Validar firma
const signature = req.headers.get("x-hub-signature-256");
const expectedSig = "sha256=" + HMAC-SHA256(body, WHATSAPP_APP_SECRET);
if (!timingSafeEqual(signature, expectedSig)) return 403;

// 2. Parsear payload
const payload = await req.json();
for (const entry of payload.entry) {
  for (const change of entry.changes) {
    for (const message of change.value.messages ?? []) {
      // 3. Resolver canal
      const channel = await resolveWhatsAppChannel(
        change.value.metadata.phone_number_id
      );
      // 4. Extraer routing code si existe: "[ref:orgslug] mensaje"
      // 5. Enqueue job
      await queue.add("whatsapp-inbound", {
        source: "whatsapp",
        organizationId: channel.organizationId,
        channel: { phoneNumberId, accessToken },
        contact: { name, phone },
        message: { externalId, from, timestamp, type, body }
      });
    }
  }
}
return { ok: true }; // 200 inmediato
```

### Detalle: `POST /api/webhooks/mercadopago`
```typescript
// 1. Validar firma x-signature: "ts=<unix_ts>,v1=<hex>"
// 2. Parsear payload: { type, action, data: { id } }
// 3. Filtrar: type === "payment" && action.includes("payment.")
// 4. Fetch-back a api.mercadopago.com/v1/payments/{id}
// 5. Verificar payment.status === "approved"
// 6. Procesar con mp-webhook-processor.ts
```

---

## 10. Worker y Jobs en Background

### Arquitectura del Worker
```
Next.js Server
     │
     │ (webhook request)
     ▼
BullMQ Queue "automation-jobs" (Redis)
     │
     │ (async)
     ▼
conversation-worker.ts (proceso Node.js separado)
     │
     ├── OpenAI API (decisión IA)
     ├── WhatsApp Cloud API (delivery)
     └── PostgreSQL via Prisma (persistencia)
```

### Configuración BullMQ
```typescript
const defaultJobOptions = {
  attempts: 3,                      // Reintentos ante fallo
  backoff: {
    type: "exponential",
    delay: 5000                     // 5s → 25s → 125s
  },
  removeOnComplete: 1000,           // Guardar últimos 1000 jobs completados
  removeOnFail: 500,                // Guardar últimos 500 jobs fallidos
};
```

### Tipos de jobs

**`whatsapp-inbound`**
```json
{
  "source": "whatsapp",
  "organizationId": "cuid",
  "channel": {
    "phoneNumberId": "11111111",
    "accessToken": "EAAxx..."
  },
  "contact": {
    "name": "Juan García",
    "phone": "5491123456789"
  },
  "message": {
    "externalId": "wamid.xxx",
    "from": "5491123456789",
    "timestamp": "1712345678",
    "type": "text",
    "body": "Hola, me interesa una propiedad"
  }
}
```

### Lógica `processWhatsAppInboundJob()`
```
1.  Resolver WhatsAppChannel por phoneNumberId
    → Si no hay canal → warning + skip (no procesar)
2.  Resolver Organization por organizationId
    → Si inactiva → skip
3.  UPSERT Lead { phone, organizationId }
    → Si nuevo → status=NEW, source="whatsapp"
4.  Buscar/crear Conversation { participantPhone, organizationId, channel }
5.  CREATE Message INBOUND { externalId, body, sentAt }
    → @unique(externalId) previene duplicados
6.  Resolver AiAgent { organizationId, status: ACTIVE }
    → Si no hay agente → isHumanControlled=true + skip IA
7.  Construir PreparedConversationContext
8.  Llamar decision-service → OpenAI
9.  Ejecutar acciones según marcadores
10. delivery-service → POST WhatsApp API
11. CREATE Message OUTBOUND
12. UPDATE Conversation.lastMessageAt
13. Retornar AutomationWorkerStatus
```

### Worker Heartbeat
```typescript
// Cada 30 segundos
async function writeHeartbeat() {
  await prisma.workerHeartbeat.upsert({
    where: { id: "singleton" },
    update: { lastSeenAt: new Date() },
    create: { id: "singleton", lastSeenAt: new Date() },
  });
}
setInterval(writeHeartbeat, 30_000);
```

### Post-Visit Worker (`post-visit-worker.ts`)
- **Trigger**: Cron diario (o al iniciar el worker)
- **Lógica**: Busca visitas `status=COMPLETED` con más de 24h de antigüedad
- **Acción**: Envía follow-up automático por WhatsApp al lead, activa `followUpActive=true` en la conversación, crea Notification para el equipo

---

## 11. Integraciones Externas

### WhatsApp Cloud API (Meta)

**Autenticación inbound** (validar webhook):
```
Header: x-hub-signature-256: sha256={hex}
Cálculo: HMAC-SHA256(rawBody, WHATSAPP_APP_SECRET)
Comparación: timingSafeEqual() para prevenir timing attacks
```

**Channel Resolver** (`src/server/whatsapp/channel-resolver.ts`):
```
Prioridad de resolución:
1. DB: WhatsAppChannel.findUnique({ phoneNumberId })
   → Validar: org activa, canal activo, decryptToken(accessTokenEncrypted)
   → Retorna: { organizationId, accessToken, phoneNumberId, ... }

2. Env vars legacy (canal único):
   WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_ACCESS_TOKEN + WHATSAPP_ORGANIZATION_ID

3. Sin resultado → null → mensaje ignorado (warning en log)
```

**Routing multi-organización**:
```
Si mensaje body comienza con "[ref:orgslug]":
  → Extrae orgSlug → resuelve Organization
  → Permite usar un número WhatsApp para múltiples tenants
```

**Envío de mensajes** (outbound):
```
POST https://graph.instagram.com/v20.0/{phoneNumberId}/messages
Authorization: Bearer {accessToken}
Body: {
  messaging_product: "whatsapp",
  to: "+5491123456789",
  type: "text",
  text: { body: "Respuesta del agente..." }
}
Respuesta exitosa: { messages: [{ id: "wamid.xxx" }] }
```

**Token encryption** (`src/server/security/token-encryption.ts`):
- Access tokens de WhatsApp se guardan cifrados con AES-256 en DB
- Clave: `WHATSAPP_TOKEN_ENCRYPTION_KEY`
- Funciones: `encryptToken(plaintext)` / `decryptToken(ciphertext)`

---

### OpenAI GPT-4o-mini

**Cliente** (`src/lib/ai/openai.ts`):
```typescript
const client = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL, // Replit AI proxy
});
```

**Sistema de marcadores** en el prompt:
```
El agente IA debe incluir en su respuesta:

[LEAD_INTERESTED]
  → Cuando el lead muestra interés real en comprar/alquilar

[PROPOSE_VISIT: YYYY-MM-DD HH:MM | PROPERTY_ID:cuid]
  → Para proponer visita a una propiedad específica en fecha/hora concretas

[ESCALATE: motivo]
  → Cuando el caso requiere intervención humana

[LEAD_NAME: Nombre Completo]
  → Cuando el lead menciona su nombre
```

---

### Mercado Pago

**Validación de webhook** (`x-signature` header):
```
Header format: "ts=1712345678,v1=abcdef123..."
Message:       "id:{notifId};request-id:{reqId};ts:{ts}"
Verification:  HMAC-SHA256(message, MERCADO_PAGO_WEBHOOK_SECRET)
```

**Fetch-back verification** (no confiar solo en webhook):
```
GET https://api.mercadopago.com/v1/payments/{paymentId}
Authorization: Bearer MERCADO_PAGO_ACCESS_TOKEN

Verificar: payment.status === "approved"
Verificar: payment.external_reference === OrgBillingRecord.id
```

**Cálculo de período de suscripción**:
```typescript
function computeNewPeriod(existingSubscription?) {
  if (!existingSubscription || existingSubscription.status !== "ACTIVE") {
    // Nueva suscripción
    return { start: now(), end: addDays(now(), 30) };
  }
  // Renovación
  return {
    start: existingSubscription.currentPeriodEnd,
    end: addDays(existingSubscription.currentPeriodEnd, 30)
  };
}
```

---

## 12. Sistema Multi-Tenant

### Capas de aislamiento

**Capa 1 — Middleware** (`middleware.ts`)
```typescript
// Rutas públicas sin verificación:
const PUBLIC_PATHS = ["/", "/login", "/suspended", "/map", "/api/webhooks/*", "/:orgSlug/catalog"];

// Todo lo demás requiere cookie válida
if (!session) return redirect("/login?next=" + path);
```

**Capa 2 — Guard de acceso** (`requireOrganizationMembership`)
```typescript
// Verifica que el usuario autenticado tiene membership en ESTA org
const membership = await prisma.membership.findUnique({
  where: {
    userId_organizationId: {
      userId: sessionUser.id,
      organizationId: organization.id,
    }
  }
});
if (!membership) notFound(); // 404 si no pertenece a esa org
```

**Capa 3 — Queries Prisma**
```typescript
// TODAS las consultas incluyen organizationId
// Ejemplo en leads/service.ts:
const leads = await prisma.lead.findMany({
  where: {
    organizationId: org.id,  // ← OBLIGATORIO en cada query
    ...(q ? { OR: [{ fullName: { contains: q } }, { phone: { contains: q } }] } : {})
  }
});
```

**Capa 4 — Constraints de base de datos**
```prisma
// En Lead, Property, Conversation:
@@unique([id, organizationId])

// Garantía: un registro con id=X solo existe en una organización.
// Imposible acceder a datos de otro tenant aunque se conozca el ID.
```

### Suspensión de orgs
Cuando `Organization.isActive = false`:
- `requireOrganizationMembership()` redirige a `/suspended`
- El worker ignora mensajes entrantes de esa org
- Los webhooks de MP reactivan `isActive = true` al recibir un pago confirmado

---

## 13. Seguridad

### Validación de inputs
- **Zod schemas** en todos los server actions
- `fieldErrors` retornados en `ActionResult` para feedback por campo
- Inputs sanitizados: `trim()`, `toLowerCase()` en emails

### Timing-safe comparisons
```typescript
// Previenen timing attacks en verificaciones críticas
crypto.timingSafeEqual(
  Buffer.from(inputHash),
  Buffer.from(storedHash)
);

// Aplicado en:
// - Verificación de sesión (HMAC)
// - Verificación de password compartida
// - Validación de firmas webhook (WhatsApp, MP)
```

### Rate limiting (login)
```typescript
// Map en memoria: Map<IP, { count, resetAt }>
// Límite: 10 intentos / 15 minutos por IP
// Pruning automático de entries expiradas en cada request
// ⚠️ Se resetea si el proceso Node.js reinicia
```

### Protección SQL Injection
- Prisma ORM parametriza automáticamente todas las queries
- No se concatena SQL en ningún lugar del código

### Protección XSS
- React 19 escapa por defecto todo contenido renderizado
- No se usa `dangerouslySetInnerHTML` en el código de la aplicación

### Cifrado de tokens WhatsApp
```typescript
// Access tokens no se guardan en plaintext en DB
// Cifrado: AES-256 con WHATSAPP_TOKEN_ENCRYPTION_KEY
const encrypted = encryptToken(accessToken);    // Al guardar
const plain = decryptToken(encrypted);           // Al usar
```

### Cookies de sesión
- `httpOnly=true` → JavaScript del browser no puede leerla
- `sameSite=lax` → Protección básica contra CSRF
- `secure=true` en producción → Solo por HTTPS

---

## 14. Puntos Críticos y Riesgos

| # | Componente | Riesgo | Severidad | Solución recomendada |
|---|---|---|---|---|
| 1 | `AUTH_SESSION_SECRET` | Si rota, todas las sesiones activas se invalidan simultáneamente | Alta | Coordinar rotation con deploy, notificar usuarios de re-login |
| 2 | `WHATSAPP_TOKEN_ENCRYPTION_KEY` | Si se pierde, los access tokens cifrados en DB son irrecuperables | Alta | Backup seguro de la key, nunca cambiarla sin migrar los tokens |
| 3 | Webhook secrets no seteados | Si `WHATSAPP_APP_SECRET` o `MERCADO_PAGO_WEBHOOK_SECRET` están vacíos, el sistema loguea warning pero **procesa igual** | Alta | CRÍTICO: siempre configurar en producción |
| 4 | Rate limiting en memoria | Si el proceso Node.js reinicia (Railway restart), los contadores se resetean → ventana de brute force | Media | Implementar rate limiting respaldado en Redis |
| 5 | BullMQ jobs sin DLQ | Después de 3 intentos fallidos, el job queda en `failed` set sin retry automático ni alerta | Media | Monitorear BullMQ UI o implementar alertas en el evento `failed` |
| 6 | Worker proceso único | Un solo proceso BullMQ procesa todos los mensajes de todos los tenants en serie. Con muchos tenants concurrentes puede generar latencia | Media | Escalar workers horizontalmente o por tenant |
| 7 | Property limit hardcoded | `listOrganizationProperties()` tiene `take: 400`. Orgs con más propiedades no las verán todas | Media | Implementar paginación o cursor-based pagination |
| 8 | AI Prompt injection | Un lead podría enviar instrucciones al sistema prompt del agente | Media | Agregar guardrails explícitos en el system prompt |
| 9 | `external_reference` MP duplicado | Si se crea dos veces el billing record para la misma org/plan, el segundo pago se ignorará | Baja | Verificar unicidad antes de crear la preference |
| 10 | Subscription period boundary | Pago recibido exactamente en el límite del período puede generar período incorrecto | Baja | Test unitario del `computeNewPeriod()` con casos borde |

---

## 15. Variables de Entorno

### Requeridas (Web + Worker)

```bash
# Base de datos
DATABASE_URL=postgresql://user:pass@host:5432/dbname
DIRECT_URL=postgresql://user:pass@host:5432/dbname  # Conexión directa (sin pool)

# Redis (BullMQ)
REDIS_URL=redis://user:pass@host:6379
```

### Requeridas (Web)

```bash
# App
NEXT_PUBLIC_APP_URL=https://tudominio.com

# Autenticación
AUTH_SESSION_SECRET=<mínimo 32 caracteres aleatorios>
AUTH_SHARED_PASSWORD=<contraseña fallback para usuarios sin hash>

# WhatsApp
WHATSAPP_APP_SECRET=<Meta App Secret — para validar firmas de webhooks>
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<token para verificación inicial del webhook>
WHATSAPP_TOKEN_ENCRYPTION_KEY=<clave AES para cifrar access tokens en DB>

# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=<token API producción>
MERCADO_PAGO_WEBHOOK_SECRET=<secret para validar firmas de webhooks>
```

### Opcionales

```bash
# IA (si no se configura, el agente IA no funciona)
AI_INTEGRATIONS_OPENAI_API_KEY=<api key>
AI_INTEGRATIONS_OPENAI_BASE_URL=<base url, para usar Replit AI proxy>

# UploadThing (subida de imágenes)
UPLOADTHING_TOKEN=<token>
NEXT_PUBLIC_UPLOADTHING_APP_ID=<app id>

# Canal WhatsApp legacy (un solo canal vía env, sin DB)
WHATSAPP_PHONE_NUMBER_ID=<id del número>
WHATSAPP_ACCESS_TOKEN=<access token>
WHATSAPP_ORGANIZATION_ID=<cuid de la org en DB>
```

---

## 16. Logging y Monitoreo

### Formato de logs
Logs estructurados en JSON con campos:
- `scope`: módulo que genera el log (`"worker"`, `"mp-webhook"`, `"automation-webhook"`)
- `event`: tipo de evento (`"job-completed"`, `"signature-rejected"`, etc.)
- `message`: descripción legible
- `metadata`: datos adicionales del contexto

### Logs por componente

**Worker**:
```
"ready"           → Worker conectado a Redis y listo
"job-active"      → Comenzando a procesar job {jobId}
"job-completed"   → Job procesado exitosamente
"job-failed"      → Job falló (con stack trace), reintentando
"heartbeat-failed" → Error al escribir heartbeat en DB
```

**Webhook WhatsApp**:
```
"signature-validation-skipped" → WHATSAPP_APP_SECRET no configurado
"signature-rejected"           → Firma HMAC no coincide → 403
"enqueued"                     → Job agregado a BullMQ exitosamente
"enqueue-failed"               → Error al encolar (Redis caído, etc.)
"db-hit"                       → Canal resuelto desde DB
"db-miss-legacy-fallback"      → Canal resuelto desde env vars
"db-unresolved"                → No se encontró canal, mensaje ignorado
```

**Webhook MercadoPago**:
```
"signature-rejected"          → Firma inválida → 400
"payment-not-approved"        → Fetch-back: status !== "approved" → skip
"billing-record-not-found"    → external_reference no matchea ningún record
"already-processed"           → mpPaymentId ya existe → skip (idempotencia)
"processed"                   → Pago procesado, suscripción actualizada
```

### Audit Log del sistema

Eventos registrados automáticamente en la tabla `AuditLog`:
```
billing.record_created     billing.paid           billing.cancelled
billing.mp_link_generated  billing.status_changed
org.reactivated            org.suspended
settings.updated
admin.access_granted       admin.access_revoked
```

Accesibles en: `/platform/health` → sección "Auditoría del Sistema" (últimos 30 eventos).

---

## 17. Deployment e Infraestructura

### Railway

**Archivos de configuración**:
```toml
# nixpacks.toml (build)
[phases.build]
cmds = [
  "pnpm --filter @workspace/proyecsaas exec prisma generate",
  "pnpm --filter @workspace/proyecsaas run build"
]

[start]
cmd = "pnpm --filter @workspace/proyecsaas exec prisma migrate resolve --rolled-back '0_init' || true && pnpm --filter @workspace/proyecsaas exec prisma db push --accept-data-loss && HOSTNAME=0.0.0.0 pnpm --filter @workspace/proyecsaas exec next start"
```

```json
// railway.json
{
  "deploy": {
    "startCommand": "...",
    "restartPolicyType": "ON_FAILURE",
    "healthcheckPath": "/api/health"
  }
}
```

### Scripts de desarrollo

```bash
pnpm dev              # Next.js en modo desarrollo (hot reload)
pnpm worker:dev       # Worker BullMQ con tsx (hot reload)
pnpm build            # Build de producción
pnpm start            # Iniciar servidor de producción
pnpm db:push          # Sincronizar schema sin migraciones
pnpm db:studio        # Abrir Prisma Studio (explorador DB)
```

### Monorepo

El proyecto es un **pnpm workspace monorepo**. El workspace principal está en `artifacts/proyecsaas/`. Los comandos deben ejecutarse con:
```bash
pnpm --filter @workspace/proyecsaas <comando>
```

### Endpoints de testing (solo dev)

```
POST /api/whatsapp/simulate
  Body: { phoneNumberId, accessToken, message, contactPhone }
  Simula mensaje entrante sin validación de firma

POST /api/internal/automation-simulate
  Body: { conversationId, leadId, messageText }
  Simula procesamiento completo de un job
```

---

*Documento generado en Abril 2026. Para actualizar, ejecutar nueva auditoría técnica sobre la rama de trabajo activa.*
