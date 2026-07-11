# ============================================================================
# eLIS API — Multi-stage Production Dockerfile (Optimized)
# Build context: monorepo root (.)
# Usage: docker build -f apps/api/Dockerfile .
# ============================================================================

# --- Stage 1: Dependencies ---
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat python3 make g++

# Copy only files needed for dependency resolution
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install dependencies with persistent npm cache mount
# This avoids re-downloading packages on every build
RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace=api --include-workspace-root

# --- Stage 2: Build ---
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

# Copy source files needed for build
COPY apps/api/ ./apps/api/
COPY package.json package-lock.json ./

# Generate Prisma Client and stage to deterministic location
RUN cd apps/api && npx prisma generate && \
    mkdir -p /prisma-out/.prisma /prisma-out/@prisma && \
    if [ -d /app/node_modules/.prisma ]; then cp -r /app/node_modules/.prisma/client /prisma-out/.prisma/client; \
    elif [ -d /app/apps/api/node_modules/.prisma ]; then cp -r /app/apps/api/node_modules/.prisma/client /prisma-out/.prisma/client; fi && \
    if [ -d /app/node_modules/@prisma/client ]; then cp -r /app/node_modules/@prisma/client /prisma-out/@prisma/client; \
    elif [ -d /app/apps/api/node_modules/@prisma/client ]; then cp -r /app/apps/api/node_modules/@prisma/client /prisma-out/@prisma/client; fi

# Build NestJS
RUN cd apps/api && npx nest build

# Compile seed scripts for production use
RUN cd apps/api/prisma/seeds && /app/node_modules/.bin/tsc --project ./tsconfig.seed.json

# --- Stage 3: Production ---
FROM node:20-alpine AS production
WORKDIR /app

# Install required system libraries for Prisma
RUN apk add --no-cache openssl libc6-compat

# Security: run as non-root
RUN addgroup -g 1001 -S elis && \
    adduser -S elis -u 1001 -G elis

# Copy package files for production install
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/

# Install production-only dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace=api --include-workspace-root --omit=dev

# Copy built application
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/prisma/seeds/dist ./apps/api/prisma/seeds/dist

# Copy generated Prisma client from builder (staged to /prisma-out)
# Must go to BOTH root and workspace node_modules since Node resolves from workspace first
COPY --from=builder /prisma-out/.prisma ./node_modules/.prisma
COPY --from=builder /prisma-out/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /prisma-out/.prisma ./apps/api/node_modules/.prisma
COPY --from=builder /prisma-out/@prisma/client ./apps/api/node_modules/@prisma/client

# Entrypoint
COPY apps/api/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Fix ownership so elis user can write
RUN chown -R elis:elis /app

USER elis

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/v1/health || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "apps/api/dist/src/main.js"]
