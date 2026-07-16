# eLIS Deployment Guide — Native (Non-Docker App)

## Arsitektur

```
┌───────────────────────────────────────────────────────────────┐
│  DEVELOPER (Mac M1)                                           │
│  git push main ──────────────────────────────────────────┐    │
└──────────────────────────────────────────────────────────┼────┘
                                                           │
┌──────────────────────────────────────────────────────────┼────┐
│  GITHUB ACTIONS (7 GB RAM, 2 vCPU dedicated)             │    │
│                                                          ▼    │
│  1. npm ci                                                    │
│  2. prisma generate                                           │
│  3. nest build (API)                                          │
│  4. next build (Web)                                          │
│  5. tar artifacts                                             │
│  6. SCP to VPS ──────────────────────────────────────┐        │
│  7. SSH: extract + npm ci --omit=dev + pm2 restart   │        │
└──────────────────────────────────────────────────────┼────────┘
                                                       │
┌──────────────────────────────────────────────────────┼────────┐
│  VPS BIZNET (2 GB RAM, 2 vCPU)                       ▼        │
│                                                               │
│  Docker (infra only):           Native (PM2):                 │
│  ├── postgres:15   (5432)       ├── elis-api    (3001)        │
│  ├── redis:7       (6379)       └── elis-web    (3000)        │
│  ├── nginx:alpine  (80/443)                                   │
│  └── certbot                                                  │
│                                                               │
│  Nginx → proxy_pass → host.docker.internal:3001/3000          │
└───────────────────────────────────────────────────────────────┘
```

## Setup Awal (Satu Kali)

### 1. Jalankan Setup Script di VPS

```bash
# ⬇️ Ketik di TERMINAL MACBOOK (dari folder project ~/SourceCode/Elis)
# File setup-vps.sh dibaca dari Mac, tapi dieksekusi di VPS via SSH
ssh -i ~/Documents/SSH/elib.pem dinaragil@103.196.155.147 'bash -s' < deploy/setup-vps.sh
```

Ini akan install di VPS: Node.js 20, PM2, Docker, swap 2GB, dan buat directory `/opt/elis`.

### 2. Copy Infra Config ke VPS

```bash
# ⬇️ Ketik di TERMINAL MACBOOK (dari folder project ~/SourceCode/Elis)
scp -i ~/Documents/SSH/elib.pem -r deploy/docker-compose.infra.yml dinaragil@103.196.155.147:/opt/elis/deploy/
scp -i ~/Documents/SSH/elib.pem -r deploy/nginx/ dinaragil@103.196.155.147:/opt/elis/deploy/nginx/
scp -i ~/Documents/SSH/elib.pem -r deploy/certbot/ dinaragil@103.196.155.147:/opt/elis/deploy/certbot/
scp -i ~/Documents/SSH/elib.pem elis-ecosystem.config.js dinaragil@103.196.155.147:/opt/elis/
```

### 3. Start Infrastructure di VPS

```bash
# ⬇️ Ketik di TERMINAL MACBOOK — ini masuk ke VPS
ssh -i ~/Documents/SSH/elib.pem dinaragil@103.196.155.147

# ⬇️ Sekarang kamu SUDAH DI DALAM VPS — ketik command ini:   
cd /opt/elis/deploy
docker compose -f docker-compose.infra.yml up -d
```

### 4. Set GitHub Secrets

Di GitHub repo → Settings → Secrets and Variables → Actions:

| Secret | Value |
|--------|-------|
| `VPS_SSH_KEY` | Isi private key SSH (copy dari `~/Documents/SSH/elib.pem`) |

Host dan user sudah di-hardcode di workflow (`103.196.155.147`, `dinaragil`).

Di GitHub repo → Settings → Variables → Actions:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://elibs.jizo.my.id` |

### 5. Push ke Main → Deploy Otomatis

```bash
git add .
git commit -m "feat: add CI/CD native deployment"
git push origin main
```

GitHub Actions akan:
1. Build API + Web (di runner 7 GB RAM — cepat)
2. SCP artifact ke VPS
3. SSH ke VPS: extract, install prod deps, migrate DB, restart PM2

---

## Perintah Operasional di VPS

```bash
# ⬇️ Ketik di TERMINAL MACBOOK — masuk ke VPS
ssh -i ~/Documents/SSH/elib.pem dinaragil@103.196.155.147

# ⬇️ Command di bawah ini diketik SETELAH masuk VPS:

# Lihat status apps
pm2 status

# Lihat logs real-time
pm2 logs

# Restart semua
pm2 restart elis-ecosystem.config.js

# Restart satu service
pm2 restart elis-api
pm2 restart elis-web

# Lihat resource usage
pm2 monit

# Lihat infra Docker
cd /opt/elis/deploy
docker compose -f docker-compose.infra.yml ps
docker compose -f docker-compose.infra.yml logs postgres
```

## Rollback

Jika deploy gagal, rollback manual:
```bash
# Di VPS, PM2 otomatis restart proses yang crash
# Untuk rollback code, revert commit di GitHub:
git revert HEAD
git push origin main
# → GitHub Actions akan deploy versi sebelumnya
```

## Environment Variables

Environment variables didefinisikan di `elis-ecosystem.config.js`.
Untuk mengubah:

```bash
# Di VPS:
nano /opt/elis/elis-ecosystem.config.js
pm2 restart elis-ecosystem.config.js --update-env
```

**PENTING**: Jangan simpan secrets (JWT_SECRET, DB_PASSWORD) di Git!
Set sebagai environment variable di VPS:

```bash
# SSH ke VPS:
ssh -i ~/Documents/SSH/elib.pem dinaragil@103.196.155.147

# Di VPS, edit ~/.bashrc atau /etc/environment:
export JWT_SECRET="your-production-secret-here"
export DB_PASSWORD="your-db-password-here"
```

Lalu update ecosystem.config.js untuk baca dari `process.env`:
```js
env: {
  JWT_SECRET: process.env.JWT_SECRET,
  DATABASE_URL: `postgresql://postgres:${process.env.DB_PASSWORD}@localhost:5432/elis_db?schema=public`,
}
```

## Perbandingan: Sebelum vs Sesudah

| Aspek | Docker Build di VPS | Native + CI/CD |
|-------|--------------------|----|
| Build time | 20-30 menit | 0 detik (build di GitHub) |
| Deploy time | 20-30 menit | ~2-3 menit (download + restart) |
| RAM saat deploy | 3-4 GB (swap) | ~200 MB (npm ci prod) |
| RAM saat runtime | ~900 MB (Docker overhead) | ~725 MB |
| Downtime | 5-10 menit (during build) | ~5 detik (PM2 restart) |
