# ============================================================================
# eLIS — Development & Deployment Commands
# ============================================================================

.PHONY: help dev dev-up dev-down prod-up prod-down logs clean seed

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# --- Local Development (Full Docker) ---
dev-up: ## Start all services locally (Docker)
	docker compose up -d --build
	@echo ""
	@echo "✅ eLIS running:"
	@echo "   Web:  http://localhost:3000"
	@echo "   API:  http://localhost:3001"
	@echo "   DB:   localhost:5432"
	@echo "   Redis: localhost:6379"

dev-down: ## Stop all local services
	docker compose down

dev-logs: ## View logs from all services
	docker compose logs -f

dev-logs-api: ## View API logs only
	docker compose logs -f api

# --- Production Deployment ---
prod-up: ## Start production containers (requires external DB + Redis)
	docker compose -f docker-compose.prod.yml up -d --build
	@echo ""
	@echo "✅ eLIS Production running"

prod-down: ## Stop production containers
	docker compose -f docker-compose.prod.yml down

prod-logs: ## View production logs
	docker compose -f docker-compose.prod.yml logs -f

# --- Database ---
db-migrate: ## Run Prisma migrations (local)
	cd apps/api && npx prisma migrate deploy

db-seed: ## Seed database with initial data
	cd apps/api && node -e " \
		const bcrypt = require('bcrypt'); \
		const { PrismaClient } = require('@prisma/client'); \
		const prisma = new PrismaClient(); \
		async function seed() { \
			const hash = await bcrypt.hash('admin123', 10); \
			const user = await prisma.user.upsert({ \
				where: { email: 'admin@elis.com' }, \
				update: {}, \
				create: { email: 'admin@elis.com', passwordHash: hash, role: 'ADMIN' } \
			}); \
			console.log('Seeded admin:', user.email); \
			await prisma.\$$disconnect(); \
		} \
		seed(); \
	"

db-studio: ## Open Prisma Studio
	cd apps/api && npx prisma studio

# --- Testing ---
test: ## Run all tests
	cd apps/api && npx jest --no-coverage

test-pbt: ## Run property-based tests only
	cd apps/api && npx jest --testPathPattern=property.spec --no-coverage

# --- Utilities ---
clean: ## Remove all containers, volumes, and build artifacts
	docker compose down -v --remove-orphans
	docker compose -f docker-compose.prod.yml down -v --remove-orphans 2>/dev/null || true
	rm -rf apps/api/dist apps/web/.next

status: ## Show running containers
	docker compose ps
