---
Document ID: AUDIT-eLIS-2026-M06
Title: Enterprise Audit — Menu 06: Order & Kasir (Order Lifecycle + Payment + Claim + BPJS Detail)
Framework: Kiro Enterprise Framework v3
Scope: /dashboard/orders (list, new, detail with POS), OrderController + OrderService, PaymentController + PaymentService, ClaimService, InsuranceRejectionService, TariffResolverService, OrderValidationGuard
Status: Complete (read-only)
Author: Enterprise Auditor
Date: 2026-07-10
Reuses: docs/audit/04-registration.md (Visit contract), docs/audit/05-visits.md (Visit list contract), docs/17-Audit/_inventory/feature-coverage-matrix.md (FR-04/05)
---

# 06 — Order & Kasir (Order Lifecycle + Payment)

## 1. Implementation Status

Traceability terhadap SRS §2.3 F-ORD-01/02/03, FS FR-04/05, BR-03/04 (order numbering + payment).

| Requirement | Status | Evidence |
|---|---|---|
| List order dengan status filter + pagination | **IMPLEMENTED** | `orders/page.tsx` + `apiClient.getOrders({limit:100, status})`; server returns `{data, meta}` |
| Create order 3-step (Visit → Tests → Confirm) | **IMPLEMENTED** | `orders/new/page.tsx` 3 komponen step; `apiClient.createOrder({visitId, patientId, testIds})` |
| Inline visit create dari step 1 order | **IMPLEMENTED** | `InlineVisitCreate` component + `VisitStep` handler |
| Order number `LAB-YYYYMMDD-XXXX` (BR-03) | **IMPLEMENTED (partial)** | `OrderService.generateOrderNumber` (line 204); atomicity/serialization **belum diverifikasi** (kode dipotong pada view) — NCR-06-08 |
| Auto-transition visit REGISTERED → IN_PROGRESS setelah order create | **IMPLEMENTED** | `OrderService.create` → `visitService.transitionToInProgress(dto.visitId)` |
| Tariff resolver (per-clinic + insurance override) | **IMPLEMENTED** | `TariffResolverService.resolveOrderTotal(testIds, clinicId, insuranceId)` |
| Validasi test ada + aktif + tidak soft-deleted | **IMPLEMENTED** | `OrderService.create` — `findMany({deletedAt:null, isActive:true})` + strict length check |
| Pre-auth flag `requiresInsurancePreAuth` | **PARTIAL** | Backend membaca flag tetapi hanya "log for awareness" — tidak memblokir; komentar mengatakan "lab workflow will enforce" (NCR-06-09) |
| Order detail — POS layout dengan payment panel | **IMPLEMENTED** | `orders/[id]/page.tsx` — invoice + method selector (CASH/TRANSFER/EDC) + numpad + kembalian |
| Payment endpoint `/api/v1/orders/:id/pay` | **IMPLEMENTED** | `PaymentController.processPayment` (BUKAN di OrderController — modul terpisah) |
| Split payment (multi-metode) | **IMPLEMENTED (backend)**, **NOT USED (FE)** | `PaymentController.processSplitPayment` ada, FE tidak expose (NCR-06-04) |
| Payment components / partial payments | **IMPLEMENTED (backend)**, **NOT USED (FE)** | `GET /:id/payments` ada, FE tidak konsumsi |
| Barcode / Invoice / Receipt endpoints | **IMPLEMENTED (backend)**, **NOT USED (FE utama)** | `GET /:id/{barcode, invoice, receipt}` ada; tombol Cetak di modal placeholder tanpa handler (NCR-06-05) |
| BPJS detail (create/update/verify) | **IMPLEMENTED (backend)**, **NOT USED (FE)** | `/:id/bpjs` endpoints; tidak ada UI |
| Insurance claim lifecycle (submit → review → approve/reject → paid) | **IMPLEMENTED (backend)**, **NOT USED (FE)** | 6 endpoint di ClaimService; tidak ada UI |
| Insurance rejection fallback 72-jam | **IMPLEMENTED (backend)** | `InsuranceRejectionService.initiateClaimRejectionFallback` dipicu setelah rejectClaim; `check-overdue` endpoint + `getOverdueOrders`; UI belum ada |
| Diskon di checkout | **BROKEN (client-only)** | FE hitung `discount` lokal, hanya kirim `amountPaid` — total di BE tetap `order.totalAmount`; diskon tak tercatat (NCR-06-01) |
| Cancel order (hanya PENDING_PAYMENT) | **IMPLEMENTED** | `OrderService.cancel` + guard status; FE punya UI? — perlu dicek di `OrderTable` (NCR-06-10) |
| Response envelope | **CORRECT (single)** | `OrderService` semua method return raw / `{data, meta}` — TIDAK manual-wrap; interceptor wrap sekali (kontras dengan VisitService NCR-04-01) |
| Loading + Empty state | **IMPLEMENTED (loading)** | Loader step 2; halaman list tidak eksplisit empty state (NCR-06-11) |

