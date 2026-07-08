# syntax=docker/dockerfile:1

##########
# Stage 1 — deps: install ALL dependencies (incl. dev) for the build
##########
FROM node:20-alpine AS deps
WORKDIR /app

# Puppeteer must NOT download its bundled Chromium — we use Alpine's system
# Chromium in the runtime stage instead (much smaller, security-patched).
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package.json package-lock.json ./
RUN npm ci

##########
# Stage 2 — builder: compile TypeScript -> dist/
##########
FROM node:20-alpine AS builder
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Strip dev dependencies so we can copy a lean node_modules into runtime.
RUN npm prune --omit=dev

##########
# Stage 3 — runner: minimal production image
##########
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3001 \
    # Point Puppeteer at the system Chromium installed below.
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Chromium + the fonts/libs it needs to render PDFs headlessly.
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    dumb-init

# Run as an unprivileged user.
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

# Writable dir for generated/served uploads (see main.ts useStaticAssets).
RUN mkdir -p /app/uploads && chown -R nestjs:nodejs /app/uploads

USER nestjs
EXPOSE 3001

# dumb-init reaps zombie Chromium processes spawned by Puppeteer.
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
