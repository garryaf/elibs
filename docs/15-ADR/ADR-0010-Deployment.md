# ADR-0010: Deployment

## Context
Proyek eLIS akan diluncurkan (go-live) untuk satu laboratorium sentral terlebih dahulu (Phase 1) sebelum berekspansi ke puluhan klinik rujukan. Infrastruktur perlu cukup fleksibel untuk mengakomodasi awal yang ringan namun dapat bertransisi mulus ke arsitektur berskala tinggi (High Availability).

## Problem
Menentukan strategi komputasi dan deployment yang paling efektif (biaya dan waktu pemeliharaan) untuk Phase 1 dengan memikirkan jalur evolusi menuju SaaS di Phase 3.

## Alternative
1. **Traditional VM Deployment (Bare Metal/VM)**: Install manual Node.js, PostgreSQL, Redis di VM.
2. **Containerized (Docker + Docker Compose)**: Membungkus semua dependencies di dalam kontainer yang terisolasi dan diorkestrasi sederhana di satu/beberapa mesin.
3. **Container Orchestration (Kubernetes/K8s)**: Deployment skalabel dan kompleks dari hari pertama.

## Pros
- **Docker + Docker Compose (Phase 1)**:
  - Sangat cepat untuk di-setup untuk lingkungan development, staging, dan production awal.
  - Reproduksibilitas lingkungan dijamin 100% (sama persis antara laptop developer dan server production).
  - Isolasi dependensi (tidak akan ada konflik versi Node.js atau PostgreSQL dengan aplikasi lain di server).

## Cons
- **Docker Compose**:
  - Secara bawaan (default) tidak memiliki fitur *self-healing* canggih antar berbagai node (meskipun container bisa otomatis restart).
  - Tidak dirancang untuk skala horizontal otomatis multi-server tanpa alat tambahan (seperti Docker Swarm).

## Selected
**Docker + Docker Compose (sebagai standard Phase 1)**

## Consequence
1. Setiap layanan (Backend, Frontend, PostgreSQL, Redis, MinIO) wajib memiliki `Dockerfile` atau image docker yang standar.
2. Deployment ke staging dan production dilakukan menggunakan `docker-compose up` via pipeline CI/CD dasar.
3. Konfigurasi rahasia (secrets) dikelola menggunakan *Environment Variables* (.env file).

## Future Consideration
Untuk **Future Kubernetes (K8s)** Strategy: Di Phase 2/3 ketika sistem menjadi SaaS multi-tenant, beban aplikasi akan meningkat dan ketersediaan 99.99% menjadi keharusan. Karena semua aplikasi sudah di-containerize (Docker) dari Phase 1, migrasi ke Kubernetes hanya membutuhkan pembuatan file manifestasi K8s (Deployment, Service, Ingress). Tidak perlu mengubah *codebase* atau *runtime* aplikasi.
