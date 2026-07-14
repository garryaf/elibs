# Audit: Docker Build Performance — Dev (Mac M1) vs VPS

## Ringkasan Masalah

| Aspek | Mac M1 (Dev) | VPS |
|-------|--------------|-----|
| CPU | Apple M1 (8-core, 3.2GHz) | 2 vCPU (shared) |
| RAM | 8 GB | 2 GB |
| Disk I/O | NVMe SSD (~5 GB/s) | Cloud disk (~100-300 MB/s) |
| Command | `docker compose -f docker-compose-dev.yml up -d --build` | `docker compose up -d --build` |
| Compose file | `docker-compose-dev.yml` | `docker-compose.yml` |
| Hasil | Cepat (~2-5 menit) | Sangat lambat (15-30+ menit) |

---

## Analisis Root Cause

### 1. Resource Gap (Penyebab Utama ~60% lambatnya)

| Operasi Build | Kebutuhan Resource | Mac M1 | VPS 2GB |
|---|---|---|---|
| `npm ci` (install deps) | RAM intensive | Lancar, 8GB cukup | **OOM risk**, swap thrashing |
| `npx prisma generate` | CPU + RAM | Cepat di M1 | Lambat, CPU throttled |
| `nest build` (TypeScript compile) | CPU + RAM | ~20-30 detik | **3-10 menit** (swap) |
| `next build` (Web) | CPU + RAM heavy | ~40-60 detik | **10-20 menit** (swap) |

**Detail masalah:**
- `npm ci` pada monorepo memerlukan ~1.2-1.5 GB RAM hanya untuk resolve + install dependencies
- `next build` (webpack/turbopack bundling) peak usage bisa **1.5-2 GB RAM** sendiri
- Dengan total RAM 2 GB, OS + Docker daemon + build containers = **pasti masuk swap**
- Swap pada cloud disk (100-300 MB/s) vs NVMe (5 GB/s) = **20-50x lebih lambat**

### 2. Multi-Stage Build Menggandakan Beban

Kedua Dockerfile (`apps/api/Dockerfile` dan `apps/web/Dockerfile`) menggunakan 3-stage multi-stage build:

```
Stage 1 (deps)  → npm ci install semua dependencies
Stage 2 (builder) → copy node_modules + compile/build
Stage 3 (production) → npm ci --omit=dev (install lagi!)
```

Pada VPS 2GB, ini berarti:
- **API build**: `npm ci` 2x (full + prod-only) + `prisma generate` + `nest build` + `tsc seed`
- **Web build**: `npm ci` 2x + `next build`
- Total: **4x `npm ci` + 2 heavy compile steps** — semuanya rebutan RAM 2 GB

### 3. Kedua Service Build Secara Bersamaan

`docker compose up -d --build` membangun `api` dan `web` **secara parallel** (karena `web` depends_on `api` tapi build tetap parallel). Pada Mac 8GB ini fine. Pada VPS 2GB, dua build sekaligus = **dua kali lipat RAM usage = swap storm**.

### 4. Docker Build Cache Tidak Efektif di VPS

Build cache (`--mount=type=cache,target=/root/.npm`) seharusnya membantu, tapi:
- Di VPS, setiap kali `docker compose up -d --build` dipanggil, jika ada perubahan kode di `COPY apps/api/ ./apps/api/`, **semua layer setelahnya di-rebuild** termasuk `prisma generate` dan `nest build`
- Cache npm hanya skip download, tapi `npm ci` tetap extract + install (CPU/RAM bound)
- Di Mac, disk I/O sangat cepat sehingga cache hit terasa instan. Di VPS, bahkan cache hit masih lambat karena I/O.

### 5. `docker-compose.yml` Lebih Berat dari `docker-compose-dev.yml`

| Komponen | `docker-compose-dev.yml` | `docker-compose.yml` (VPS) |
|---|---|---|
| Services yang build | 2 (api, web) | 2 (api, web) |
| Extra services | postgres, redis | postgres, redis, **nginx, certbot** |
| Depends on | Sederhana | `web` depends on `api` (service_healthy) |
| Healthcheck wait | Tidak blocking | api healthcheck = **40s start-period** sebelum web boleh start |

Ini bukan penyebab lambat build, tapi memperlambat "up" setelah build selesai.

### 6. CPU Shared vCPU vs Dedicated Core

