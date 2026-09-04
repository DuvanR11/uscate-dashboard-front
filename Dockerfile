# Despliegue en DigitalOcean (2026-09-04). Build multi-stage: las variables
# NEXT_PUBLIC_* de Next.js se "hornean" en el bundle del CLIENTE durante
# `next build` — no se pueden inyectar después vía `docker run -e` como un
# backend normal, por eso viajan como `--build-arg` (ver
# docker-compose.prod.yml). `output: "standalone"` (next.config.ts) hace que
# `.next/standalone` ya traiga su propio `node_modules` mínimo — la imagen
# final NO necesita el `node_modules` completo del stage de build.
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCIAL_EXTRACTOR_API_URL
ARG NEXT_PUBLIC_GOOGLE_MAPS_KEY
ARG NEXT_PUBLIC_YOUR_ACCESS_TOKEN
ARG NEXT_PUBLIC_WHATSAPP_BUSINESS_ID
ARG NEXT_PUBLIC_GRAPH_API_VERSION
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SOCIAL_EXTRACTOR_API_URL=$NEXT_PUBLIC_SOCIAL_EXTRACTOR_API_URL \
    NEXT_PUBLIC_GOOGLE_MAPS_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_KEY \
    NEXT_PUBLIC_YOUR_ACCESS_TOKEN=$NEXT_PUBLIC_YOUR_ACCESS_TOKEN \
    NEXT_PUBLIC_WHATSAPP_BUSINESS_ID=$NEXT_PUBLIC_WHATSAPP_BUSINESS_ID \
    NEXT_PUBLIC_GRAPH_API_VERSION=$NEXT_PUBLIC_GRAPH_API_VERSION

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
