# Production deployment guide

This project is prepared to run as two separate services:

- Web app: Next.js app that serves the CRM, public routes, and the WhatsApp webhook.
- Worker: long-running BullMQ worker that consumes queued automation jobs.

## Required managed services

- PostgreSQL
- Redis

Use managed production instances for both. Do not rely on local defaults in production.

## Service responsibilities

### Web app

- serves the Next.js application
- receives WhatsApp webhook requests
- verifies webhook signatures and verify token
- enqueues automation jobs into Redis/BullMQ
- must stay fast and enqueue-only for webhook requests

### Worker

- runs `src/server/workers/start.ts`
- consumes `automation-jobs`
- performs conversation processing, AI decisioning, delivery attempts, follow-up state updates, and visit creation logic
- should run as a separate long-lived process from the web app

Initial production should use a single worker instance.

## Required environment variables

Both web and worker services:

- `DATABASE_URL`
- `DIRECT_URL`
- `REDIS_URL`
- `NEXT_PUBLIC_APP_URL`

Web app only:

- `WHATSAPP_APP_SECRET`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`

Web app and worker when runtime WhatsApp delivery is enabled:

- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ORGANIZATION_ID`
- `WHATSAPP_ACCESS_TOKEN`

Worker only when AI decisioning should be enabled:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional override)
- `OPENAI_BASE_URL` (optional compatible endpoint)

Dev-only and normally disabled in production:

- `INTERNAL_AUTOMATION_SIMULATION_TOKEN`

## Build and start commands

Web app:

```bash
npm run build:web
npm run start:web
```

Worker:

```bash
npm run worker:start
```

In this production-preparation phase, the worker runs directly from TypeScript via `tsx`.
That means the deployment image/runtime must include `tsx` at runtime. There is no separate
worker build artifact yet in this phase.

## Migration command

Run migrations explicitly before the new web/worker release accepts traffic:

```bash
npm run prisma:migrate:deploy
```

## Container artifacts

This repository now includes two minimal deployment artifacts:

- `Dockerfile.web`
- `Dockerfile.worker`

Example image builds:

```bash
docker build -f Dockerfile.web -t proyecsaas-web .
docker build -f Dockerfile.worker -t proyecsaas-worker .
```

Example container starts:

```bash
docker run --env-file .env -p 3000:3000 proyecsaas-web
docker run --env-file .env proyecsaas-worker
```

The web container starts Next.js bound to `0.0.0.0`, so it can receive traffic inside a container runtime.

## Migration order

1. Deploy schema-compatible code to both web and worker artifacts.
2. Run Prisma client generation during build.
3. Apply database migrations before routing real production traffic to new code paths.
4. Start or restart the worker after migrations are applied.
5. Start or restart the web app after migrations are applied.

## Recommended deploy order

1. Provision or confirm PostgreSQL and Redis.
2. Build the web image or web runtime artifact.
3. Build the worker image or worker runtime artifact.
4. Apply Prisma migrations with `npm run prisma:migrate:deploy`.
5. Deploy the worker.
6. Deploy the web app.
7. Confirm webhook verification and queue connectivity.

## Rollback cautions

- Coordinate rollbacks across both web and worker if a release changes Prisma schema usage.
- Do not roll back code to a version that cannot read the currently deployed schema.
- If delivery or queue issues occur, verify `REDIS_URL`, WhatsApp credentials, and worker health before reprocessing messages manually.

## Operational notes

- The webhook returns quickly and should not perform business processing inline.
- The worker is the only long-running automation processor and must remain up for end-to-end automation to function.
- Missing `REDIS_URL` now fails in production instead of silently falling back to localhost.
