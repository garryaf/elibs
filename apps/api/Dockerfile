# ============================================================================
# eLIS API — Multi-stage Production Dockerfile
# Build context: monorepo root (.)
# Usage: docker build -f apps/api/Dockerfile .
# ============================================================================

# --- Stage 1: Dependencies ---
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat python3 make g++

# Copy root workspace files for npm install
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install all workspace dependencies (including dev for build)
RUN npm ci --workspace=api && npm cache clean --force

# --- Stage 2: Build ---
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

# Copy source files needed for build
COPY apps/api/ ./apps/api/
COPY package.json package-lock.json ./

# Generate Prisma Client
RUN cd apps/api && npx prisma generate

# Build NestJS
RUN cd apps/api && npx nest build

# Prune dev dependencies for production image
RUN npm prune --workspace=api --omit=dev

# --- Stage 3: Production ---
FROM node:20-alpine AS production
WORKDIR /app

# Install required system libraries for Prisma
RUN apk add --no-cache openssl libc6-compat

# Security: run as non-root
RUN addgroup -g 1001 -S elis && \
    adduser -S elis -u 1001 -G elis

# Copy pruned node_modules (production only)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

# Copy built application
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/package.json ./

# Entrypoint
COPY apps/api/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Fix ownership so elis user can write (prisma needs write access to engines dir)
RUN chown -R elis:elis /app

USER elis

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/v1/health || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "apps/api/dist/src/main.js"]
