---
Document ID: AUDIT-eLIS-2026-M02
Title: Enterprise Audit — Menu 02: Pengaturan → Users (User Management)
Framework: Kiro Enterprise Framework v3
Scope: Settings page Users tab, UsersController/Service, Create/Update DTO, RolesGuard
Status: Complete (read-only)
Author: Enterprise Auditor
Date: 2026-07-10
Reuses: docs/17-Audit/_inventory/functional-gap-report.md (FG-ADM-001..003), docs/17-Audit/rbac-review.md
---

# 02 — Pengaturan → Users (User Management)

> Catatan scope: Halaman `settings/page.tsx` menampung **14 tab** (12 master data + Users + SMTP).
> Audit ini fokus **tab Users** dan **mekanisme generik shell** yang dipakai bersama semua tab.
> Master-data tabs (tests, tariffs, dll.) akan diaudit di menu tersendiri.

## 1. Implementation Status

Traceability terhadap SRS §4 (RBAC "Manage User") & BRD §15, FS FR-ADM.

| Requirement | Status | Evidence |
|---|---|---|
| User CRUD (Create/Read/Update/Delete) | **IMPLEMENTED** | `users.controller.ts` 4 method + `users.service.ts` |
| Role assignment (11 role enum) | **IMPLEMENTED** | `settings/page.tsx` ROLES array (line ~110); `UpdateUserDto.role @IsEnum(Role)` |
| Soft delete user | **IMPLEMENTED** | `users.service.ts:softDelete` set `deletedAt` |
| RBAC: hanya ADMIN/SUPER_ADMIN kelola user; delete SUPER_ADMIN-only | **IMPLEMENTED** | `@Roles(Role.ADMIN, Role.SUPER_ADMIN)`; `@Delete` `@Roles(Role.SUPER_ADMIN)` |
| Pagination + search + filter role | **IMPLEMENTED (backend)** / **NOT USED (frontend)** | Service dukung page/limit/search/role; frontend tidak kirim param → lihat NCR-02-03 |
| Dynamic Permission management (BRD §08 "Permission") | **MISSING** | Sudah dicatat di FG-ADM-001 (reuse) |
| Role hierarchy / multi-role | **MISSING** | Sudah dicatat di FG-ADM-002 (reuse) |
| Inline user audit history | **PARTIAL** | Sudah dicatat di FG-ADM-003 (reuse) |
| Password reset flow (self-service) | **MISSING** | Hanya via admin `PUT /users/{id}` |

## 2. End-to-End Flow

### 2a. List users (buka tab Users)
```
[Settings tab click "Users"]
  settings/page.tsx: setActiveTab("users") → useEffect → fetchData(currentTab.endpoint)
  endpoint = "/api/v1/users"  (tabs config)

[fetchData]
  settings/page.tsx:~810 apiClient.get("/api/v1/users")
    → GET /api/v1/users  (Authorization: Bearer <token>)

[Backend]
  UsersController.findAll (users.controller.ts:39)
    @Roles(ADMIN, SUPER_ADMIN) → RolesGuard cek user.role
    usersService.findAll(page=1, limit=10, search=undefined, role=undefined)
    → Prisma users WHERE deletedAt IS NULL, take 10, orderBy createdAt desc
    controller wraps → { success, message, data: { data:[...], meta:{...} } }
  TransformInterceptor wraps LAGI → { success, message, data: { success?, data:{ data, meta } } }
    ⚠️ DOUBLE-WRAP (lihat NCR-02-01)

[Frontend extraction]
  fetchData shape-handler (settings/page.tsx:~818-840)
    Menangani Shape 1 { data: { data:[...] } } secara defensif
    → extracted = deepData  ✅ berhasil karena handler antisipasi double-nest
```

### 2b. Create user
```
[Tombol "Tambah" → FormModal]
  fields: email, name, password(requiredOnCreate), role(select ROLES)
  handleSubmit → build payload (skip empty) → apiClient.createUser(values)
    → POST /api/v1/users
[Backend]
  UsersController.create → CreateUserDto (@IsEmail, @MinLength(8), @IsEnum(Role))
    usersService.create → cek email exist → bcrypt.hash(pwd,12) → prisma.create
    return userSelect (tanpa passwordHash) ✅
```

### 2c. Update role (ganti role user)
```
[Edit row → FormModal → password kosong di-skip]
  apiClient.updateUser(id, values) → PUT /api/v1/users/{id}
[Backend]
  UpdateUserDto validate → service.update → prisma.update select userSelect
```

### 2d. Delete user
```
[Tombol Hapus → window.confirm → apiClient.deleteUser(id)]
  DELETE /api/v1/users/{id}  @Roles(SUPER_ADMIN)
  service.softDelete → set deletedAt
```

