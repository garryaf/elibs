# ADR-0013: Separation of Settings vs Master Data

## Context

Sistem eLIS saat ini menggabungkan 14 sub-fitur di bawah satu halaman "Pengaturan" (Settings). Berdasarkan audit arsitektur enterprise (AUDIT-eLIS-2026), klasifikasi data governance menunjukkan bahwa 12 dari 14 sub-fitur adalah **Master Data** (reference data yang direferensikan oleh ≥2 modul lain dan berubah <1×/bulan), 1 sub-fitur adalah **User Administration**, dan hanya 1 sub-fitur yang benar-benar **System Settings** (SMTP). Di sisi backend, `SettingsController` untuk SMTP berada di dalam modul `notification/` (pelanggaran Single Responsibility Principle), dan modul `region/` terpisah dari `master-data/` meski domain-nya sama.

Dokumen referensi:
- `docs/17-Audit/_inventory/classification-matrix-module-boundary-map.md`
- `docs/17-Audit/_inventory/settings-subfeature-classification.md`

## Problem

Menentukan apakah Master Data dan System Settings harus tetap digabung dalam satu bounded context/modul atau dipisahkan menjadi modul-modul yang independen, dengan mempertimbangkan prinsip data governance enterprise, Single Responsibility Principle, dan skala pertumbuhan sistem.

## Alternative

- **Option A — Keep Combined:** Mempertahankan semua 14 sub-fitur dalam satu modul `laboratory/master-data/` plus `laboratory/notification/settings.controller.ts`. Tidak ada perubahan arsitektur.
- **Option B — Two-Way Split (Master Data + Settings):** Memisahkan System Settings (SMTP) dari `notification/` ke modul sendiri (`settings/`), tapi mempertahankan semua Master Data entities dalam satu modul besar.
- **Option C — Three-Way Bounded Context Split:** Memisahkan ke dalam 3 bounded context terpisah: (1) `master-data/` — 12 entitas referensi, (2) `settings/` — system settings, (3) `users/` — user administration (sudah terpisah). Masing-masing bounded context memiliki modul, controller, service, dan interface sendiri.

## Pros

**Option C (Three-Way Split):**
- Setiap bounded context memiliki satu tanggung jawab jelas — sesuai Single Responsibility Principle
- `SettingsController` terlepas dari lifecycle modul `notification/` — eliminasi coupling yang tidak relevan
- Interface contracts (`IMasterDataQueryService`) memungkinkan decoupling antara consuming modules (Order, Payment, LabWorkflow) dan Master Data
- Setiap bounded context memiliki change frequency berbeda: Master Data (rarely), Users (weekly), Settings (rarely tapi untuk alasan berbeda) — separation memudahkan change management
- Mendukung future scalability: menambahkan Settings baru (notification templates, workflow rules) tidak mengganggu Master Data
- Module isolation compliance naik dari 59% ke target >80%
- Sinkron dengan Navigation restructuring (ADR-0015): 3 bounded context → 3 navigation group terpisah

## Cons

**Option C (Three-Way Split):**
- Memerlukan pembuatan modul baru (`settings/`) dan relokasi `SettingsController` — effort Medium
- Pembuatan interface contracts (`IMasterDataQueryService`) mengubah pola akses dari 3 modul (Order, LabWorkflow, Payment) yang saat ini menggunakan Prisma langsung — effort Medium
- Relokasi opsional `region/` ke `master-data/` mengubah import paths — risiko minor
- Migration Impact 2 fitur bernilai Medium (Region dan SMTP Settings), sisanya Low
- Tidak ada breaking change pada API contract karena route paths tidak berubah

## Selected

**Option C — Three-Way Bounded Context Split**

Dipilih berdasarkan:
1. **Pelanggaran SRP yang teridentifikasi:** `notification/` modul melayani 2 bounded context berbeda (severity: High)
2. **3 cross-context violations** (severity: Medium) dimana Order, LabWorkflow, dan Payment mengakses Master Data langsung via Prisma tanpa interface contract
3. **Data governance alignment:** 12 Master Data entities memiliki lifecycle yang homogen (rarely changed, admin-owned, referenced by many) — membentuk satu bounded context kohesif
4. **0 breaking changes:** Semua API routes tetap sama (`/api/v1/master/*`, `/api/v1/settings/*`, `/api/v1/users`)
5. **Module isolation score** meningkat dari 59% ke >80% setelah separation

## Consequence

1. `SettingsController` dan `SettingsService` dipindahkan ke modul top-level baru `apps/api/src/settings/` — modul `notification/` hanya berisi delivery services (email, WhatsApp, PDF)
2. `IMasterDataQueryService` interface dibuat untuk menyediakan read-only access ke Master Data bagi consuming contexts — menggantikan akses Prisma langsung
3. `region/` secara opsional direlokasi ke dalam `master-data/` bounded context (atau dideklarasikan sebagai bagian dari bounded context yang sama via shared module registration)
4. Setiap bounded context memiliki modul NestJS sendiri dengan interface contract yang terdefinisi jelas
5. Tidak ada perubahan pada database schema — pemisahan ini murni pada level modul/service
6. API route paths tidak berubah — backward compatibility 100%

## Future Consideration

- Jika Operational Configuration (notification templates, workflow SLA rules) diimplementasikan di masa depan, entitas tersebut masuk ke bounded context `settings/` yang sudah terpisah — tanpa mengganggu Master Data
- Interface `IMasterDataQueryService` membuka kemungkinan caching layer (Redis) di depan Master Data queries — read-heavy pattern yang umum untuk reference data
- Jika sistem berkembang ke multi-tenant/multi-branch, bounded context separation memudahkan per-tenant data isolation rules yang berbeda per context
- Pemisahan ini menjadi prasyarat untuk Approval Matrix pada master data critical entities (Tariff, Insurance, Lab Tests) di mana perubahan memerlukan approval workflow terpisah dari settings changes

