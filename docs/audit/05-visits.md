---
Document ID: AUDIT-eLIS-2026-M05
Title: Enterprise Audit — Menu 05: Kunjungan (Visit Management List + Detail)
Framework: Kiro Enterprise Framework v3
Scope: /dashboard/visits list page, /dashboard/visits/new (redirect), (missing) /dashboard/visits/[id] detail page, SearchableDropdown component, VisitController findAll/findById/update/cancel endpoints
Status: Complete (read-only)
Author: Enterprise Auditor
Date: 2026-07-10
Reuses: docs/audit/04-registration.md (VisitService envelope + create path already audited), docs/17-Audit/_inventory/feature-coverage-matrix.md (FR-04 Visit Management)
---

# 05 — Kunjungan (Visit Management)

## 1. Implementation Status

Traceability terhadap SRS §2.3 F-VIS-02, FS FR-04 (Visit Management), visit-management spec.

| Requirement | Status | Evidence |
|---|---|---|
| List kunjungan dengan pagination server-side | **IMPLEMENTED** | `visits/page.tsx` `loadVisits` + `apiClient.getVisits({page,limit,...})`, PAGE_SIZE=20 |
| Search (nama pasien / MRN / nomor kunjungan) — debounce 300ms | **IMPLEMENTED** | `page.tsx` useEffect setTimeout 300ms + `debouncedSearch` state |
| Status filter (ALL/REGISTERED/IN_PROGRESS/COMPLETED/CANCELLED) | **IMPLEMENTED** | `STATUS_FILTERS` array + button group |
| Date range filter (registrationDate) | **IMPLEMENTED** | Start/End date inputs + reset button; BE handles inclusive T23:59:59.999Z |
| Reset page saat filter berubah | **IMPLEMENTED** | Dua useEffect: search debounce reset page 1, filters change reset page 1 |
| Redirect `/dashboard/visits/new` → `/dashboard/registration` | **IMPLEMENTED** | `visits/new/page.tsx` — server-side `redirect()` |
| **Detail kunjungan (view)** | **BROKEN / MISSING** | Folder `visits/` hanya berisi `page.tsx` dan `new/`. **Tidak ada `[id]/page.tsx`**. Tombol "Detail" di tabel dan link "Lihat Detail" dari success card menu 04 → **404** (NCR-05-01) |
| **Update kunjungan dari UI** | **NOT USED** | Endpoint `PUT /visits/:id` ada di controller (audit 04), tapi **tidak ada tombol/form** di UI (NCR-05-02) |
| **Cancel kunjungan dari UI** | **NOT USED** | Endpoint `POST /visits/:id/cancel` ada, tidak dipanggil dari FE (NCR-05-03) |
| Loading state | **IMPLEMENTED** | `LoadingSkeleton` component saat `loading=true` |
| Empty state | **IMPLEMENTED** | `EmptyState` — differentiated per konteks search vs no-data |
| Pagination UI dengan ellipsis | **IMPLEMENTED** | `getPageNumbers` helper untuk max 7 halaman terlihat |
| Error state (fetch gagal) | **PARTIAL** | Catch `{}` → set visits=[], total=0 → user melihat empty state tanpa tahu ini error (NCR-05-04) |
| Payment method label lengkap | **BROKEN** | `PAYMENT_LABELS` hanya cover 4 dari 7 nilai enum; visit dengan method EDC/INSURANCE_CASH_FALLBACK/CORPORATE_DEFERRED tampil raw (NCR-05-05) |
| RBAC UI (hide row actions untuk role tertentu) | **MISSING** | Semua role melihat kolom Aksi + Detail | (NCR-05-08) |
| Envelope handling defensif | **IMPLEMENTED (workaround)** | `envelope = res?.data ?? res` → cek `data` property; sama defensif seperti registration (menutupi NCR-04-01) |

## 2. End-to-End Flow