Semua jalur **bekerja end-to-end** (terbukti saat sesi demo: ubah role kasir→MANAGER→KASIR berhasil via API).

## 3. Functional Gap

| ID | Requirement | Status | Root Cause |
|---|---|---|---|
| FG-02-01 | Frontend tidak expose pagination — hanya ambil 10 user pertama | PARTIAL/BROKEN | `endpoint:"/api/v1/users"` tanpa `?limit`; tab lain pakai `?limit=100`, Users tidak. Jika >10 user, sisanya tak terlihat |
| FG-02-02 | Search di tab Users hanya client-side filter atas 10 baris termuat | PARTIAL | `filteredData` filter array lokal; server-side `search` param tidak dipakai |
| FG-02-03 | Filter by role (backend ready) tak ada UI | MISSING | Tidak ada dropdown filter role di toolbar |
| FG-02-04 | Password reset self-service | MISSING | Hanya admin yang bisa reset via update |
| FG-02-05 | Cegah self-delete / hapus SUPER_ADMIN terakhir | MISSING | `softDelete` tak ada guard: SUPER_ADMIN bisa hapus dirinya / admin terakhir → lockout risk |
| FG-02-06 | Reaktivasi user yang soft-deleted | MISSING | Tidak ada endpoint un-delete; user terhapus tak bisa dipulihkan via UI |
| FG-02-07 | Audit log pada user CRUD | PARTIAL | Bergantung AuditInterceptor global (perlu verifikasi apakah dipasang di users module) — lihat NCR-02-05 |

## 4. Frontend Gap

Sumber: `apps/web/src/app/dashboard/settings/page.tsx`.

| Area | Finding | Evidence | Severity |
|---|---|---|---|
| Pagination | Tidak ada kontrol halaman sama sekali di seluruh settings shell; `meta` dari server dibuang | `fetchData` hanya ambil `extracted` array, `meta` tidak dipakai | **Medium** — data >10 (users) atau >100 (master) tak terlihat |
| Password field type | `type:"text"` untuk password (bukan `type:"password"`) → **password tampil sebagai teks biasa** saat ketik | tabs users fields: `{ key:"password", type:"text" }` | **Medium** (shoulder-surfing / privacy) |
| Role display | Kolom `role` render string enum mentah (`SUPER_ADMIN`) bukan label ramah | columns users: `{ key:"role", label:"Role" }` no render | Low |
| RBAC UI gating | Menu Settings & tombol CRUD **tidak di-gate per role di frontend** — semua user yang bisa buka `/dashboard/settings` melihat tombol Tambah/Edit/Hapus. Server tetap 403, tapi UX menyesatkan (tombol terlihat lalu gagal) | tak ada cek `user.role` sebelum render toolbar | **Medium** |
| Error surface | Create/Update error di-catch di FormModal → tampil pesan; tapi Delete error pakai `alert()` (inkonsisten) | `handleDelete` `alert(...)` | Low |
| Empty/Loading state | Ada (`Loader2`, `PackageOpen` empty state) | ✅ | Good |
| Confirm delete | Pakai `window.confirm` native (bukan modal desain) | `handleDelete` | Low (fungsional, tapi tak sesuai design system) |
| Envelope handling | Robust — antisipasi 4 shape termasuk double-nest | `fetchData:~818` | Good (tapi menutupi bug backend, lihat NCR-02-01) |

## 5. Backend / API Gap

| Area | Finding | Evidence | Severity |
|---|---|---|---|
| **Double envelope** | `UsersController` return `{ success, message, data }` manual, lalu `TransformInterceptor` bungkus lagi → `data.data.data`. Sama persis bug yang sudah diperbaiki di auth. **Belum diperbaiki di users** (dan kemungkinan controller lain). | `users.controller.ts:33,49,...` return objek envelope manual | **High** (konsistensi kontrak API) |
| Self-lockout | `softDelete` tak cegah SUPER_ADMIN menghapus dirinya sendiri atau admin terakhir | `users.service.ts:softDelete` | **High** |
| Role change privilege escalation | ADMIN dapat meng-update user lain menjadi SUPER_ADMIN (tidak ada guard mencegah eskalasi role di atas dirinya) | `update` menerima `role` apa pun dari ADMIN | **High** (privilege escalation) |
| findAll `role` param unvalidated | `role?: string` diteruskan ke `where.role = role` tanpa validasi enum; nilai invalid → Prisma error 500, bukan 400 | `users.service.ts:findAll` | Low |
| `page`/`limit` parseInt tanpa guard | `parseInt("abc")` → NaN → Prisma `skip: NaN` bisa error | `users.controller.ts:findAll` | Low |
| DTO quality | CreateUserDto/UpdateUserDto solid (`@IsEmail`,`@MinLength(8)`,`@IsEnum`) — kontras dgn auth yang pakai `any` | `dto/*.ts` | Good |
| Password policy | Hanya `@MinLength(8)`; tak ada syarat kompleksitas | `create-user.dto.ts` | Low |
| Logging | Tidak ada log khusus operasi user-management di service | — | Low |