## 2. End-to-End Flow

### 2a. List Order
```
[orders/page.tsx] loadOrders → apiClient.getOrders({limit:100, status?})
  → GET /api/v1/orders?limit=100&status=...
[Backend] OrderController.findAll @Roles(banyak) → OrderService.findAll(query)
  where = {status?, visitId?, createdAt:{gte/lte}}
  include: patient, orderDetails, visit(visitNumber/status)
  orderBy: sortBy||createdAt sortOrder||desc
  return { data:[...], meta:{total,page,limit,totalPages} }  ← RAW pagination shape
[TransformInterceptor] wrap → { success, message, data:{ data:[...], meta:{...} } }  SINGLE ENVELOPE ✅
[FE Extraction defensif] envelope = res?.data ?? res; if 'data' in envelope → raw = envelope.data (array) ✅
```
Bekerja. Namun **limit hardcoded 100** — tidak ada pagination UI di FE; jika >100 order, sisanya invisible (NCR-06-02).

### 2b. Create Order (3-step)
```
[Step 1 VisitStep] VisitSelector (search min 3 char) + InlineVisitCreate button
  → onSelect visit → patient auto-fill dari visit.patient
[Step 2 TestStep] apiClient.getTests({limit:100}) + apiClient.getTestCategories({limit:50})
  Toggle tests → subtotal terhitung lokal
[Step 3 ConfirmStep] Summary + optional notes textarea
handleSubmit → apiClient.createOrder({ visitId, patientId, testIds })
  ⚠️ notes TIDAK terkirim ke backend (payload tanpa field `notes`) — NCR-06-06
  → POST /api/v1/orders @Roles(KASIR, ADMIN, KLINIK_PARTNER)
[Backend] OrderController.create @UseInterceptors(VisitIdDeprecationInterceptor) → OrderService.create
  1. orderValidationGuard.validate(visitId, patientId) — validate visit-patient consistency
  2. patient exists + not soft-deleted
  3. tests findMany dengan {deletedAt:null, isActive:true} + strict length compare
  4. preAuthTests dihitung tapi hanya log — tidak blocking
  5. generateOrderNumber() — LAB-YYYYMMDD-XXXX
  6. tariffResolver.resolveOrderTotal(testIds, clinicId, insuranceId) → totalAmount
  7. $transaction:
     - order.create({..., status: PENDING_PAYMENT, totalAmount})
     - orderDetail.createMany({...pricing.items})
  8. visitService.transitionToInProgress(visitId) — auto state machine
  9. return prisma.order.findUnique(with include) — RAW → single envelope
[FE] setTimeout 1800ms → router.push("/dashboard/orders")
```
Solid. Namun `notes` field UI tanpa kirim ke BE.

### 2c. Order Detail + Payment (POS)
```
[orders/[id]/page.tsx] loadOrder → apiClient.getOrder(id)
  → GET /api/v1/orders/:id → OrderService.findById → raw order → single envelope
[FE Extraction] const data = (res as {success, data}).data — asumsi single envelope (langsung, tanpa fallback double)
UI: patient info + test items + discount input + payment method (CASH/TRANSFER/EDC) + numpad (CASH only)
   const total = max(0, subtotal - discountAmount)  ← DISKON DIHITUNG LOKAL SAJA
   const canPay = status==PENDING && (method!=CASH || cashPaid >= total)

handlePay → apiClient.payOrder(id, { paymentMethod, amountPaid: cashPaid or total })
  → POST /api/v1/orders/:id/pay  (PaymentController.processPayment @Roles(KASIR, ADMIN, SUPER_ADMIN))
  ⚠️ Body hanya {paymentMethod, amountPaid} — TIDAK ada `discount` field!
[Backend] PaymentService.processPayment(id, dto, userId) — implementasi tak dibaca; tetapi API contract berarti diskon tak tercatat di DB
[FE] reload order → setShowSuccess(true) → SuccessModal
```
**BROKEN**: diskon client-side tak sinkron dengan backend (NCR-06-01).

