# ProyecSaaS

Initial professional foundation for a multi-tenant real-estate SaaS focused on CRM, property management, public property visibility, visit scheduling, and commercial automations.

## Recommended structure

The project is organized around three layers:

1. `src/app`
   Next.js App Router entrypoints and route groups. It keeps page-level concerns separate from business domains.
2. `src/modules`
   Domain modules such as `leads`, `properties`, `visits`, and `automations`. This is where feature logic can grow without coupling everything to route files.
3. `src/server`, `src/lib`, and `src/config`
   Shared infrastructure, utilities, and application configuration. This avoids duplicating database, queue, tenant, and environment logic across modules.

This structure is recommended because it stays small for MVP work, but scales well when each module needs services, repositories, validators, jobs, and UI components later.

## Why this architecture

### 1. Multi-tenant ready without overengineering

- Tenant-aware routes use `/:orgSlug/...` for internal workspaces.
- Database models include `organizationId` on tenant-owned records.
- `User` is global, while `Membership` links users to organizations and roles.
- Public routes like `/map` stay outside the tenant workspace.

This gives a clean base for organization scoping now, while leaving room for stricter authorization and tenant middleware later.

### 2. Modular domain growth

Each initial module has its own folder under `src/modules`:

- `auth`
- `organizations`
- `users`
- `leads`
- `properties`
- `conversations`
- `visits`
- `automations`

For now, these are lightweight placeholders. As the product grows, each module can add:

- `services`
- `repositories`
- `schemas`
- `jobs`
- `components`

### 3. Infrastructure separated from features

- Prisma client lives in `src/server/db`
- Redis client lives in `src/server/cache`
- BullMQ queues live in `src/server/queues`
- Tenant helpers live in `src/lib`
- Module metadata is sourced from `src/modules` and aggregated in `src/config/modules.ts`

This keeps external services centralized and easier to replace, test, or extend.

## Folder structure

```text
proyecsaas/
|-- prisma/
|   `-- schema.prisma
|-- src/
|   |-- app/
|   |   |-- [orgSlug]/
|   |   |   |-- automations/page.tsx
|   |   |   |-- conversations/page.tsx
|   |   |   |-- leads/page.tsx
|   |   |   |-- properties/page.tsx
|   |   |   |-- visits/page.tsx
|   |   |   |-- settings/
|   |   |   |   |-- organization/page.tsx
|   |   |   |   `-- users/page.tsx
|   |   |   |-- layout.tsx
|   |   |   `-- page.tsx
|   |   |-- login/page.tsx
|   |   |-- map/page.tsx
|   |   |-- globals.css
|   |   |-- layout.tsx
|   |   `-- page.tsx
|   |-- components/
|   |   |-- ui/
|   |   `-- workspace/
|   |-- config/
|   |   `-- modules.ts
|   |-- lib/
|   |   |-- tenant.ts
|   |   `-- utils.ts
|   |-- modules/
|   |   |-- auth/
|   |   |-- organizations/
|   |   |-- users/
|   |   |-- leads/
|   |   |-- properties/
|   |   |-- conversations/
|   |   |-- visits/
|   |   |-- automations/
|   |   `-- types.ts
|   `-- server/
|       |-- auth/
|       |-- cache/
|       |-- db/
|       `-- queues/
|-- .env.example
|-- next.config.ts
|-- package.json
|-- postcss.config.js
|-- tailwind.config.ts
`-- tsconfig.json
```

## Stack

- Next.js with App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma
- Redis
- BullMQ

## Database foundation

The initial Prisma schema includes:

- `User`
- `Organization`
- `Membership`
- `Lead`
- `Property`
- `Conversation`
- `Visit`
- `AutomationRule`

Key MVP choices:

- Use one database with shared tables and tenant scoping by `organizationId`
- Keep membership roles simple: `OWNER`, `ADMIN`, `AGENT`, `ASSISTANT`
- Store automation configuration as JSON for flexibility in early iterations
- Keep conversation modeling minimal until channel integrations exist
- Use composite tenant-aware relations where a child record references another tenant-owned record

## Getting started

1. Install dependencies

```bash
npm install
```

2. Create local environment variables

```powershell
Copy-Item .env.example .env
```

3. Generate Prisma client

```bash
npm run prisma:generate
```

4. Run migrations once PostgreSQL is ready

```bash
npm run prisma:migrate
```

5. Start the app

```bash
npm run dev
```

## What is intentionally not implemented yet

- Full authentication flow
- Full CRUD for modules
- External integrations
- Automation builder UI
- Background workers and processors
- Advanced permissions
- Public search and map filters

That keeps the foundation focused on a clean MVP starting point.

## Suggested next steps

1. Add authentication and session management.
2. Implement tenant resolution and authorization guards.
3. Build CRUD flows for organizations, users, leads, and properties.
4. Add visit scheduling forms and calendar availability rules.
5. Add job processors for simple automations like reminders or lead follow-up tasks.
6. Add audit logging and activity timelines per tenant.