VPS murah (2 vCPU) biasanya **shared/burstable** — artinya:
- CPU bisa di-throttle jika burst credit habis
- TypeScript compilation dan webpack bundling = sustained 100% CPU selama menit
- Setelah burst habis → build speed turun 50-70%

---

## Perbandingan Visual Flow

```
=== Mac M1 (8GB) ===
[npm ci api]     ████ 30s (in RAM)
[nest build]     ██ 20s
[npm ci web]     ████ 30s (parallel)
[next build]     ██████ 50s
Total:           ~2-3 menit

=== VPS (2GB, 2vCPU) ===
[npm ci api]     ████████████████ 5min (swap thrashing)
[nest build]     ████████████ 4min (swap + CPU throttle)
[npm ci web]     ████████████████ 5min (swap)
[next build]     ██████████████████████████████ 15min (swap + CPU + webpack)
Total:           ~20-30 menit
```

---

## Rekomendasi Solusi

### Solusi Cepat (Tanpa Upgrade VPS)

#### A. Build Sequential, Bukan Parallel

```bash
# Build satu per satu untuk hindari double RAM usage
docker compose build api && docker compose build web && docker compose up -d
```

#### B. Tambah Swap File (Jika Belum Ada)

```bash
# Di VPS, tambah 2-4 GB swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Turunkan swappiness agar tidak terlalu agresif swap
sudo sysctl vm.swappiness=10
```

Ini tidak akan mempercepat build secara drastis, tapi mencegah OOM kill.

#### C. Build di Mac, Push Image ke Registry

**Pendekatan paling efektif** — build cepat di Mac, deploy image jadi ke VPS:

```bash
# Di Mac (cepat):
docker buildx build --platform linux/amd64 -f apps/api/Dockerfile -t registry.example.com/elis-api:latest --push .
docker buildx build --platform linux/amd64 -f apps/web/Dockerfile -t registry.example.com/elis-web:latest --push .

# Di VPS (hanya pull + run, 30 detik):
docker compose pull && docker compose up -d
```

Opsi registry gratis/murah:
- GitHub Container Registry (ghcr.io) — gratis untuk public repo
- Docker Hub — 1 private repo gratis
- DigitalOcean Container Registry — $5/bulan

#### D. Limit Build Concurrency di Docker Compose

```yaml
# docker-compose.yml - tambah resource limits saat build
services:
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
      # Saat build, batasi agar tidak rebutan
    deploy:
      resources:
        limits:
          memory: 1536M
```

### Solusi Jangka Menengah

#### E. Gunakan CI/CD Pipeline (GitHub Actions)

Build di GitHub Actions (runner 7 GB RAM, 2 vCPU dedicated) → push ke registry → VPS hanya pull.

```yaml
# .github/workflows/deploy.yml
name: Build & Deploy
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/build-push-action@v5
        with:
          file: apps/api/Dockerfile
          push: true
          tags: ghcr.io/${{ github.repository }}/api:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

#### F. Upgrade VPS ke 4 GB RAM

Perbedaan harga biasanya hanya $5-10/bulan tapi efeknya sangat signifikan:
- 4 GB RAM = tidak perlu swap saat build
- Build time turun dari 20-30 menit ke 5-8 menit

---

## Rekomendasi Prioritas

| Prioritas | Solusi | Effort | Impact |
|-----------|--------|--------|--------|
| 1 | **Tambah swap 4GB** | 2 menit | Cegah OOM, sedikit lebih cepat |
| 2 | **Build sequential** | 0 menit | Kurangi peak RAM ~30% |
| 3 | **Build di Mac + push image** | 30 menit setup | Build 0 detik di VPS |
| 4 | **CI/CD GitHub Actions** | 2-3 jam setup | Build otomatis, VPS hanya pull |
| 5 | **Upgrade VPS ke 4GB** | 5 menit | Solve root cause |

---

## Kesimpulan

Penyebab utama: **RAM 2 GB tidak cukup untuk build 2 Node.js app sekaligus**. TypeScript compilation + webpack bundling + npm install membutuhkan minimal 3-4 GB RAM untuk berjalan tanpa swap. Mac M1 dengan 8 GB RAM + NVMe SSD + dedicated core tidak pernah mengalami bottleneck ini.

Solusi paling cost-effective: **Build di Mac menggunakan `docker buildx` cross-compile ke linux/amd64, push ke container registry, dan di VPS hanya `docker compose pull && up -d`**. Ini menghilangkan kebutuhan build di VPS sepenuhnya.