### 2a. List + Filter + Search
```
[visits/page.tsx]
  state: search, debouncedSearch, statusFilter, startDate, endDate, page
  useEffect setTimeout 300ms → setDebouncedSearch + setPage(1)
  useEffect [filters] → setPage(1)
  useEffect loadVisits deps [page, debouncedSearch, statusFilter, startDate, endDate]

loadVisits →
  apiClient.getVisits({ page, limit:20, search?, status?, startDate?, endDate? })
  → GET /api/v1/visits?page=X&limit=20&search=...&status=...&startDate=...&endDate=...
[Backend] VisitController.findAll @UseGuards(JwtAuthGuard) (tanpa RolesGuard → SEMUA authenticated user)
  → VisitService.findAll(query: VisitQueryDto)
    where = { OR:[patient.name contains, patient.mrn contains, visitNumber contains], status, registrationDate:{gte/lte} }
    include: { patient:{id,name,mrn}, doctor:{id,name}, clinic:{id,name}, insurance:{id,name} }
    orderBy: registrationDate desc, take min(limit,100)
  → return { success, message, data:[...], meta:{total,page,limit,totalPages} }  ← MANUAL WRAP
[TransformInterceptor] wrap AGAIN → { success, message, data:{ success, message, data:[...], meta:{...} } }
  ⚠️ DOUBLE ENVELOPE (sudah dilaporkan NCR-04-01)
[FE Extraction defensif]
  envelope = res?.data ?? res  → outer
  if 'data' in envelope → raw = envelope.data (array)
  if 'meta' in envelope → meta = envelope.meta
  map ke Visit[] → setVisits
```
Bekerja. Filter server-side, pagination sesuai; performa OK untuk dataset ≤10k baris.

### 2b. Tombol "Registrasi Kunjungan"
```
Link href="/dashboard/registration" → menu 04 workflow
```
Bekerja (integrasi cross-menu).

### 2c. `/dashboard/visits/new` alias
```
[visits/new/page.tsx] server-component → redirect("/dashboard/registration")
```
Bekerja. Alias URL bersih untuk bookmarks lama.

### 2d. Tombol "Detail" di tabel
```
[table row] <Link href={`/dashboard/visits/${visit.id}`}>Detail</Link>
```
**BROKEN**. Route `/dashboard/visits/[id]` tidak ada. Next.js akan render 404 Not Found. Cross-cutting dengan NCR-04-08 di menu 04 (link dari success card).

### 2e. Update / Cancel (via UI)
Tidak ada trigger UI. Endpoint sepenuhnya idle dari FE. Bisa dipanggil hanya via API client (Postman/curl).

## 3. Functional Gap

| ID | Requirement | Status | Root Cause |
|---|---|---|---|
| FG-05-01 | Detail kunjungan (view + related orders) | BROKEN | Route file belum dibuat; `VisitService.findById` sudah return orders subset |
| FG-05-02 | Update payment method / doctor / clinic dari UI | MISSING | Tidak ada modal edit di list |
| FG-05-03 | Cancel visit dari UI dengan alasan | MISSING | Endpoint ada, UI tidak ada |
| FG-05-04 | Feedback error saat fetch list gagal | PARTIAL | Silent fallback ke empty state |
| FG-05-05 | Label payment method lengkap untuk 7 enum values | BROKEN | Enum extended tanpa update FE labels |
| FG-05-06 | Kolom insurance / BPJS number di list | PARTIAL | Data ada di include, tidak ditampilkan di tabel |
| FG-05-07 | Export list visit (CSV/Excel) | MISSING | Tidak ada tombol |
| FG-05-08 | Aksi cepat inline (misal: "Buat Order" langsung) | MISSING | Alur harus buka detail → order |
| FG-05-09 | Real-time / auto-refresh saat visit baru | MISSING | Tidak ada polling/websocket |
| FG-05-10 | Sorting per-kolom | MISSING | Fixed sort by registrationDate desc |

## 4. Frontend Gap

