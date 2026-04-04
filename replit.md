# RaicesPilot — ProyecSaaS

## Overview

pnpm workspace monorepo for a multi-tenant real estate SaaS platform. Features:
- **ProyecSaaS** (`artifacts/proyecsaas`) — Next.js 15 front-end panel for real estate agencies
- **API Server** (`artifacts/api-server`) — Express 5 API (WhatsApp webhook receiver, BullMQ job dispatcher)
- **Mockup Sandbox** (`artifacts/mockup-sandbox`) — Vite dev server for isolated component previews on the canvas

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: Next.js 15 App Router, Tailwind CSS, Lucide React
- **Database ORM**: Prisma (PostgreSQL)
- **Auth**: Custom scrypt-based password auth with session cookies (`iron-session`)
- **Background jobs**: BullMQ (requires Redis / Upstash in production)
- **AI**: OpenAI GPT-4.1-mini via `openai` SDK
- **WhatsApp**: WhatsApp Cloud API webhooks

## Artifact: proyecsaas

Located at `artifacts/proyecsaas`. Runs on `PORT` env var (default 25195).

### Key directories
```
src/app/
  login/          — auth pages
  platform/       — superadmin platform panel
  [orgSlug]/      — tenant namespace (split into route groups)
    (workspace)/        — auth-protected workspace routes
      layout.tsx          — WorkspaceShell + requireOrganizationMembership
      page.tsx            — dashboard (KPI cards)
      leads/              — lead management
      properties/         — property inventory (includes "Ver catálogo público" button)
      visits/             — visit calendar
      conversations/      — WhatsApp conversations
      automations/        — AI agent status + metrics dashboard
      agents/             — AI agent config + test chat UI
      settings/
        organization/     — org profile + property source (with "Sincronizar ahora" button)
        users/            — team management
        availability/     — WhatsApp agent scheduling slots
        integrations/     — WhatsApp channel config
    catalog/            — PUBLIC catalog (no auth required, shares [orgSlug] param)

src/modules/
  organizations/  — service + types for multi-tenancy
  leads/          — lead CRUD + actions
  conversations/  — conversation management
  visits/         — visit scheduling
  availability/   — AvailabilitySlot CRUD + actions

src/components/workspace/
  workspace-shell.tsx   — sidebar + header layout wrapper
  workspace-sidebar.tsx — nav links
  section-card.tsx      — content card with eyebrow/title/description
  status-badge.tsx      — colored badge (neutral/success/warning/info)

src/server/
  auth/           — login/logout actions, password hashing (scrypt)
  db/             — Prisma client singleton
```

### Auth
- Users without `passwordHash` use the `AUTH_SHARED_PASSWORD` secret
- Platform admins redirect to `/platform`
- Session secret: `AUTH_SESSION_SECRET`
- Timing-safe password comparison — buffer length must match (fixed bug)

### Key Commands
- `pnpm --filter @workspace/proyecsaas run dev` — start dev server
- `pnpm --filter @workspace/proyecsaas exec prisma db push` — push schema changes
- `pnpm --filter @workspace/proyecsaas exec prisma studio` — DB GUI

## Prisma Models (key)

- `Organization` — tenant with `slug`, WhatsApp channels, members, billing
- `User` + `Membership` — users belong to orgs via membership (roles: OWNER, ADMIN, AGENT)
- `Lead` — prospective buyer/renter (status: NEW → CONTACTED → INTERESTED → VISIT → CLOSED)
- `Property` — real estate listing
- `Conversation` — WhatsApp conversation thread; `followUpActive`, `isHumanControlled`, `nextBestAction`
- `Message` — individual WhatsApp messages (INBOUND/OUTBOUND, delivery statuses)
- `Visit` — scheduled property visits
- `AvailabilitySlot` — weekly recurring time slots for AI agent scheduling (`weekday`, `startMinute`, `endMinute`)
- `WhatsAppChannel` — connected WhatsApp Business numbers (status: ACTIVE/INACTIVE/SUSPENDED)

## Optional Secrets (needed for full AI/WhatsApp functionality)

- `OPENAI_API_KEY` — GPT-4.1-mini for conversation AI
- `REDIS_URL` — BullMQ queue backend (Upstash recommended)
- `WHATSAPP_*` — WhatsApp Cloud API credentials
- `UPLOADTHING_TOKEN` — file uploads
- `MERCADO_PAGO_*` — payment integration

## Business Context

- Owner sells face-to-face — no self-service onboarding
- Superadmin manually onboards agencies through `/platform`
- AI agent handles WhatsApp lead intake → property matching → visit proposal → human handoff
