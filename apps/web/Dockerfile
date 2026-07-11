# ============================================================================
# eLIS Web — Multi-stage Production Dockerfile
# Build context: monorepo root (.)
# Usage: docker build -f apps/web/Dockerfile .
# ============================================================================

# --- Stage 1: Dependencies ---
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Copy root workspace files for npm install
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Configure npm for slow/unstable networks
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 60000 && \
    npm config set fetch-retry-maxtimeout 300000 && \
    npm config set fetch-timeout 600000 && \
    npm config set maxsockets 5

# Install ALL workspace dependencies (more reliable than --workspace filter on slow networks)
RUN npm ci && npm cache clean --force

# --- Stage 2: Build ---
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Copy source files needed for build
COPY apps/web/ ./apps/web/
COPY package.json ./

ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js
RUN cd apps/web && npm run build

# Prune dev dependencies
RUN npm prune --workspace=web --omit=dev

# --- Stage 3: Production ---
FROM node:20-alpine AS production
WORKDIR /app

# Security: run as non-root
RUN addgroup -g 1001 -S elis && \
    adduser -S elis -u 1001 -G elis

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy pruned node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/node_modules ./apps/web/node_modules

# Copy built application
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/package.json ./apps/web/
COPY package.json ./

USER elis

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

CMD ["npm", "run", "start", "--workspace=web"]
