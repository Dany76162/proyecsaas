FROM node:22-bullseye

WORKDIR /app

COPY . .

RUN npm install -g pnpm@9
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @workspace/proyecsaas exec prisma generate
RUN pnpm --filter @workspace/proyecsaas run build

# Railway injects PORT automatically; default to 3000 if absent (aligns with EXPOSE)
ENV PORT=3000
EXPOSE 3000

# Use ; not && so a migration warning never blocks server startup
CMD sh -c "pnpm --filter @workspace/proyecsaas exec prisma migrate deploy; pnpm --filter @workspace/proyecsaas run start"
