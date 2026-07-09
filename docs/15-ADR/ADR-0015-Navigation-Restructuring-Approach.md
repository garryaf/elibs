# ADR-0015: Navigation Restructuring Approach

## Context

Sidebar navigasi eLIS saat ini memiliki 8 item top-level dengan struktur flat (tanpa hierarki). Menu "Pengaturan" (Settings) menampung 14 sub-fitur sebagai tabs dalam satu halaman. Audit enterprise UX mengidentifikasi tiga pelanggaran serius:

1. **Sub-feature capacity exceeded:** 14 items di bawah satu menu — 100% melebihi threshold 7 items (Miller's Law)
2. **Conceptual cohesion sangat rendah:** Hanya 7.1% konten yang sesuai dengan label "Pengaturan" — 85.7% adalah Master Data, bukan settings
3. **Frequency-of-access disparity:** Item harian (Users) digabung dengan item yang diakses per kuartal (Satuan, Wilayah, SMTP)

Tambahan gap struktural:
- Tidak ada frontend role-based menu visibility (semua user melihat semua menu)
- 3 backend API modules (users, regions, settings) tidak memiliki halaman dedicated/URL sendiri
- Tidak ada deep-linking ke individual master data entity

Dokumen referensi:
- `docs/17-Audit/navigation-review.md`
- `docs/17-Audit/_inventory/navigation-ux-evaluation.md`

## Problem

Menentukan pendekatan restrukturisasi navigasi sidebar yang memenuhi enterprise UX best practices (≤7 items per level, high cohesion per group, frequency-appropriate grouping) sambil mendukung role-based visibility, deep-linking, dan scalability untuk fitur masa depan.

## Alternative

- **Option A — Keep Combined (Status Quo):** Mempertahankan 14 sub-fitur dalam satu menu "Pengaturan" dengan tab-based navigation. Tidak ada perubahan.
- **Option B — Separate Top-Level Menus:** Memecah "Pengaturan" menjadi 3 top-level menu terpisah: "Master Data" (12 items), "Users" (1 item), "Pengaturan" (1 item SMTP). Tidak ada sub-grouping.
- **Option C — Hierarchical Navigation with Expandable Sub-Menus:** Restrukturisasi navigasi menggunakan collapsible/expandable sub-menu dengan domain-based grouping. Max 3 level kedalaman, max 7 items per level. 14 sub-fitur didistribusikan ke sub-groups logis.

## Pros

**Option C (Hierarchical Navigation):**
- Setiap level navigasi memenuhi constraint ≤7 items — full compliance dengan Miller's Law (7±2)
- Domain-based grouping (Clinical Operations, Master Data, Administration, System Configuration) memberikan cohesion yang tinggi — user dapat memprediksi konten dari label
- Frequency optimization: Users mendapat dedicated entry point di "Administrasi" — akses harian tidak terganggu oleh items yang rarely digunakan
- Progressive disclosure: Initial cognitive load turun dari 14 items sekaligus menjadi 7 top-level items yang expandable
- Scalability: Fitur baru (notification templates, workflow rules) dapat ditambahkan ke sub-group yang tepat tanpa melebihi capacity
- Deep-linking enabled: Setiap entity mendapat route path dedicated (bookmarkable, shareable, browser history compatible)
- Role-based filtering ready: Hierarki domain mappable ke role visibility (ADMIN/SUPER_ADMIN melihat Master Data; operational roles melihat clinical data read-only)
- Sinkron dengan backend bounded context separation (ADR-0013): 3 domain → 3 navigasi group → 3 bounded context

## Cons

**Option C (Hierarchical Navigation):**
- Effort implementasi Medium-High: Memerlukan refactor sidebar component + new routing structure + individual page components
- Total estimasi effort: 28-52 SP (P1: 8-12 SP, P2: 11-22 SP, P3: 9-18 SP)
- User familiarity disruption: Users yang terbiasa dengan posisi tabs saat ini perlu relearning
- Meningkatkan total top-level items dari 8 menjadi 7 main items (setelah konsolidasi Audit Trail ke dalam Administrasi dan penggabungan Validasi Dokter ke Laboratorium)
- Sidebar component perlu di-rebuild untuk mendukung collapsible/expandable state management
- Max depth 3 level memerlukan breadcrumb navigation untuk context awareness

## Selected

**Option C — Hierarchical Navigation with Expandable Sub-Menus**

Dipilih berdasarkan:
1. **Satu-satunya option yang memenuhi ketiga enterprise UX criteria secara simultan:** Sub-feature capacity (max 4 items per sub-group vs threshold 7), conceptual cohesion (domain-based), dan frequency optimization (dedicated entry points per usage pattern).
2. **Option A gagal semua kriteria:** 14 items = 2× threshold, 7.1% cohesion, daily items dicampur dengan quarterly items. Mempertahankan struktur ini memperpanjang known usability issues.
3. **Option B gagal capacity criterion:** Master Data masih 12 items (melebihi threshold 7). Menambah top-level ke 10 items mendekati limit. Perbaikan partial tapi bukan solusi optimal.
4. **Alignment dengan arsitektur backend:** Hierarchical navigation merefleksikan bounded context separation (ADR-0013) — navigasi menjadi representasi visual dari domain model.
5. **Prasyarat role-based visibility:** Hierarki memungkinkan implementasi role-based menu filtering yang bersih — hide/show pada level group, bukan per-item.

## Consequence

1. Sidebar component di-refactor untuk mendukung multi-level expandable/collapsible menu groups
2. 14 sub-fitur didistribusikan ke dalam hierarki domain:
   - **Laboratorium** (expandable): Antrian Sampel, Input Hasil, Validasi Dokter, Data Klinis → (Kategori Tes, Tes Lab, Panel), Statistik Lab
   - **Master Data** (expandable, new): Dokter, Klinik, Asuransi, Alat & Reagen → (Alat, Reagen), Tipe Sampel, Satuan Ukur, Wilayah
   - **Administrasi** (expandable, new): Pengguna, Tarif, Pengaturan Sistem → (SMTP Settings), Audit Trail
3. Setiap entity mendapat dedicated route path (contoh: `/dashboard/master-data/doctors` bukan tab di `/dashboard/settings`)
4. Single-page Settings component didekomposisi menjadi individual page components per entity
5. Role-based visibility diterapkan pada frontend menggunakan auth context — menu items di-hide berdasarkan effective permissions user
6. Breadcrumb navigation ditambahkan untuk 3-level hierarchy context
7. Implementasi bertahap: P1 (dedicated Users page + Administrasi group) → P2 (Master Data routes + expandable menus) → P3 (decompose Settings page + clinical data relocation)

## Future Consideration

- Ketika RBAC enterprise (ADR-0014) Phase 1 selesai, sidebar visibility dapat digerakkan oleh permission-based rules, bukan hardcoded role checks
- Jika modul baru ditambahkan (Quality Control, Inventory Management, Reporting Dashboard), hierarki sudah memiliki slot natural: QC → Laboratorium, Inventory → Master Data, Reporting → Laporan & Audit
- Pertimbangkan pinned/favorite navigation items untuk power users yang sering mengakses entity tertentu — mengurangi navigation depth untuk workflow repetitif
- Responsive behavior: pada mobile/tablet breakpoints, hierarki dapat di-collapse ke drawer navigation dengan search functionality untuk quick access