## 6. Database Gap

Tabel: `users`.

| Area | Finding | Severity |
|---|---|---|
| Kolom dipakai | id, email, name, passwordHash, role, createdAt, updatedAt, deletedAt — semua dipakai | ✅ |
| `userSelect` exclude passwordHash | Benar — hash tak pernah keluar via API | ✅ Good |
| Missing kolom | Tidak ada `createdBy`/`updatedBy` untuk jejak siapa membuat user | Low |
| Missing kolom | Tidak ada `isActive` di users (master lain punya) — nonaktifkan user tanpa hapus tidak mungkin | Medium |
| Unique email | Unique constraint tegak; `create` juga cek manual (redundan tapi aman) | ✅ |
| Soft-deleted email reuse | `create` cek `findUnique({where:{email}})` **tanpa** filter deletedAt → email milik user terhapus tetap dianggap "in use", tak bisa dipakai ulang | Medium |

## 7. Duplicate / Repeated Logic

| Finding | Evidence | Verdict |
|---|---|---|
| Envelope manual `{success,message,data}` diulang di tiap method controller (create/findAll/findOne/update/remove) | `users.controller.ts` 5x | Duplikasi + konflik dengan TransformInterceptor. **Hapus wrap manual** (samakan dgn perbaikan auth) |
| Shape-extraction defensif diduplikasi: `fetchData` dan `fetchCategories` punya logika unwrap hampir identik | `settings/page.tsx:~818` & `~848` | Duplikasi semantik nyata — extract ke helper `unwrapList(res)` |
| bcrypt cost 12 literal | `users.service.ts:39` & `:117` | Minor (sama seperti temuan menu 01) |
| CRUD dispatch `if (currentTab.id === "users") apiClient.createUser else apiClient.post` | `handleSubmit`, `handleDelete` | Acceptable — users pakai method khusus; tapi bisa disatukan lewat endpoint generik |

## 8. Dead Code Candidates

| Item | Status | Alasan |
|---|---|---|
| `apiClient.getUsers()` params `page/limit/search/role` | **NOT USED** oleh settings page (page pakai `apiClient.get(endpoint)` langsung) | Bukan dead (bisa dipakai modul lain), tapi tab Users **melewatkan** helper ini → itulah akar FG-02-01/02 |
| `PaginatedResponse<T>` type | Live (dipakai di banyak signature) | Bukan dead |
| `users.service.spec.ts` | Live (test) | Perlu verifikasi masih hijau |
| Kolom filter `role` di `findAll` | Live di backend, **tak terpakai** dari UI | Bukan dead code; unused pathway |

Tidak ada dead code definitif; ada **unused capability** (pagination/search/role filter) yang tidak tersambung ke UI.

## 9. NCR Gap Matrix