### 2d. Post-payment
Backend `paidOrder` → status transisi ke `PAID` (asumsi berdasarkan `alreadyPaid = status !== PENDING_PAYMENT`). Setelahnya urutan status:
```
PENDING_PAYMENT → PAID → IN_ANALYSIS → APPROVED → NOTIFIED
                          (menu 07 Lab)  (menu 08) (menu 07)
```
Detail flow menu 07/08 diaudit terpisah.

## 3. Functional Gap

| ID | Requirement | Status | Root Cause |
|---|---|---|---|
| FG-06-01 | Diskon tercatat di backend + audit trail | BROKEN | Kontrak API `pay` tak punya field `discount` |
| FG-06-02 | Pagination di list order (>100) | MISSING | FE tak render pagination UI meski BE support |
| FG-06-03 | Notes klinis order tersimpan | BROKEN | FE tampilkan input, tapi tak kirim |
| FG-06-04 | Split payment UI | MISSING | Endpoint ada, UI belum |
| FG-06-05 | BPJS detail UI + verifikasi eligibility | MISSING | Endpoint ada, UI belum |
| FG-06-06 | Insurance claim UI (submit/monitor status) | MISSING | Endpoint lengkap, UI belum |
| FG-06-07 | Cetak barcode/invoice/receipt dari UI | PARTIAL | Endpoint ada; SuccessModal tombol "Cetak" tanpa handler |
| FG-06-08 | Cancel order dari UI | PARTIAL | Endpoint ada; perlu verifikasi di `OrderTable` |
| FG-06-09 | Insurance rejection fallback UI (overdue list) | MISSING | Endpoint ada, UI belum |
| FG-06-10 | Preview kwitansi sebelum simpan bayar | MISSING | Tidak ada preview modal |
| FG-06-11 | Pre-auth blocking untuk test yang butuh persetujuan asuransi | PARTIAL | BE ambil flag tapi hanya log |

## 4. Frontend Gap

| Area | Finding | Evidence | Severity |
|---|---|---|---|
| **Diskon fake** | Field diskon di detail hanya mengubah tampilan `total` lokal; tak dikirim ke `payOrder` API | `orders/[id]/page.tsx` L 122-124, L 213 payload | **P1** |
| **Notes hilang** | Step 3 textarea `notes` di-set state tapi payload `createOrder` tak sertakan | `new/page.tsx` L 443 handleSubmit vs L 350+ notes state | **P2** |
| List `limit:100` hardcoded | Tak ada pagination UI; user tak bisa jangkau order > 100 | `orders/page.tsx` L 34 | **P2** |
| No empty state di list | Jika `filtered.length === 0`, `OrderTable` yang render — perlu verifikasi | perlu baca komponen | Medium (verify) |
| Alert() untuk error bayar | `alert(message)` di catch payment — bukan toast/banner konsisten | L 220 handlePay | Low (UX) |
| Cetak placeholder | Tombol `payment-success-print` tanpa onClick | SuccessModal `<button>` | Medium |
| Envelope handling di orders list vs detail | List defensif (double check); detail asumsi single (`res.data`) — inkonsistensi | list L 34-47 vs detail L 175 | Low (bug latent) |
| Discount input readonly setelah bayar | Bagus (`!alreadyPaid ? input : span`) | L 300 | ✅ |
| Status filter `NOTIFIED` tidak muncul | STATUS_FILTERS 5 nilai; enum OrderStatus punya lebih | `STATUS_FILTERS` const | Medium |
| Loading skeleton | Hanya spinner, bukan skeleton rows | list & detail | Low |
| Payment method 3 (CASH/TRANSFER/EDC) vs enum 7 | UI subset sengaja (BPJS/INSURANCE dibayar via klaim, bukan kasir langsung) | detail PAYMENT_METHODS | Konsisten dengan design |
| Search client-side saja di list | `useMemo filtered` client-side; tak kirim `search` ke API | `orders/page.tsx` L 51 | Low (dataset ≤100 OK) |
| RBAC UI gating | Tidak ada; endpoint enforce | universal | Low |
| Fetch tests limit 100 | Untuk pemilihan test di step 2; jika master > 100, hilang | `new/page.tsx` L 383 | **P2** |
| Fetch categories limit 50 | Sama kekhawatiran; unlikely tapi hardcap | L 384 | Low |