| Area | Finding | Evidence | Severity |
|---|---|---|---|
| **Broken "Detail" link** | Table row action tombol Detail → 404 karena `[id]/page.tsx` tidak ada | `page.tsx` L 269 `<Link href="/dashboard/visits/${visit.id}">Detail</Link>` + `visits/` folder tak punya `[id]/` | **P1** |
| Error tak terkomunikasi | `catch {}` → visits=[]→ empty state; user kira tidak ada data | `loadVisits catch` block | Medium |
| Payment label incomplete | `PAYMENT_LABELS` 4 dari 7 enum values | `page.tsx` L 63-68 vs schema.prisma L 123-131 | Medium |
| Insurance/BPJS column absent | Kolom `bpjsNumber` sudah di-fetch di state, tidak ditampilkan | `Visit` interface + tabel headers | Low (design choice) |
| Kolom Aksi hanya "Detail" | Tidak ada Cancel/Edit inline | tabel `<td>` action | Medium (UX) |
| No RBAC UI gating | `visits/page.tsx` tak cek role; endpoint findAll `@UseGuards(JwtAuthGuard)` saja (semua authenticated) — konsisten dengan intent read-all | `visit.controller.ts` L 44 | Low (design) |
| Filter dropdown scroll horizontal | Status filter `overflow-x-auto` untuk small screens — OK | line 172 | ✅ |
| Reset filter button | Muncul hanya untuk date range, tidak untuk search/status combined | line 200 | Low (UX) |
| Debounce search konsisten dengan modul lain | 300ms sama seperti patients/registration | ✅ | ✅ |
| Loading skeleton | Menggunakan spinner satu-blok, bukan skeleton row — istilah "Skeleton" pada nama komponen menyesatkan | `LoadingSkeleton` function | Low (naming) |
| `SearchableDropdown` fetch spam | Tiap keystroke di query → `useEffect [isOpen, query]` → refetch tanpa debounce | `SearchableDropdown.tsx` L 62-66 | **Medium** (perf; digunakan di menu 04 juga) |
| SearchableDropdown outside-click | Handler pakai `mousedown` — bagus (menang atas click di button) | L 68-75 | ✅ |
| SearchableDropdown accessibility | Tidak ada `role="combobox"`, `aria-expanded`, `aria-activedescendant` | keseluruhan komponen | Medium (a11y) |
| SearchableDropdown clear button | `<span role="button" onClick>` — bukan `<button>`; keyboard user tak bisa Tab+Enter | L 121 | Medium (a11y) |
| Pagination visual | Nomor halaman + ellipsis pattern; max 7 tombol; page reset saat filter | `getPageNumbers` | ✅ Good |

## 5. Backend / API Gap

Sebagian besar sudah dilaporkan di **audit 04** (VisitService & VisitController). Yang spesifik untuk list-view:

| Area | Finding | Evidence | Severity |
|---|---|---|---|
| Envelope double-wrap `findAll` | `VisitService.findAll` return `{success,message,data:[...],meta:{...}}` + interceptor wrap → nested | `visit.service.ts` L 220-234 | Sudah dilaporkan NCR-04-01 |
| `findAll` guard authenticated-only | Tidak ada `@Roles` — semua user bisa list SEMUA visit; **KLINIK_PARTNER** bisa lihat visit dari klinik lain | `visit.controller.ts` L 43-45 | **P2** (data-scope leak; NCR-05-06) |
| `findOrdersByVisit` guard authenticated-only | Sama, semua user bisa lihat orders per visit tanpa scope | L 48-54 | P2 |
| `findById` guard authenticated-only | Semua user bisa lihat detail visit apa pun | L 57-60 | P2 |
| Pagination cap `min(limit,100)` | ✅ | L 175-176 | ✅ |
| Date parsing endDate `+T23:59:59.999Z` | Timezone-aware? UTC append → user Indonesia mengharap waktu lokal | L 196-199 | Low (edge: visit pukul 23:30 WIB tanggal N muncul di endDate=N di UTC) |
| Search insensitive contains | Pakai `mode:'insensitive'` (Postgres ILIKE via `pg_trgm`) — index `idx_patient_name_trgm` mempercepat | migration `add_patient_name_search_index` | ✅ Good |
| Include selective | Hanya id/name/mrn dipilih untuk relasi (bukan full include) → payload ringan | L 202-208 | ✅ Good |
| N+1 potensial | Include join dilakukan Prisma via single query — tidak N+1 | ✅ | ✅ |
| Empty visitNumber di response | Data return include visitNumber; FE map dengan default undefined-safe | ✅ | ✅ |
| Update/Cancel unreachable dari FE | Endpoint tidak dead karena bisa dipanggil via API client, tapi *unused-from-UI* | audit 04 §Actions | Sudah dilaporkan NCR-05-02/03 |

