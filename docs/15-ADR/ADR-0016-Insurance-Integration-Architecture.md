# ADR-0016: Insurance Integration Architecture

## Context

Sistem eLIS dibangun untuk Enterprise Laboratory Information System yang melayani berbagai tipe pembayaran pasien: BPJS (asuransi kesehatan nasional Indonesia), Private Insurance (Swasta), Corporate Insurance, Cash, dan Self Pay. Audit kesiapan healthcare menunjukkan **overall readiness hanya 25%** — sistem belum siap untuk operasi healthcare enterprise.

Temuan kritis dari insurance readiness review:
- **Insurance Schema (40% ready):** Type enum constraint tidak ada, relasi M2M Patient-Insurance dan Order-Insurance tidak ada
- **Billing Workflow (20% ready):** Tidak ada claim reference, BPJS sepenuhnya absent, tidak ada batch invoicing
- **Payment Flow (10% ready):** Tidak ada split payment, tidak ada rejection handling, tidak ada multi-insurance per patient
- **Lab Workflow Integration (35% ready):** Tidak ada pre-authorization flag, tidak ada claim tracking
- **Receipt & Reporting (5% ready):** Tidak ada insurance-specific receipts

Total gap teridentifikasi: 15 gap, estimasi remediasi: 98-128 person-days.

Dokumen referensi:
- `docs/17-Audit/insurance-readiness.md`

## Problem

Menentukan arsitektur integrasi insurance yang dapat mendukung seluruh payment flow healthcare (BPJS, Private, Corporate, Cash, Self Pay) termasuk split payment, multi-insurance per patient, claim lifecycle tracking, insurance rejection handling, dan BPJS-specific requirements — dengan migration path yang backward-compatible dari state saat ini.

## Alternative

- **Option A — Incremental Patching:** Menambahkan field-field yang kurang (claimReference, sepNumber, dll) langsung ke model Order dan Patient yang ada. Tidak ada entitas baru. Split payment ditangani dengan multiple columns pada Order (insuranceAmount, cashAmount).
- **Option B — Junction Table Architecture:** Memperkenalkan junction entities baru (`PatientInsurance`, `OrderInsurance`, `PaymentComponent`, `BpjsOrderDetail`) yang memungkinkan relasi many-to-many, composition pattern untuk payments, dan isolasi BPJS-specific fields. Backward-compatible: FK lama dipertahankan sebagai deprecated selama transisi.
- **Option C — Separate Insurance Microservice:** Mengekstrak seluruh insurance domain ke microservice terpisah dengan own database, API gateway routing, dan event-driven communication untuk claim lifecycle. Full decoupling dari core LIS.

## Pros

**Option B (Junction Table Architecture):**
- Mendukung multi-insurance per patient (1-5 records) dan per order (primary/secondary) melalui junction tables — menyelesaikan gap INS-SCH-002 dan INS-SCH-003
- `PaymentComponent` entity memungkinkan split payment dengan composition pattern — jumlah komponen fleksibel, bukan hardcoded 2-3 columns
- BPJS-specific fields diisolasi di `BpjsOrderDetail` — tidak mencemari Order model utama dengan nullable fields yang hanya relevan untuk BPJS
- Claim lifecycle (`ClaimStatus` enum: PENDING → SUBMITTED → UNDER_REVIEW → APPROVED → REJECTED → PAID) dengan full audit trail
- Backward-compatible: `Patient.insuranceId` dan `Order.insuranceId` dipertahankan sebagai deprecated — existing code tetap berfungsi selama transisi
- PaymentMethod enum diperluas secara additive (INSURANCE_CASH_FALLBACK, EDC, CORPORATE_DEFERRED) — existing values tidak berubah
- Mendukung 72-hour rejection fallback workflow dengan time-based enforcement via scheduled job
- Skema tarif differential per insurance sudah ada (`TariffResolverService`) — hanya perlu integrasi dengan OrderInsurance junction

## Cons

**Option B (Junction Table Architecture):**
- Estimasi total effort: 98-128 person-days (multi-sprint implementation)
- 5+ tabel baru: `PatientInsurance`, `OrderInsurance`, `PaymentComponent`, `BpjsOrderDetail`, `BatchInvoice`
- Data migration diperlukan untuk memindahkan existing FK data ke junction tables
- BPJS API integration memerlukan external service connection dan error handling untuk upstream unavailability
- Scheduled job (72-hour payment window) menambah infrastructure complexity (cron/job scheduler)
- Frontend form complexity meningkat signifikan (multi-insurance selection, split payment UI, claim management dashboard)
- `TariffResolverService` perlu diperluas untuk consider primary insurance first → secondary coverage
- Dual-source-of-truth selama migration period (deprecated FK + junction table)