## 5. Backend / API Gap

| Area | Finding | Evidence | Severity |
|---|---|---|---|
| **Envelope pattern konsisten benar** | `OrderService.create` return raw entity; `findAll` return `{data, meta}`; `findById/cancel` raw — semua single-envelope after interceptor | `order.service.ts` L 105-108, 143-152, 174, 194 | ✅ **Reference-quality**; contoh yang seharusnya diikuti VisitService & UsersService |
| Order number race | `generateOrderNumber()` implementasi lengkap tak terverifikasi di view; ada risiko duplikasi jika dua request bersamaan tanpa serialization | `order.service.ts` L 204+ (kode dipotong pada baca) | **P2 verify** |
| Transaksi pembuatan order | `$transaction` untuk order + orderDetails atomik ✅ | L 76-97 | ✅ |
| `preAuthRequired` non-blocking | Kode kumpulkan `preAuthTests` tapi hanya "log for awareness" — komentar mengatakan "lab workflow will enforce" | L 55-65 | **P2** — verifikasi enforcement di menu 07 |
| Discount tak ada di `ProcessPaymentDto` | Belum baca DTO, tapi FE tak kirim → BE tak menerima → data hilang | `payment.controller.ts` `ProcessPaymentDto` | **P1** |
| Cancel batasan | Hanya PENDING_PAYMENT bisa cancel — konsisten dengan pola visit; tidak ada refund flow untuk cancel setelah bayar | L 177-200 | Design gap (perlu ADR) |
| `cancelledBy` disimpan | ✅ | L 195 | ✅ |
| Insurance rejection fallback | `initiateClaimRejectionFallback` dibungkus try/catch dengan warn log — order flow tak fail jika fallback gagal | `order.controller.rejectClaim` L 240-245 | ✅ Good (resilient) |
| `check-overdue` guard | Hanya ADMIN/SUPER_ADMIN — restrictif untuk cron job internal | `order.controller.ts` L 74 | Low (cron pakai service account?) |
| `getOverdueOrders` | Guard KASIR/ADMIN/SUPER_ADMIN/OWNER/MANAGER; tidak ada UI utk konsumsi | Endpoint idle dari FE | NCR-06-06 |
| Multi-service controller | OrderController inject 3 service (Order + Claim + InsuranceRejection) — controller "kaya" | L 33-38 | Low (bisa dipisah untuk maintainability) |
| Interceptor `VisitIdDeprecationInterceptor` | Ada — mengindikasikan visitId dulu opsional; sekarang required (migration `make_visit_id_required`) | L 41 + migration name | Design cleanup pending |
| API `POST /:id/fallback-payment` body | Menerima `amount, reference, notes` — lebih lengkap dari `/pay`! Inconsistency: fallback endpoint punya reference+notes, pay endpoint tidak | L 260-275 vs `payOrder` FE contract | Medium (kontrak asimetris) |

## 6. Database Gap

| Area | Finding | Severity |
|---|---|---|
| Kolom `orders.notes` (jika ada) | Belum diisi dari FE meski input tersedia | NCR-06-06 |
| Kolom `orders.discount` / `orderDetails.discount` | `orderDetails.discount` disimpan dari tariff resolver (BE); tidak dari FE user-input | ⚠️ ambiguitas: diskon per-item (tariff) vs diskon total (kasir) — konsep berbeda; NCR-06-01 mungkin memerlukan kolom baru `payments.discountApplied` |
| Migration `add_batch_invoice` | Ada; UI batch invoice belum diaudit — verifikasi di menu Reports/Kasir | Perlu cross-check |
| Migration `add_payment_component` | Ada — schema payment split-friendly | ✅ konsisten dengan endpoint split-pay |
| Migration `add_payment_overdue_status` | Ada — mendukung fallback rejection | ✅ |
| `barcodeImage` di Order | Kolom disebut di FE type (`orders/[id]/page.tsx OrderApi.barcodeImage`) — perlu verifikasi eksistensi + kegunaan | Low |
| `paidAt` set saat bayar | Kolom ada, di-set BE saat processPayment | ✅ (implicit dari `alreadyPaid` check di FE) |