## 6. Database Gap

Tabel: `visits`, `visit_number_counters`, plus relasi `patients`/`doctors`/`clinics`/`insurances`.

| Area | Finding | Severity |
|---|---|---|
| Kolom `bpjsNumber` di visits | Ada, di-fetch, tidak di-render (kolom UI hilang) | Low — data-quality tak terganggu |
| Kolom `insurance` di join | Include ada di findAll, kolom UI tidak render | Low |
| Kolom `cancelledAt`, `cancelReason` | Ada + terisi via `cancel` endpoint; tidak ada UI trigger → kolom kemungkinan **selalu NULL di praktek** | Medium (data-not-captured runtime; NCR-05-07) |
| Index composite | `visits.registrationDate DESC` primary sort — tidak ada explicit index; Postgres default b-tree pada FK saja | Low (untuk N<100k baris cukup) |
| Composite index `(patientId, status, registrationDate)` untuk guard duplikat visit (NCR-04-04) | Belum ada | Rekomendasi masa depan |
| Enum `VisitStatus` | 4 nilai: REGISTERED/IN_PROGRESS/COMPLETED/CANCELLED — full-cover FE | ✅ |
| Enum `PaymentMethod` extended | 7 nilai di DB, 3 di UI create, 4 di UI list labels | Design drift (NCR-05-05) |

## 7. Duplicate / Repeated Logic

| Finding | Evidence | Verdict |
|---|---|---|
| Envelope-unwrap boilerplate ke-5 kalinya | `visits/page.tsx loadVisits` mirip pola `getPatients`, `fetchDoctors/Clinics/Insurances`, `PatientSearchStep.searchPatients` | Duplikasi semantik — konsolidasi via helper `unwrapApiListWithMeta<T>(res)` (perluas NCR-04-02) |
| Debounce 300ms di beberapa halaman | patients, registration-search, visits — semua re-implement useEffect+setTimeout | Kandidat custom hook `useDebouncedValue(value, delay)` |
| Payment method mapping | `PAYMENT_LABELS` di `visits/page.tsx` — kandidat dipindah ke `types/visit.ts` bersama enum | Duplikasi rendah, deferable |
| Loading spinner UX | Berbeda antara `LoadingSkeleton` (spinner satu blok) di visits vs skeleton rows lain — inkonsistensi visual | Style guide gap |
| Status labels/badges | Definisi label & style ada di banyak tempat (visits list, dashboard, doctor queue kalau ada) — kandidat shared component `<VisitStatusBadge>` | Verifikasi lintas menu; berpotensi duplikat |

## 8. Dead Code Candidates

| Item | Status | Alasan |
|---|---|---|
| Endpoint `PUT /visits/:id` (VisitController.update) | **Unreachable dari UI** | Tidak ada trigger FE; tetap bisa dipanggil via API | Bukan dead—perlu ada UI atau dokumentasikan sbg admin/API-only |
| Endpoint `POST /visits/:id/cancel` | Sama, unreachable dari UI | Idem |
| `PAYMENT_LABELS.TRANSFER` di visits list | Live | `TRANSFER` valid di enum, meski FE create tak expose |
| `bpjsNumber` di `Visit` state interface | Fetched, unused di render | Kandidat: tampilkan di kolom OR hapus dari state |
| `visits/new/page.tsx` redirect | Live | Alias URL yang berguna |
| `visitNumber` di search where clause backend | Live | Dipakai search di UI |
| Comment "Timezone-aware?" concern | N/A | Bukan dead code, gap perilaku |

## 9. NCR Gap Matrix

