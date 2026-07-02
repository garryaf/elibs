# System Architecture Document
# Enterprise Laboratory Information System (eLIS)

| Field            | Detail                                       |
|------------------|----------------------------------------------|
| **Document ID**  | ARCH-eLIS-2026-001                           |
| **Version**      | 1.0                                          |
| **Status**       | Final Draft                                  |
| **Date Created** | 2026-06-30                                   |
| **Referensi**    | ADR-0001 s/d ADR-0012, BRD-eLIS-v1.0        |

---

## 1. Architectural Overview

### 1.1 Filosofi Arsitektur
eLIS dirancang menggunakan pola **Modular Monolith** sebagai titik awal, dengan prinsip *Evolution-Ready Architecture*. Setiap modul domain bisnis memiliki batas yang jelas (*domain boundary*) sehingga ekstraksi ke Microservice di masa depan dapat dilakukan tanpa rewrite total.

> **Prinsip Utama**: "Mulai sederhana, scale dengan disiplin."

### 1.2 Pola Arsitektur yang Diadopsi

| Level | Pola | Detail |
|-------|------|--------|
| **Sistem** | Modular Monolith | Satu deployment unit, modul domain yang terisolasi secara logika |
| **Backend** | Layered Architecture | Controller → Service → Repository (via Prisma) |
| **Frontend** | Feature-Sliced Design | Komponen terorganisir per fitur/domain |
| **Komunikasi** | Request-Response (REST) | Frontend ↔ Backend via HTTP/JSON |
| **Async Processing** | Event-Driven Queue | BullMQ + Redis untuk notifikasi dan PDF |
| **Infrastruktur** | Containerized | Docker + Docker Compose → Future K8s |

---

## 2. System Context Diagram (C4 Level 1)

```mermaid
graph TB
    subgraph Actors["Aktor Eksternal"]
        Staf["👤 Staf Lab"]
        Kasir["👤 Kasir"]
        Teknisi["👤 Teknisi Lab"]
        Dokter["👤 Dokter PJ"]
        AdminKlinik["👤 Admin Klinik"]
    end

    subgraph eLIS["🏥 eLIS System"]
        FE["Frontend\nNext.js App"]
        BE["Backend\nNestJS Monolith"]
    end

    subgraph External["Layanan Eksternal"]
        EmailGW["📧 Email Gateway\n(SMTP / SendGrid)"]
        WAPI["💬 WhatsApp API\n(Fonnte / Twilio)"]
    end

    Staf -->|"Registrasi Pasien"| FE
    Kasir -->|"Proses Pembayaran"| FE
    Teknisi -->|"Input Hasil Lab"| FE
    Dokter -->|"Approval Hasil"| FE
    AdminKlinik -->|"Cek Riwayat Pasien"| FE

    FE -->|"REST API / HTTPS"| BE
    BE -->|"Email Queue"| EmailGW
    BE -->|"WA Queue"| WAPI
```

---

## 3. Container Diagram (C4 Level 2)

```mermaid
graph TD
    Browser["🌐 Web Browser\n(Next.js SSR)"]

    subgraph Docker["🐳 Docker Compose Environment"]
        FE["📦 Container: Frontend\nNext.js · Port 3000"]
        GW["📦 Container: API Gateway / Nginx\nSSL Termination · Port 443"]
        BE["📦 Container: Backend API\nNestJS · Port 4000"]
        Worker["📦 Container: Queue Worker\nNestJS BullMQ Process"]
        DB["🗄️ Container: PostgreSQL\nPort 5432"]
        Redis["🔴 Container: Redis\nPort 6379"]
        Minio["📁 Container: MinIO\nObject Storage · Port 9000"]
        Monitor["📊 Container: Prometheus + Grafana\nMonitoring · Port 3001"]
    end

    Browser -->|HTTPS| GW
    GW -->|HTTP| FE
    GW -->|HTTP /api/*| BE
    BE -->|SQL via Prisma| DB
    BE -->|Cache / Session / Queue| Redis
    BE -->|PUT / GET Objects| Minio
    Worker -->|Poll Jobs| Redis
    Worker -->|GET PDF| Minio
    BE -->|Expose /metrics| Monitor
```

---

## 4. Component Diagram — Backend (C4 Level 3)

