# Production deployment guide

This project is prepared to run as two separate services:

- Web app: Next.js app that serves the CRM, public routes, and the WhatsApp webhook.
- Worker: long-running BullMQ worker that consumes queued automation jobs.

## Pre-deploy checklist

Before the first production rollout, confirm all of the following:

- PostgreSQL is provisioned and reachable from both web and worker runtimes
- Redis is provisioned and reachable from both web and worker runtimes
- all required production environment variables are injected at runtime
- `npm run validate:runtime:web` passes in the web runtime environment
- `npm run validate:runtime:worker` passes in the worker runtime environment
- the target release has already built successfully
- database backup / snapshot policy is confirmed before applying migrations
- WhatsApp webhook verify token and app secret are configured in the target environment

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

- `AUTH_SESSION_SECRET`
- `AUTH_SHARED_PASSWORD`
- `WHATSAPP_APP_SECRET`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`

Legacy tenant-bound WhatsApp fallback, only when env-backed channel resolution is still needed:

- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ORGANIZATION_ID`
- `WHATSAPP_ACCESS_TOKEN`

Worker only when AI decisioning should be enabled:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional override)
- `OPENAI_BASE_URL` (optional compatible endpoint)

Dev-only and normally disabled in production:

- `INTERNAL_AUTOMATION_SIMULATION_TOKEN`

In production, the web and worker startup paths now validate their required runtime variables
and fail fast if they are missing.
Tenant-bound WhatsApp env vars are now optional when DB-backed `WhatsAppChannel` resolution is the
primary runtime path, but legacy fallback still works if those env vars are kept in place.

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

Explicit runtime validation helpers:

```bash
npm run validate:runtime:web
npm run validate:runtime:worker
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
7. Switch or confirm webhook traffic only after the web app is live and the worker is healthy.
8. Run the smoke checks below.

## Smoke test checklist

Run these checks immediately after rollout:

1. Open the web app and confirm a tenant workspace loads successfully.
2. Confirm `GET /api/webhooks/whatsapp` verification succeeds with the expected token/challenge flow.
3. Send one controlled WhatsApp inbound test message and confirm:
   - the webhook responds successfully
   - the job is enqueued
   - the worker logs job start and completion
4. Confirm the conversation appears in the CRM with inbound/outbound history.
5. Confirm Redis connectivity and Postgres-backed reads/writes are healthy in both services.
6. Confirm no unexpected `503 queue-unavailable` webhook responses are appearing.

## First go-live recommendation

For the first production rollout:

- run a single worker instance
- keep the webhook live only after the worker is already healthy
- use a controlled internal WhatsApp test conversation before broader traffic is considered live
- avoid schema changes and webhook cutover in separate unsynchronized steps

## Rollback cautions

- Coordinate rollbacks across both web and worker if a release changes Prisma schema usage.
- Do not roll back code to a version that cannot read the currently deployed schema.
- If delivery or queue issues occur, verify `REDIS_URL`, WhatsApp credentials, and worker health before reprocessing messages manually.
- If rollout fails after migrations are applied, pause webhook traffic first, then roll back web/worker runtime only if the previous release is schema-compatible.

## Operational notes

- The webhook returns quickly and should not perform business processing inline.
- If queue enqueue fails, the webhook now returns a non-200 response (`503`) instead of pretending success.
- The worker is the only long-running automation processor and must remain up for end-to-end automation to function.
- Missing `REDIS_URL` now fails in production instead of silently falling back to localhost.