| ID | Menu | FR ID | Layer | Finding | Evidence | Root Cause | Impact | Priority | Required Action | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| NCR-05-01 | Kunjungan | FR-04 detail | Frontend | Halaman detail visit tidak ada — link Detail di list dan link Lihat Detail dari menu 04 → 404 | `apps/web/src/app/dashboard/visits/` tanpa `[id]/page.tsx`; `page.tsx` L 269 | Halaman belum di-implement | Kasir tak bisa lihat detail visit; workflow order buntu | **P1** | Buat `visits/[id]/page.tsx` yang render `findById` result + related orders + tombol Cancel/Update | Open (menutup NCR-04-08) |
| NCR-05-02 | Kunjungan | FR-04 update | Frontend | Tidak ada UI untuk update visit (payment method / doctor / clinic / bpjs) — endpoint idle | `visit.controller.ts` L 62-72 vs list page tanpa aksi edit | Fitur belum dibuat | Correction visit harus via SQL/API langsung | **P2** | Modal edit di detail page atau row action; validasi terminal-status | Open |
| NCR-05-03 | Kunjungan | FR-04 cancel | Frontend | Tidak ada UI untuk cancel visit dengan reason — endpoint idle | `visit.controller.ts` L 75-87 vs no FE trigger | Fitur belum dibuat | Visit salah tak bisa dibatalkan dari UI, `cancelReason` kolom kemungkinan NULL di produksi | **P2** | Tombol Cancel di detail dengan modal alasan | Open |
| NCR-05-04 | Kunjungan | UX | Frontend | Fetch error di-catch tanpa notifikasi → empty state menyesatkan | `page.tsx loadVisits catch {}` | Handler diam | User tidak tahu sistem down / auth expired | **P2** | Tambah state `error` + banner + tombol "Coba Lagi" | Open |
| NCR-05-05 | Kunjungan | FS §Payment | Frontend | Payment label incomplete — 3 enum values (EDC, INSURANCE_CASH_FALLBACK, CORPORATE_DEFERRED) tanpa label; tampil raw | `PAYMENT_LABELS` L 63-68 vs `enum PaymentMethod` schema.prisma L 123-131 | Enum di-extend tanpa update FE dictionary | UX: kasir bingung, konsistensi bahasa hilang | **P2** | Sinkronkan `PAYMENT_LABELS` full 7 values; consider central `enums.ts` | Open |
| NCR-05-06 | Kunjungan | RBAC / data scope | Backend | `findAll`/`findById`/`findOrdersByVisit` hanya JwtAuthGuard, tanpa filter data-scope (KLINIK_PARTNER lihat visit klinik lain) | `visit.controller.ts` L 43-60 | RBAC di-enforce hanya untuk write; read universal | Klinik partner A bisa akses data pasien Klinik B → **pelanggaran privacy** | **P1** | Tambah scope filter berdasarkan `user.role` + `clinicId` untuk KLINIK_PARTNER; RolesGuard whitelisted roles | Open |
| NCR-05-07 | Kunjungan | Data quality | Backend+DB | Kolom `cancelledAt`, `cancelReason` di-desain untuk trace, tapi tanpa UI trigger → kemungkinan selalu NULL di produksi | schema + visit.service.cancel + no UI | Feature incomplete | Audit trail cancellation tidak berjalan | **P2** | Terkait langsung dengan NCR-05-03; setelah UI cancel dibuat, kolom akan terisi | Open (tracks NCR-05-03) |
| NCR-05-08 | Kunjungan | RBAC UI | Frontend | Tidak ada gating role client-side di halaman | `visits/page.tsx` no role check | UI universal | Role terlarang bisa buka URL (dampak rendah karena API tetap enforce) | P3 | RequireRole HOC | Open |
| NCR-05-09 | Kunjungan | Component (Shared) | Frontend | `SearchableDropdown` fetch tanpa debounce → tiap keystroke query di dropdown refetch | `SearchableDropdown.tsx` L 62-66 | Missing debounce | Beban BE lebih besar; UX flicker | **P2** | Tambah 300ms debounce internal atau prop `debounceMs` (lintas guna: registration + visits) | Open |
| NCR-05-10 | Kunjungan | Accessibility | Frontend | `SearchableDropdown` tak punya aria attrs; clear button `<span role="button">` bukan `<button>` | L 121, keseluruhan | A11y kurang matang | Keyboard user tak bisa clear | P3 | Ganti ke `<button>` + tambah `role="combobox"`, `aria-expanded`, `aria-controls` | Open |
| NCR-05-11 | Kunjungan | Timezone | Backend | `endDate` di-append `T23:59:59.999Z` (UTC) — user WIB (+7) memilih tanggal N akan miss visit pukul 23:30 WIB tanggal N | `visit.service.findAll` L 199 | Tidak konversi timezone lokal | Filter tanggal ~1 jam off untuk edge times | P3 | Konversi ke timezone Asia/Jakarta atau minta FE kirim ISO string dengan offset | Open |
| NCR-05-12 | Kunjungan | UX | Frontend | Kolom Aksi hanya "Detail" (yang broken) — tidak ada indikasi visit yg butuh order/payment | `page.tsx` tabel | Fitur belum | Kasir harus buka detail utk tahu status pekerjaan | P3 | Tambah aksi kontekstual sesuai status (mis. "Buat Order" untuk REGISTERED) | Open |