```mermaid
graph LR
    subgraph NestJS["NestJS Modular Monolith"]
        direction TB

        AuthMod["🔐 Auth Module\nController / Service / Guard / Strategy"]
        UserMod["👥 User Module\nCRUD + RBAC"]
        PatientMod["🧑‍⚕️ Patient Module\nRegistrasi / Riwayat"]
        OrderMod["📋 Order Module\nOrder Creation / Tracking"]
        BillingMod["💰 Billing Module\nInvoice / Payment"]
        LabMod["🔬 Lab Module\nAnalisa / Verifikasi / Approval"]
        ReportMod["📄 Report Module\nPDF Generator / Dashboard Data"]
        NotifMod["🔔 Notification Module\nEmail + WA Queue Worker"]
        AuditMod["📜 Audit Module\nAudit Trail Middleware"]
        MasterMod["⚙️ Master Module\nData Jenis Uji, Klinik, Dokter"]
    end

    AuthMod --> UserMod
    PatientMod --> OrderMod
    OrderMod --> BillingMod
    OrderMod --> LabMod
    LabMod --> ReportMod
    ReportMod --> NotifMod
    AuditMod -. intercepts .-> PatientMod & OrderMod & LabMod & BillingMod
```

---

## 5. Data Flow Architecture

### 5.1 Happy Path: Registrasi → Kasir → Lab → Notifikasi

```mermaid
sequenceDiagram
    participant S as Staf/Kasir
    participant API as NestJS API
    participant DB as PostgreSQL
    participant Q as Redis Queue (BullMQ)
    participant W as Queue Worker
    participant MinIO as MinIO Storage
    participant Notif as Email/WA Gateway

    S->>API: POST /orders (Create Order)
    API->>DB: INSERT order (status=PENDING_PAYMENT)
    API-->>S: Order Created + Invoice

    S->>API: POST /orders/:id/pay
    API->>DB: UPDATE order (status=PAID)
    API-->>S: Payment Confirmed + Barcode

    S->>API: POST /lab/:id/results (Input Hasil)
    API->>DB: INSERT order_details (hasil + flag)

    S->>API: POST /lab/:id/approve (Dokter Approve)
    API->>DB: UPDATE order (status=APPROVED)
    API->>Q: PUSH job ke email-queue & wa-queue
    API-->>S: Approved ✅

    W->>Q: PULL job dari queue
    W->>API: GET /reports/:id/pdf
    W->>MinIO: STORE PDF file
    W->>Notif: SEND Email (attachment PDF)
    W->>Notif: SEND WhatsApp (link PDF)
```

---

## 6. Security Architecture

| Layer | Kontrol Keamanan |
|-------|-----------------|
| **Network** | TLS 1.3, HSTS, CORS Strict Origin Policy |
| **API Gateway** | Rate Limiting (per IP), DDoS Basic Protection |
| **Authentication** | JWT (HS256, short-lived 15m) + Refresh Token (HttpOnly Cookie) |
| **Authorization** | RBAC via NestJS Guards per endpoint |
| **Data at Rest** | AES-256 untuk field PII, bcrypt-12 untuk password |
| **Audit** | Immutable `audit_logs` via Prisma Middleware |
| **Application** | Helmet.js (HTTP Security Headers), class-validator (Input Validation) |
| **Monitoring** | Prometheus Alerts untuk anomali request spike |

---

## 7. Scalability Architecture

### Phase 1 (Now) — Single Node
- 1 VPS/Server dengan Docker Compose.
- Single instance PostgreSQL, Redis, MinIO.
- Mampu menangani 1 lab + beberapa klinik rujukan.

### Phase 2 — Read Scaling
- **PostgreSQL Read Replica** diperkenalkan untuk memisahkan beban tulis dan baca (laporan & dashboard).
- **Redis Cluster** jika volume queue melebihi kapasitas single node.

### Phase 3 — Horizontal Scaling (SaaS)
- Migrasi ke **Kubernetes (K8s)** untuk auto-scaling pod Backend dan Worker.
- **Database Sharding per Tenant** atau schema isolation PostgreSQL.
- API Gateway (Kong) sebagai entry point pengganti Nginx.
- Ekstraksi Microservice dimulai dari modul dengan beban tertinggi (Notifikasi, PDF Generator).

---

## 8. Disaster Recovery & High Availability

| Aspek | Strategi |
|-------|----------|
| **RTO** | 4 Jam (Recovery Time Objective) |
| **RPO** | 15 Menit (Recovery Point Objective) |
| **DB Backup** | WAL Archiving + Full Backup Harian |
| **MinIO Backup** | Replikasi ke bucket sekunder setiap 24 jam |
| **Failover** | Docker `restart: always` policy + Health Check |
| **Monitoring Alert** | Grafana alert → Email/Telegram jika server down |

---
**END OF ARCHITECTURE DOCUMENT**