## Selected

**Option B — Junction Table Architecture**

Dipilih berdasarkan:
1. **Proporsional terhadap kebutuhan:** 15 gap teridentifikasi memerlukan arsitektur yang solid tapi tidak over-engineered. Junction tables adalah pattern yang proven untuk M2M healthcare relationships (patient-insurance, order-insurance, payment composition).
2. **Option A insufficient:** Column-based approach tidak scalable — split payment dengan 2-3 fixed columns tidak mendukung skenario 3+ payment components. Nullable BPJS fields pada Order model menciptakan sparse columns untuk non-BPJS orders (majority use case).
3. **Option C excessive:** Microservice extraction prematur — sistem masih modular monolith (ADR-0001). Overhead network latency, eventual consistency, dan distributed transactions tidak justified untuk satu domain. Insurance domain masih tightly coupled dengan Order dan Payment workflows.
4. **Backward compatibility:** Junction table approach memungkinkan gradual migration tanpa breaking existing API contracts — FK lama coexist dengan junction tables sampai fully deprecated.
5. **BPJS compliance path:** `BpjsOrderDetail` entity menyediakan slot untuk SEP number, verification status, referring facility code, dan class level — seluruh mandatory BPJS fields terisolasi dari core Order model.
6. **Industry alignment:** Payment composition pattern (PaymentComponent entity) adalah standar di healthcare billing systems — mendukung insurance + cash, primary + secondary, dan corporate deferred scenarios.

## Consequence

1. **Schema additions (Phase 1 — Critical, 6-8 minggu):**
   - `PatientInsurance` junction: patientId, insuranceId, priority (1-5), memberNumber, validFrom, validUntil, isActive
   - `OrderInsurance` junction: orderId, insuranceId, coverage (PRIMARY/SECONDARY), claimReference (VARCHAR 50), coveredAmount, claimStatus, rejectedAt, rejectionReason
   - `PaymentComponent`: orderId, paymentMethod, amount, insuranceId (optional), reference, createdAt
   - `ClaimStatus` enum: PENDING, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, PAID
   - `InsuranceType` enum constraint: BPJS, SWASTA, CORPORATE (mengganti free-text String?)
   - `PaymentMethod` enum extended: + INSURANCE_CASH_FALLBACK, EDC, CORPORATE_DEFERRED

2. **BPJS Integration (Phase 2 — High, 4-6 minggu):**
   - `BpjsOrderDetail` entity: sepNumber (VARCHAR 19), bpjsVerificationStatus, referringFacilityCode, bpjsClassLevel (1/2/3)
   - `BpjsModule` dengan eligibility check service dan SEP validation
   - Pre-authorization flag (`requiresInsurancePreAuth`) pada TestMaster

3. **Payment & Billing (Phase 3 — Medium, 4-6 minggu):**
   - `BatchInvoice` entity untuk corporate insurance batch billing (≤500 orders per cycle)
   - `ReceiptService` dengan template-based generation (CashReceipt, InsuranceReceipt, CorporateReceipt)
   - Insurance rejection → 72-hour cash fallback scheduled job
   - Insurance-specific reporting filters pada OrderQueryDto

4. **Backward compatibility measures:**
   - `Patient.insuranceId` dan `Order.insuranceId` deprecated tapi retained — data migrated to junction tables
   - Existing `processPayment()` endpoint tetap menerima single-component payment (backward-compat mode)
   - PaymentMethod enum values CASH, TRANSFER, INSURANCE tidak berubah

5. **Frontend impact:** Multi-insurance patient form, split payment UI, claim management dashboard, insurance-specific receipt display.

## Future Consideration

- Setelah BPJS API integration stabil, evaluasi INA-CBGs code mapping untuk automated claim submission — mengurangi manual entry dan claim rejection rate
- Coordination of Benefits (COB) logic untuk primary exhaustion → secondary trigger workflow — diperlukan saat multi-insurance per order aktif
- Real-time eligibility checking via BPJS API sebelum order creation — mengeliminasi claim rejection post-service
- Insurance analytics dashboard: claim approval rate, average turnaround time, rejection reasons, revenue per payer — memerlukan data dari `OrderInsurance` claim lifecycle
- Jika volume transaksi meningkat signifikan (>10,000 claims/month), pertimbangkan event-driven claim processing queue (Redis/RabbitMQ) untuk decouple claim submission dari order workflow
- Corporate billing module dapat diperluas dengan contract management (tariff agreements per corporate client, discount tiers, billing cycle configuration)