## 10. Required Actions (Prioritas)

1. **P1** — Buat halaman detail `visits/[id]/page.tsx` (NCR-05-01). Effort: M. Tampilkan biodata pasien, detail visit (payment, doctor, clinic, insurance/bpjs), status timeline, related orders (findOrdersByVisit), tombol Cancel/Update. Menutup juga NCR-04-08.
2. **P1** — Enforce data-scope RBAC di findAll/findById/findOrdersByVisit (NCR-05-06). Effort: S. Filter berdasarkan role: KLINIK_PARTNER hanya visit klinik-nya; SUPER_ADMIN/ADMIN semua.
3. **P2** — Modal edit visit + cancel dengan reason (NCR-05-02/03/07). Effort: M.
4. **P2** — Toast/banner error saat fetch list gagal (NCR-05-04). Effort: XS.
5. **P2** — Sinkronkan payment labels 7 nilai (NCR-05-05). Effort: XS.
6. **P2** — Debounce di `SearchableDropdown` (NCR-05-09). Effort: XS. Dampak multi-menu.
7. **P3** — Accessibility fix (NCR-05-10), timezone (NCR-05-11), role UI gate (NCR-05-08), aksi kontekstual (NCR-05-12).

## 11. FS / FR Update yang Direkomendasikan

- **FR-04 Visit Management**: turunkan status dari *IMPLEMENTED* menjadi *PARTIAL*. List berfungsi baik; **detail/update/cancel dari UI belum ada**.
- Tambah **AC**: "Detail visit harus dapat diakses via `/dashboard/visits/[id]` menampilkan biodata, status, orders terkait."
- Tambah **AC**: "Cancel visit dari UI harus prompt alasan dan menyimpan `cancelReason` + `cancelledAt`."
- Tambah **AC (RBAC data-scope)**: "Pengguna KLINIK_PARTNER hanya boleh melihat visit yang `clinicId` sesuai afiliasinya."
- Tambah **AC (Enum consistency)**: "Setiap perubahan enum backend harus disertai update kamus label FE."
- Cross-ref: **menutup NCR-04-08** (blocked di audit 04). Update audit 04 §NCR untuk mark NCR-04-08 sebagai VERIFIED-BROKEN (Detail page memang tidak ada).

## 12. Reused / Superseded Prior Audit References

- `docs/audit/04-registration.md` NCR-04-08 (Detail route mungkin broken) → **CONFIRMED BROKEN** oleh audit ini. Bukan lagi "Open (blocked)"; naikkan ke Open P1.
- `docs/audit/04-registration.md` NCR-04-01 (envelope double-wrap) → **KONSISTEN**: `VisitService.findAll` idem. Bukti tambahan.
- `docs/audit/04-registration.md` NCR-04-02 (envelope unwrap boilerplate) → **DIPERKUAT**: pola kelima muncul di `visits/page.tsx`. Prioritas naik.
- `docs/17-Audit/_inventory/feature-coverage-matrix.md` FR-04 (jika mencatat coverage ~90%) → turunkan ke ~70% mempertimbangkan detail+edit+cancel UI missing.

## 13. No-Code-Modification Attestation

Audit read-only. Tidak ada perubahan kode, DTO, schema, atau migration. Semua kesimpulan berbasis file evidence (paths & line refs).
