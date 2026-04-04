FROM node:22-bullseye

WORKDIR /app

COPY . .

RUN npm install -g pnpm@9
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @workspace/proyecsaas exec prisma generate
RUN pnpm --filter @workspace/proyecsaas run build

# ── Copy static/public assets into the standalone bundle ─────────────────────
# next build --output=standalone does not copy these automatically
RUN cp -r artifacts/proyecsaas/public \
         artifacts/proyecsaas/.next/standalone/artifacts/proyecsaas/public 2>/dev/null || true
RUN cp -r artifacts/proyecsaas/.next/static \
         artifacts/proyecsaas/.next/standalone/artifacts/proyecsaas/.next/static 2>/dev/null || true

WORKDIR /app/artifacts/proyecsaas/.next/standalone

EXPOSE 3000

# Railway injects PORT; HOSTNAME binds to all interfaces.
# The standalone server.js reads both from process.env automatically.
ENV HOSTNAME=0.0.0.0

# Run Prisma migrations then start the self-contained Next.js server.
# Using ; so a migration warning never blocks server startup.
CMD sh -c "cd /app/artifacts/proyecsaas && node_modules/.bin/prisma migrate deploy || echo '[warn] migration step skipped'; exec node /app/artifacts/proyecsaas/.next/standalone/server.js"
