FROM node:22-bullseye

WORKDIR /app

COPY . .

RUN npm install -g pnpm@9
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @workspace/proyecsaas exec prisma generate
RUN pnpm --filter @workspace/proyecsaas run build

# Move into the Next.js package so all relative node_modules paths resolve
WORKDIR /app/artifacts/proyecsaas

EXPOSE 3000

# Migrations run first (failure is logged but doesn't block startup)
# exec replaces the shell process so Next.js handles signals correctly
# PORT is injected by Railway; next start reads process.env.PORT automatically
CMD sh -c "node_modules/.bin/prisma migrate deploy || echo '[warn] migration step failed, continuing'; exec node node_modules/next/dist/bin/next start -H 0.0.0.0"