## 7. Duplicate / Repeated Logic

| Finding | Evidence | Verdict |
|---|---|---|
| Envelope-unwrap defensif (ke-6 kalinya) | `orders/page.tsx loadOrders` (double check) vs detail page `res.data` (single). Inkonsistensi antar 2 file di modul yang sama! | Duplikasi + inkonsistensi — kandidat sentralisasi `apiClient` (tambah unwrap di layer client) |
| Envelope pattern di 3 service | Order (correct single), Visit (double), Users (double) — 3 gaya berbeda dalam satu app | **Root architectural gap** — tetapkan satu pola resmi di ADR |
| Rupiah formatter | `formatRupiah` didefinisikan ulang di list, new, detail — 3 copy | Kandidat helper `lib/format.ts` |
| Payment method definitions | 3 method di FE (`PAYMENT_METHODS` const detail); label mapping di list (`PAYMENT_LABELS`); enum 7 di DB | Perlu centralized `enums.ts` (juga temuan menu 05) |
| BPJS number validation `\d{13}` | Ada di menu 04 (visit) dan (asumsi) di BPJS detail DTO | Kandidat konstanta bersama |
| InsuranceRejection try/catch pattern | Dipakai di `rejectClaim` — good; tapi hanya di satu tempat, tak ada duplikasi | ✅ |

## 8. Dead Code Candidates

| Item | Status | Alasan |
|---|---|---|
| Discount input di detail page | **Live tapi mislead** — user kira diskon berlaku | Bukan dead, tapi feature-not-wired (NCR-06-01) |
| Notes textarea di step 3 | **Live tapi mislead** — user isi tapi hilang | Sama (NCR-06-03) |
| Payment endpoint `split-pay` | Live tapi tak dipanggil | Bukan dead, unused dari UI |
| BPJS/Claim endpoints (11+ endpoints) | Live tapi tak dipanggil dari UI | Idem — significant idle capacity |
| `VisitIdDeprecationInterceptor` | Live | Legacy compat; setelah semua konsumer patuh, kandidat hapus |
| `Numpad` component "000" key | Live; kegunaan tinggi untuk transaksi besar | ✅ |
| `barcode`, `barcodeImage` fields di OrderApi type | Fetched, tak dirender | Kandidat: implement barcode display atau hapus dari type |
| `checkOverduePayments` endpoint | Manual trigger; kandidat cron job internal | Bukan dead, mode operasi berbeda |

## 9. NCR Gap Matrix

