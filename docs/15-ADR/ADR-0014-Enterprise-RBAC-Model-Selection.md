# ADR-0014: Enterprise RBAC Model Selection

## Context

Sistem eLIS menggunakan model Role-Based Access Control sederhana dengan single `role` field pada User model dan 11 predefined roles. Guard architecture menggunakan dua layer: `JwtAuthGuard` (authentication) → `RolesGuard` (authorization) dengan flat role matching. Audit enterprise mengidentifikasi bahwa **0 dari 6** enterprise access control capabilities diimplementasikan: tidak ada granular permission management, role hierarchy, role composition, department-based access, position-based access, maupun approval workflows.

Temuan keamanan kritis:
- 17 endpoint memiliki proteksi role yang tidak memadai (13 auth-only tanpa role guard)
- 5 Critical security findings pada endpoint yang mengekspos PHI (Protected Health Information)
- RolesGuard bersifat permissive-by-default (jika tidak ada `@Roles` decorator, semua authenticated user lolos)
- ADMIN dapat membuat user SUPER_ADMIN tanpa approval (privilege escalation risk)

Dokumen referensi:
- `docs/17-Audit/rbac-review.md`
- `docs/17-Audit/_inventory/enterprise-access-control-evaluation.md`

## Problem

Menentukan model access control yang tepat untuk memenuhi kebutuhan enterprise healthcare LIS: granular permissions, multi-role assignment, department-based data isolation (diperlukan untuk multi-branch operations dan BPJS compliance), serta approval workflows untuk operasi finansial dan clinical.

## Alternative

- **Option A — Enhanced Role-Based:** Mempertahankan Role enum dan RolesGuard yang ada, menambahkan permission registry statis dalam kode (`Map<Role, Permission[]>`). Menambah `@RequirePermission` decorator. Tidak ada perubahan database schema.
- **Option B — Full RBAC:** Memperkenalkan entity database terpisah: `Permission`, `RolePermission`, `UserRole` (junction table untuk multi-role), `Department`, `Position`, `UserDepartment`. Guard baru (`PermissionGuard`) yang query permissions saat runtime. Admin UI untuk manajemen permissions.
- **Option C — ABAC Hybrid:** Mengkombinasikan role-based dengan attribute-based access control (ABAC) policies yang mengevaluasi atribut user (department, position, shift), atribut resource (sensitivity, owner), dan atribut environment (time, location). Menggunakan policy engine (misalnya CASL).

## Pros

**Option B (Full RBAC):**
- Mengatasi semua 6 capability gaps dengan kompleksitas yang proporsional
- Runtime-configurable permissions — tidak perlu deployment ulang untuk perubahan akses
- Mendukung multi-role assignment (menyelesaikan masalah staff multi-fungsi yang memerlukan 2 akun)
- Department entity memungkinkan data isolation per-branch (prasyarat multi-branch laboratory operations)
- Sesuai standar NIST RBAC (SP 800-162) yang dibutuhkan untuk healthcare IT
- Database-stored permission assignments menyediakan audit trail untuk regulatory compliance (ISO 27001)
- PermissionGuard defaults to deny (menyelesaikan vulnerability permissive-by-default pada RolesGuard)
- Merupakan stepping stone menuju ABAC jika kompleksitas meningkat di masa depan

## Cons

**Option B (Full RBAC):**
- Memerlukan database migration signifikan: 5+ tabel baru (Permission, RolePermission, UserRole, Department, Position, UserDepartment)
- Performance overhead: permission lookup memerlukan DB query per request (dimitigasi dengan Redis cache TTL 5 menit)
- Implementasi estimasi 47 story points / 8 minggu (3 fase)
- Memerlukan admin UI baru untuk permission management
- Fase 3 (Department data scoping) bersifat High risk karena mengubah behavior read queries yang sudah ada
- Over-engineered untuk skala saat ini (11 roles, 83 endpoints) — justified hanya oleh growth trajectory multi-branch

## Selected

**Option B — Full RBAC**

Dipilih berdasarkan:
1. **Cakupan gap terluas:** Option A hanya mengatasi 2 dari 6 gaps (permission granularity + role hierarchy). Option B mengatasi 6/6 gaps. Option C mengatasi 6/6 tapi dengan kompleksitas yang tidak proporsional terhadap maturitas sistem saat ini.
2. **Healthcare compliance mandate:** NIST RBAC (SP 800-162) adalah standar access control untuk healthcare IT. BPJS integration yang akan datang (lihat ADR-0016) kemungkinan memerlukan facility-level data isolation — hanya achievable dengan Department entity.
3. **Critical security findings:** 5 findings Critical severity memerlukan pendekatan yang lebih robust dari sekadar menambah `@Roles` decorator. PermissionGuard dengan default-deny policy mengeliminasi seluruh kelas vulnerability.
4. **Multi-branch growth trajectory:** Rencana operasi multi-cabang laboratorium memerlukan department-based data scoping — ini hanya achievable dengan infrastructure Option B atau C.
5. **Option A insufficient:** Single role per user tetap menjadi blocking limitation untuk staff multi-fungsi. Code-defined permissions memerlukan developer involvement untuk setiap perubahan akses.
6. **Option C excessive:** Maturitas tim dan kompleksitas sistem saat ini tidak justify overhead policy engine. ABAC debugging lebih sulit. Jika kebutuhan attribute-based muncul di masa depan, migrasi dari B → C dimungkinkan karena B adalah stepping stone.

## Consequence

1. **Phase 1 (Foundation, 2 minggu, 13 SP):** Tabel `Permission` dan `RolePermission` dibuat. `PermissionGuard` ditambahkan. Existing role-endpoint mappings di-seed ke `RolePermission`. Dual-guard period: `RolesGuard` + `PermissionGuard` aktif bersamaan. Existing `@Roles` decorator tetap berfungsi.
2. **Phase 2 (Multi-Role & Hierarchy, 2 minggu, 13 SP):** Tabel `UserRole` junction dibuat. Role hierarchy via `parentRole`. Data migration dari `User.role` ke `UserRole` entries. `User.role` field dipertahankan tapi deprecated.
3. **Phase 3 (Department & Position, 4 minggu, 21 SP):** Entity `Department`, `Position`, `UserDepartment` dibuat. Data-scoping middleware yang filter queries berdasarkan department user. Admin UI untuk department assignment.
4. Seluruh 83 endpoint secara bertahap dimigrasikan dari `@Roles` ke `@RequirePermission` selama Phase 1-2.
5. Approval Matrix (35 SP tambahan) di-enable oleh infrastruktur RBAC ini tapi diimplementasikan sebagai fase terpisah.
6. Frontend diperbarui untuk permission-aware UI (show/hide berdasarkan effective permissions, bukan hanya role check).

## Future Consideration

- Setelah Phase 3 stabil, evaluasi ulang apakah ABAC diperlukan untuk skenario kompleks (time-based access, shift-based access, conditional approval berdasarkan amount threshold)
- Approval Matrix (lab result verification, financial authorization, master data changes, user role elevation) diimplementasikan di atas fondasi Full RBAC ini — estimasi 35 SP tambahan
- Redis cache untuk permission resolution harus di-invalidate setiap ada perubahan role-permission assignment — gunakan pub/sub pattern
- Jika migrasi ke microservices terjadi, Permission service menjadi auth service tersendiri yang dikonsumsi oleh semua services via token enrichment