| ID | Menu | FR ID | Layer | Finding | Evidence | Root Cause | Impact | Priority | Required Action | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| NCR-02-01 | Settings/Users | API contract | Backend | Double envelope pada UsersController (dan kemungkinan MasterData/Audit controller) | `users.controller.ts` return `{success,message,data}` + TransformInterceptor | Pola lama belum dibersihkan seperti auth | Frontend harus defensif unwrap 3-level; rapuh; kontrak tidak konsisten | **P1** | Hapus wrap manual di semua controller; kembalikan raw, biarkan TransformInterceptor. Audit semua controller lain | Open |
| NCR-02-02 | Users | Backend | Backend | ADMIN dapat menaikkan role user menjadi SUPER_ADMIN (privilege escalation) | `users.service.update` terima role apa pun | Tidak ada aturan batas eskalasi | ADMIN bisa membuat SUPER_ADMIN baru / mengambil alih | **P1** | Tambah aturan: hanya SUPER_ADMIN boleh meng-assign SUPER_ADMIN; ADMIN tidak boleh set role ≥ dirinya | Open |
| NCR-02-03 | Users | FE + BE | Frontend | Tab Users tidak paginate/search server-side; hanya 10 user pertama tampil | `tabs` users `endpoint:"/api/v1/users"` tanpa limit; `filteredData` client-only | Helper `getUsers()` tidak dipakai | Data user >10 tak terlihat → admin salah kelola | **P2** | Sambungkan tab Users ke `apiClient.getUsers({page,limit,search,role})` + kontrol pagination + dropdown role | Open |
| NCR-02-04 | Users | Backend | Backend | Tidak ada proteksi self-delete / hapus SUPER_ADMIN terakhir | `users.service.softDelete` tanpa guard | Belum diimplementasi | Risiko lockout total sistem | **P1** | Tolak delete jika target = current user, atau jika target SUPER_ADMIN terakhir yang aktif | Open |
| NCR-02-05 | Users | SRS §5 | Backend | Perlu verifikasi audit log tercatat untuk user C/U/D | `users.module.ts` tidak menampakkan AuditInterceptor; middleware audit di `laboratory/audit` | Audit mungkin hanya cover modul laboratory | Perubahan user mungkin tak ter-audit | **P2** | Verifikasi `AuditLogMiddleware`/interceptor mencakup `users`; jika tidak, daftarkan | Open |
| NCR-02-06 | Users | Frontend | Frontend | Field password `type:"text"` → password tampak saat diketik | `tabs` users fields password type text | Salah tipe field | Kebocoran bahu; tak ada toggle show/hide | **P2** | Ubah ke `type:"password"` + optional toggle | Open |
| NCR-02-07 | Users | Frontend | Frontend | Tombol CRUD tidak di-gate role di UI; user non-admin lihat tombol lalu 403 | `settings/page.tsx` toolbar tanpa cek role | RBAC hanya di server | UX menyesatkan | P3 | Sembunyikan Settings/tab/aksi berdasarkan `useAuth().user.role` | Open |
| NCR-02-08 | Users | DB | Backend + DB | Email milik user soft-deleted tak bisa dipakai ulang | `create` cek email tanpa `deletedAt` filter | Cek keunikan tidak sadar soft-delete | Registrasi ulang email lama gagal | P3 | Sertakan `deletedAt: null` di cek, atau kebijakan email unik penuh yang jelas | Open |
| NCR-02-09 | Users | DB | DB | Tidak ada kolom `isActive` untuk nonaktifkan user tanpa hapus | `schema.prisma User` | Model minimal | Tidak bisa suspend sementara | P3 | Tambah `isActive Boolean @default(true)` + filter di login | Open |
| NCR-02-10 | Settings shell | Frontend | Frontend | `meta` pagination dari server dibuang di seluruh shell (14 tab) | `fetchData` tak simpan meta | Belum diimplementasi | Semua tab master data juga terbatas | P2 | Implement pagination generik di shell (berdampak semua tab) | Open |

## 10. Required Actions (Prioritas)

1. **P1** — Hapus double-envelope di UsersController + audit semua controller lain (NCR-02-01). Effort: M (repo-wide).
2. **P1** — Cegah privilege escalation via update role (NCR-02-02). Effort: S.
3. **P1** — Cegah self-delete / hapus SUPER_ADMIN terakhir (NCR-02-04). Effort: S.
4. **P2** — Sambungkan tab Users ke pagination/search/role server-side (NCR-02-03) + shell pagination (NCR-02-10). Effort: M.
5. **P2** — Verifikasi audit coverage user CRUD (NCR-02-05). Effort: S.
6. **P2** — Password field `type:"password"` (NCR-02-06). Effort: XS.
7. **P3** — RBAC UI gating (NCR-02-07), email reuse (NCR-02-08), kolom isActive (NCR-02-09). Effort: S–M.

## 11. FS / FR Update yang Direkomendasikan

- **FR-ADM (User Management)**: tandai *IMPLEMENTED with gaps* — CRUD & role assignment jalan, tapi pagination/search/role-filter belum tersambung UI, dan ada celah privilege-escalation & self-lockout.
- Tambah **acceptance criteria baru**:
  - AC-ADM-x: "ADMIN tidak dapat meng-assign atau membuat role SUPER_ADMIN."
  - AC-ADM-y: "Sistem menolak penghapusan SUPER_ADMIN aktif terakhir dan penghapusan diri sendiri."
  - AC-ADM-z: "Daftar user mendukung pagination & pencarian server-side."
- Cross-ref `docs/17-Audit/_inventory/functional-gap-report.md` FG-ADM-001/002/003 (permission dinamis, hierarki role, inline audit) — masih valid, tidak di-supersede.
- Catat **NCR-02-01** sebagai isu API-contract lintas modul; kemungkinan mempengaruhi audit menu 03–11 (patients, orders, dll.) → prioritas tinggi untuk diverifikasi lebih awal.

## 12. Reused Prior Audit References

- `docs/17-Audit/_inventory/functional-gap-report.md` — FG-ADM-001 (Dynamic Permission), FG-ADM-002 (Role Hierarchy), FG-ADM-003 (Inline Audit): valid, tidak diulang detailnya.
- `docs/17-Audit/rbac-review.md` — endpoint security audit RBAC (referensi untuk pola `@Roles`).
- Menu 01 (`01-login-auth.md`) — bug double-envelope pertama kali teridentifikasi di auth; NCR-02-01 mengonfirmasi pola yang sama masih ada di users.

## 13. No-Code-Modification Attestation

Audit read-only. Tidak ada perubahan kode selama audit menu ini.