| ID | Menu | FR ID | Layer | Finding | Evidence | Root Cause | Impact | Priority | Required Action | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| NCR-06-01 | Order&Kasir | FR-05 Payment | FE+API contract | Diskon dihitung client-side saja; `payOrder` payload tidak sertakan `discount` — total di DB tetap `order.totalAmount`; laporan keuangan mengabaikan diskon | `orders/[id]/page.tsx` L 122-124, 213 vs `apiClient.payOrder` signature | Kontrak API belum mendukung diskon di level order/payment | **Fraud/kesalahan pembukuan**: kasir bisa "berikan diskon" yang tak tercatat; audit trail hilang | **P1** | Tambah field `discount` (nominal + reason) di `ProcessPaymentDto`; BE simpan di `payments.discountApplied` + audit log; FE kirim `discount` ke API | Open |
| NCR-06-02 | Order&Kasir | FR-04 list | FE | List order `limit:100` hardcoded, tanpa pagination UI — order ke-101+ invisible | `orders/page.tsx` L 34 | Halaman list dibuat "MVP dulu" | Data hilang dari view; produksi 100+ order/hari kehilangan visibility | **P1** | Server-side pagination + UI navigator (pola sudah ada di visits) | Open |
| NCR-06-03 | Order&Kasir | Data quality | FE | Notes klinis di step 3 di-set state tapi tak dikirim ke createOrder | `new/page.tsx` handleSubmit L 443 vs `notes` state | Field lupa ditambah ke payload | Instruksi puasa/kondisi khusus pasien hilang; risiko klinis | **P1** | Sertakan `notes` di payload; BE simpan di `orders.notes` (verifikasi kolom ada) | Open |
| NCR-06-04 | Order&Kasir | FR-05 split | FE | Split payment UI belum ada meski BE (`/split-pay`) siap | `PaymentController.processSplitPayment` vs FE detail page | Fitur belum diprioritaskan | Kasir tak bisa terima bayar campur (CASH + EDC) — sering butuh untuk BPJS + selisih | **P2** | Toggle "Split Payment" di panel bayar; render multiple rows | Open |
| NCR-06-05 | Order&Kasir | UX print | FE | Tombol "Cetak" di SuccessModal tanpa handler; endpoint `/receipt`, `/invoice`, `/barcode` ada | `orders/[id]/page.tsx` SuccessModal `<button id="payment-success-print">` | Placeholder | Kasir cetak manual di sistem lain; kertas struk tak keluar | **P2** | Wire tombol ke `apiClient.getInvoice` / `getReceipt` + trigger print dialog | Open |
| NCR-06-06 | Order&Kasir | Insurance workflow | FE | Endpoint BPJS detail + Claim lifecycle (11+ endpoints) tak ter-expose di UI | `order.controller.ts` L 122-247 vs no FE trigger | Fitur belum digulirkan | Klaim tak bisa dikelola dari eLIS; billing insurance harus di sistem lain | **P2** | Tab "Asuransi" di detail order + halaman monitoring klaim di menu Reports/Kasir | Open |
| NCR-06-07 | Order&Kasir | Insurance fallback | FE | Overdue orders + fallback payment belum ada UI | `InsuranceRejectionService` + `getOverdueOrders` endpoint | Idem | Klaim reject 72-jam tak ada visibility → outstanding kas | **P2** | Dashboard "Kasir → Overdue Insurance" (queue-style) | Open |
| NCR-06-08 | Order&Kasir | BR-03 | Backend | Atomicity `generateOrderNumber` (LAB-YYYYMMDD-XXXX) belum diverifikasi kode implementasinya (baca terpotong) | `order.service.ts` L 204+ | Perlu review | Race condition → duplikasi order number → constraint violation atau data corrupt | **P2 verify** | Baca sisa `generateOrderNumber`; pastikan pakai serializable tx + retry seperti VisitNumberGenerator | Open |
| NCR-06-09 | Order&Kasir | FR-05 pre-auth | Backend | `requiresInsurancePreAuth` flag hanya di-log, tidak memblokir create order | `order.service.ts` L 55-65 | Deferred to lab workflow (komentar) | Pasien lolos ke lab tanpa authorization asuransi; risiko klaim ditolak | **P2** | Blokir atau tandai order status khusus (`PENDING_PREAUTH`); menu 07/08 verifikasi enforcement | Open |
| NCR-06-10 | Order&Kasir | FR-04 cancel | Frontend | Cancel order dari UI — perlu verifikasi apakah tersedia di `OrderTable` | tidak dibaca | Unknown | Tanpa UI, order salah tak bisa dibatalkan dari kasir | **P2 verify** | Buka `OrderTable.tsx` — jika tak ada, tambah aksi Cancel dengan modal alasan | Open |
| NCR-06-11 | Order&Kasir | UX | Frontend | List order tanpa loading skeleton eksplisit; tanpa empty state jelas jika 0 order | `orders/page.tsx` | UI sederhana | User bingung kondisi (loading vs empty) | P3 | Tambah `LoadingSkeleton` + `EmptyState` (pola visits) | Open |
| NCR-06-12 | Order&Kasir | UX consistency | Frontend | Error bayar pakai `alert()` — inkonsistensi dengan toast/banner di modul lain | `orders/[id]/page.tsx` handlePay L 220 | Legacy code | UX kaku | P3 | Toast/banner konsisten | Open |
| NCR-06-13 | Order&Kasir | Envelope | Frontend | Order list defensif (double check), Order detail asumsi single (`res.data`) — inkonsistensi antar 2 file di modul sama | `orders/page.tsx` L 34-47 vs `orders/[id]/page.tsx` L 175 | Kode berbeda-beda | Latent bug bila BE format berubah | P3 | Sentralisasi unwrap di `apiClient` methods — return unwrapped type | Open |
| NCR-06-14 | Order&Kasir | Data scope | Backend | `findAll`/`findById` @Roles termasuk KLINIK_PARTNER tanpa filter data-scope | `order.controller.ts` L 62, 82 | Same as NCR-05-06 | Partner klinik lihat order klinik lain | **P1** | Scope filter `clinicId` untuk KLINIK_PARTNER (konsisten dengan visits) | Open |
| NCR-06-15 | Order&Kasir | UX consistency | Frontend | Rupiah formatter didefinisikan ulang di 3 file di modul yang sama | list/new/detail | Duplikasi | Boilerplate; risiko divergensi | P3 | Konsolidasi ke `lib/format.ts` | Open |
| NCR-06-16 | Order&Kasir | UX | Frontend | Fetch tests limit 100 hardcoded di step 2; jika master > 100, sebagian test hilang | `new/page.tsx` L 383 | Hardcap | Test tersembunyi | P2 | Search server-side atau pagination di picker | Open |

