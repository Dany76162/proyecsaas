FROM node:22-bullseye

WORKDIR /app

COPY . .

RUN npm install -g pnpm@9

RUN npx pnpm install --no-frozen-lockfile --ignore-scripts

RUN npx pnpm --filter @workspace/proyecsaas exec prisma generate

RUN npx pnpm --filter @workspace/proyecsaas run build

EXPOSE 3000

CMD sh -c "npx pnpm --filter @workspace/proyecsaas exec prisma migrate deploy && npx pnpm --filter @workspace/proyecsaas run start"