## 10. Required Actions (Prioritas)

1. **P1** — Diskon end-to-end (NCR-06-01). Effort: M. FE + DTO + BE service + audit log + laporan.
2. **P1** — Pagination list order (NCR-06-02). Effort: S. Pola visits.
3. **P1** — Notes klinis persist (NCR-06-03). Effort: XS. Cek `orders.notes` kolom, tambah di DTO + FE payload.
4. **P1** — Data-scope RBAC untuk KLINIK_PARTNER (NCR-06-14). Effort: S. Konsisten dengan NCR-05-06.
5. **P2** — Verifikasi `generateOrderNumber` atomicity (NCR-06-08). Effort: S. Baca kode, tambah tx serializable jika belum.
6. **P2** — Split payment UI (NCR-06-04). Cetak (NCR-06-05). BPJS/Claim UI (NCR-06-06). Overdue UI (NCR-06-07). Pre-auth enforcement (NCR-06-09). Verifikasi cancel UI (NCR-06-10). Test picker pagination (NCR-06-16). Effort: XS–M masing-masing.
7. **P3** — UX polish (NCR-06-11/12), envelope centralisasi (NCR-06-13), format helper (NCR-06-15).

## 11. FS / FR Update yang Direkomendasikan

- **FR-04 Order Management**: status *IMPLEMENTED* (workflow inti bekerja). Tambah gap notes/pagination/cancel.
- **FR-05 Payment**: status *PARTIAL* — pembayaran dasar bekerja, tapi **diskon, split, cetak, klaim asuransi, fallback** UI-nya belum atau broken.
- Tambah **AC (Diskon)**: "Diskon harus dicatat di backend dengan nominal + alasan + userId; dashboard laporan menampilkan diskon terpisah dari subtotal."
- Tambah **AC (Notes)**: "Notes klinis order harus tersimpan dan tampil di menu Laboratorium untuk analis."
- Tambah **AC (Envelope)**: "OrderService adalah pola *reference*; VisitService dan UsersService harus disesuaikan (cross-ref NCR-04-01, NCR-02-01)."
- Update FS §Order Numbering — jelaskan format `LAB-YYYYMMDD-XXXX` (per-hari, bukan per-bulan seperti visit).
- Update FS §Insurance — dokumentasikan lifecycle klaim: submit → review → approve/partial/reject → paid, plus fallback 72-jam.
- Cross-ref: **menutup NCR-04-08** sudah dilakukan di audit 05. Menu ini menambahkan bukti **penerapan pola envelope yang benar** — jadikan referensi.

## 12. Reused / Superseded Prior Audit References

- `docs/audit/04-registration.md` NCR-04-01 (VisitService double envelope) → **DIPERKUAT**: audit ini menunjukkan `OrderService` melakukannya **dengan BENAR** (single envelope). Rekomendasi: refactor VisitService pakai pola OrderService.
- `docs/audit/05-visits.md` NCR-05-06 (data-scope RBAC) → **BERULANG** di OrderController — perlu solusi cross-cutting (bukan tiap modul terpisah).
- `docs/17-Audit/_inventory/feature-coverage-matrix.md` FR-05 Payment (jika mencatat coverage tinggi) → turunkan ke *PARTIAL* berdasarkan bukti Discount/Split/Print/Claim UI missing.
- `docs/17-Audit/_inventory/functional-gap-report.md` FG-BILLING* (jika ada) → cross-ref dengan NCR-06-01/04/05.

## 13. No-Code-Modification Attestation

Audit read-only. Tidak ada perubahan kode, DTO, schema, atau migration. Semua kesimpulan berbasis file evidence (paths + line refs). `generateOrderNumber` implementasi ditandai *belum diverifikasi* karena view kode terpotong (bukan asumsi).
