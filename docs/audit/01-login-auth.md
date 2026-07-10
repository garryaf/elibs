---
Document ID: AUDIT-eLIS-2026-M01
Title: Enterprise Audit — Menu 01: Login & Autentikasi
Framework: Kiro Enterprise Framework v3
Scope: Login page, AuthController/Service, JwtStrategy, RolesGuard, middleware
Status: Complete (read-only)
Author: Enterprise Auditor
Date: 2026-07-10
Reuses: docs/17-Audit/rbac-review.md, docs/17-Audit/_inventory/rbac-implementation-current.md
---

# 01 — Login & Autentikasi

## 1. Implementation Status

Traceability terhadap Functional Spec (SRS §2.1 F-AUTH-* dan FS §1.3 FR-AUTH-*).

| FR / FS ID | Requirement | Status | Evidence |
|---|---|---|---|
| F-AUTH-01 | Login email/password → accessToken + refreshToken | **PARTIAL** | accessToken ada; **refreshToken tidak diimplementasi** (lihat NCR-01-01) |
| F-AUTH-02 | JWT 15 menit, claims userId, role, klinikId | **PARTIAL** | Umur bukan 15m; JWT_EXPIRATION di `.env.example` = `1d`. Claim **`klinikId` hilang** (NCR-01-02) |
| F-AUTH-03 | bcrypt cost factor 12 | **IMPLEMENTED** | `users.service.ts:39` `bcrypt.hash(dto.password, 12)`; `users.service.ts:117` update dengan cost 12 |
| API §5.1 `POST /logout` | Invalidate token via Redis blocklist | **MISSING** | Tidak ada endpoint logout (NCR-01-03) |
| API §5.1 `POST /refresh` | Refresh access token | **MISSING** | Tidak ada endpoint (NCR-01-01) |
| API §5.1 `POST /otp-request` | OTP reset password | **MISSING** | Tidak ada endpoint |
| SRS §3.1 Rate Limit | 5 req/menit/IP di `/auth/login` | **MISSING** | Tidak ada Throttle guard (NCR-01-04) |
| RBAC (FS §1.3 FR-AUTH-02) | Guards per endpoint | **IMPLEMENTED** | `JwtAuthGuard` + `RolesGuard` di `common/guards/*` |
| Middleware route protection | `/dashboard/*` butuh auth | **PARTIAL** | Cek cookie flag saja, bukan verify JWT (NCR-01-05) |

## 2. End-to-End Flow (UI → DB)

Trace saat user submit login `admin@elis.com` / `password`.

```
[Browser Login form]
  apps/web/src/app/page.tsx:handleSubmit (line 33)
    ├── client validation: email/password non-empty (line 40-47)
    └── useAuth().login(payload) — apps/web/src/lib/auth-context.tsx:57

[AuthContext.login]
  apps/web/src/lib/auth-context.tsx:57-70
    └── apiClient.login(payload) — apps/web/src/lib/api.ts:105

[ApiClient.login]
  apps/web/src/lib/api.ts:105-107
    └── this.post<LoginResponse>('/api/v1/auth/login', payload)
    └── fetch(`${API_BASE_URL}/api/v1/auth/login`) — line 68

[Network]
  POST http://localhost:3001/api/v1/auth/login
    body: { email, password }
    (no Authorization header, no CSRF token)

[NestJS pipeline — main.ts:14-33]
  Helmet → CORS (config.CORS_ORIGINS) → globalValidationPipe → routing

[AuthController.login]
  apps/api/src/auth/auth.controller.ts:9-16
    @Post('login') @HttpCode(200)
    ├── param: `loginDto: any` — NO DTO CLASS (see NCR-01-06)
    └── authService.validateUser(loginDto.email, loginDto.password)

[AuthService.validateUser]
  apps/api/src/auth/auth.service.ts:13-21
    ├── usersService.findByEmail(email) — filters deletedAt=null
    │     → Prisma SELECT users WHERE email=$1 AND "deletedAt" IS NULL
    └── bcrypt.compare(pass, user.passwordHash) — constant-time
    └── return { ...user, passwordHash omitted } | null

[AuthService.login]
  apps/api/src/auth/auth.service.ts:23-29
    payload = { email, sub: user.id, role: user.role }   ← NO klinikId
    accessToken = jwtService.sign(payload)
    return { accessToken, user: payload }

[TransformInterceptor]
  apps/api/src/common/interceptors/transform.interceptor.ts
    wraps → { success:true, message:"Success", data:{ accessToken, user } }

[Frontend response handling]
  apps/web/src/lib/auth-context.tsx:60
    const { accessToken, user: userData } = response.data;
    localStorage['elis_token'] = accessToken
    localStorage['elis_user']  = JSON.stringify(userData)
    document.cookie = "elis_authenticated=true; SameSite=Lax; max-age=86400"

[Redirect]
  router.replace('/dashboard') — page.tsx line 63
    Next.js middleware.ts:20 sees cookie → allow /dashboard
```

Alur bekerja end-to-end. Bug envelope-duplikat sudah **DIPERBAIKI** di commit `6dc803b` (auth.controller.ts return raw service result, interceptor yang bungkus).

## 3. Functional Gap

| ID | Requirement (Sumber) | Status | Root Cause |
|---|---|---|---|
| FG-01-01 | Refresh token flow (API §5.1, F-AUTH-01) | MISSING | Tidak diimplementasi; frontend hanya simpan access token 1 hari |
| FG-01-02 | Logout endpoint + JWT blocklist (API §5.1, DB Design §6 `blocklist:jwt:{jti}`) | MISSING | Frontend `logout()` cuma clear localStorage; token yang bocor tetap valid sampai expiry |
| FG-01-03 | OTP reset password (API §5.1, DB Design §6 `otp:reset:{email}`) | MISSING | Fitur belum dibuat |
| FG-01-04 | Rate limiting login 5/menit/IP (SRS §3.1) | MISSING | Tidak ada `@Throttle` decorator; `@nestjs/throttler` bukan dependency di `apps/api/package.json` |
| FG-01-05 | Claim `klinikId` di JWT (F-AUTH-02) | MISSING | `AuthService.login` payload cuma email/sub/role |
| FG-01-06 | Umur access token 15 menit (F-AUTH-02) | DEVIATED | `.env.example` set `JWT_EXPIRATION=1d`; expose window terlalu lebar |
| FG-01-07 | Audit log untuk LOGIN success/fail (SRS §5 action=LOGIN) | MISSING | `AuditService` ada tapi tidak dipanggil dari `AuthService`/`AuthController` |
| FG-01-08 | Account lockout / failed login attempt tracking | NOT SPECIFIED | Tidak di FS, tapi enterprise-standard. Kolom `failedLoginAttempts`, `lockedUntil` tidak ada di `users` |

## 4. Frontend Gap

Sumber: `apps/web/src/app/page.tsx`, `apps/web/src/lib/auth-context.tsx`, `apps/web/src/middleware.ts`.

| Area | Finding | Evidence | Severity |
|---|---|---|---|
| Client validation | Hanya cek trim non-empty; **tidak validasi format email** meski input `type="email"` | `page.tsx:40-47` | Low (browser type=email + server DTO seharusnya menutup) |
| Middleware protection | Middleware hanya cek cookie `elis_authenticated=true`, tidak decode/verify JWT | `middleware.ts:19-27` | **Medium** — pengguna dapat manual `document.cookie="elis_authenticated=true"` di DevTools dan bypass client-side redirect (server tetap 401, tapi UX terlihat bocor) |
| Token storage | `localStorage` — rentan XSS jika ada bug XSS di app | `auth-context.tsx:31-38` | Medium — pindah ke httpOnly cookie akan lebih aman, tapi butuh redesign |
| Sesi tak terverifikasi ulang | Hydrate langsung anggap valid tanpa panggil `/auth/me` | `auth-context.tsx:39-52` | Medium — token expired baru ketahuan setelah pertama kali API 401 |
| Envelope handling | Sudah selaras dengan backend (post-fix). Namun `LoginResponse` interface masih ada dua-lapis pada `data.user` yang tidak dipakai ulang di context | `api.ts:34-40`, `auth-context.tsx:60` | Low — cosmetic |
| Auto-redirect saat sudah login | `if (user) router.replace('/dashboard'); return null;` di render body — trigger sisi client saat state hydrate | `page.tsx:26-30` | Low — dapat menyebabkan flash konten kosong |
| RBAC visibility | Tidak ada gating berdasarkan role di halaman login (n/a). Sidebar & menu link visibility per role belum dipetakan di audit ini (scope menu terpisah) | — | — |
| Password field UX | Tidak ada tombol show/hide password | `page.tsx:113-124` | Low |

## 5. Backend / API Gap

| Area | Finding | Evidence | Severity |
|---|---|---|---|
| **DTO validation** | `login(@Body() loginDto: any)` — **tidak ada class DTO**. GlobalValidationPipe hanya berlaku kalau param bertipe class dengan class-validator. Payload apapun diterima (mis. `{email:{$ne:null}}`) dan langsung diteruskan ke Prisma `findUnique({where:{email}})`. Prisma akan menolak non-string, jadi tidak eksploitasi injection SQL, tapi **type safety hilang**. | `auth.controller.ts:12` | **High** |
| Controller prefix | `@Controller('api/v1/auth')` sementara main.ts sudah `setGlobalPrefix('api/v1')`. Bekerja karena NestJS menggabung — tapi konvensi lain (users, patients) pakai path pendek. **Inkonsistensi**. | `auth.controller.ts:4` vs `main.ts:22` | Low — konsistensi |
| Logout endpoint | Tidak ada | — | **High** (F-AUTH & DB Design menyatakan wajib) |
| Refresh endpoint | Tidak ada | — | **High** |
| OTP endpoint | Tidak ada | — | Medium |
| Rate limiting | Tidak ada `@nestjs/throttler` di package.json | `apps/api/package.json` dependencies | **High** — bruteforce risk |
| Login audit log | Tidak ada `AuditService.logLogin()` call | `auth.service.ts` — no import | Medium |
| JWT payload | `sub, email, role` — **kurang klinikId** yang disebut FS | `auth.service.ts:24` | Medium |
| Password reset | Tidak ada endpoint. Reset hanya bisa via update endpoint `PUT /users/{id}` (admin-only) | — | Medium |
| Error message uniformity | `throw new UnauthorizedException('Invalid email or password')` — bagus (tidak leak apakah email exist). | `auth.controller.ts:14` | Good |

## 6. Database Gap

Tabel referensi: `users`.

| Area | Finding | Evidence | Severity |
|---|---|---|---|
| Kolom `passwordHash` | Ada, dipakai. | `schema.prisma users` | ✅ |
| Kolom `deletedAt` | Ada, dipakai oleh `findByEmail`. | ✅ |
| Kolom `role` | Ada, dipakai. | ✅ |
| **Missing kolom**: `lastLoginAt` | Tidak ada; tidak bisa deteksi akun tidak aktif | — | Low |
| **Missing kolom**: `failedLoginAttempts`, `lockedUntil` | Tidak ada; tidak mendukung lockout | — | Medium |
| **Missing kolom**: `klinikId` / `clinicId` di users | Tidak ada; klaim JWT `klinikId` tidak bisa diambil dari DB | `schema.prisma User model` | Medium |
| Kolom `email` unique | Sudah unique di schema | ✅ |
| Kolom yang tidak dipakai auth | Tidak ada finding — semua kolom yang ada dipakai di jalur login | — | ✅ |
| Redis (DB Design §6) | `blocklist:jwt:{jti}`, `otp:reset:{email}` — **tidak digunakan**. Redis hidup (BullMQ) tapi tidak dipakai auth. | — | Medium |

## 7. Duplicate / Repeated Logic

| Area | Finding | Verdict |
|---|---|---|
| bcrypt config | Cost factor 12 didefinisikan di dua tempat: `users.service.ts:39` dan `users.service.ts:117` sebagai literal `12`. Kalau perlu diubah, ada dua titik ubah. | Minor — extract constant `BCRYPT_COST = 12` |
| JWT secret lookup | Digunakan di `auth.module.ts:20` dan `jwt.strategy.ts:20`. Keduanya via ConfigService, tidak ada duplikasi kode. | ✅ |
| Guards | `JwtAuthGuard` (1 baris subclass) dan `RolesGuard` — tidak duplikat | ✅ |
| Auth-related fetch | Login fetch dilakukan lewat `apiClient.login`; frontend tidak memanggil `fetch('/auth/login')` di tempat lain | ✅ |

## 8. Dead Code Candidates

| File / Simbol | Status | Alasan / Referensi |
|---|---|---|
| `apps/api/src/auth/auth.controller.spec.ts` | **Perlu diverifikasi** | Setelah perubahan `auth.controller.ts` (hapus envelope manual), test lama mungkin masih meng-asert bentuk `{ success, data }`. Bukan dead code, tapi kemungkinan **BROKEN test** |
| `apps/api/src/auth/auth.service.spec.ts` | Live | Digunakan `npm test` |
| `apps/api/src/auth/auth.service.property.spec.ts` | Live | Fast-check test untuk bcrypt cost invariant |
| `apps/api/src/common/decorators/current-user.decorator.ts` | Live | Diimpor oleh controller lain (users, patients, dll.) — bukan dead code |
| `apps/api/src/common/guards/jwt-auth.guard.ts` (1-line wrapper) | Live tapi thin | Digunakan sebagai `@UseGuards(JwtAuthGuard, RolesGuard)` di semua controller berwenang |

**Tidak ada dead code definitif di jalur auth**. Yang perlu ditindaklanjuti: verifikasi jest suite pasca perubahan controller.

## 9. NCR Gap Matrix

| ID | Menu | FR ID | Layer | Finding | Evidence | Root Cause | Impact | Priority | Required Action | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| NCR-01-01 | Login | F-AUTH-01, API §5.1 | Backend | Endpoint `POST /auth/refresh` tidak ada | file listing `apps/api/src/auth/` | Fitur belum dibuat | Sesi jadi panjang (1d) atau force re-login | P2 | Implement refresh flow dengan refresh token (httpOnly cookie) + endpoint refresh | Open |
| NCR-01-02 | Login | F-AUTH-02 | Backend | JWT payload tidak berisi `klinikId` | `auth.service.ts:24` | Belum diimplementasi | Endpoint multi-klinik masa depan tidak bisa filter otomatis by klinik | P3 | Tambah kolom `clinicId` di users, sertakan di payload JWT | Open |
| NCR-01-03 | Login | API §5.1 | Backend + DB | Logout tidak invalidate token (tidak ada blocklist Redis) | `auth-context.tsx:75-84` cuma clear localStorage | DB Design §6 spec ada tapi belum diimpl | Token yg bocor tetap valid sampai expiry | P2 | Tambah `POST /auth/logout` yang push jti ke Redis `blocklist:jwt:{jti}` dengan TTL sisa umur token; JwtStrategy validate cek blocklist | Open |
| NCR-01-04 | Login | SRS §3.1 | Backend | Tidak ada rate limit di `/auth/login` | dependency `@nestjs/throttler` tidak ada | Belum dibuat | Rentan brute force / credential stuffing | **P1** | Install `@nestjs/throttler`, apply `@Throttle({default:{limit:5, ttl:60000}})` di login endpoint | Open |
| NCR-01-05 | Login | Frontend | Frontend | Middleware Next.js pakai cookie flag, bukan verifikasi JWT | `middleware.ts:19-27` | Trade-off: JWT ada di localStorage (bukan cookie) | Client-side redirect gate lemah (server tetap aman) | P3 | Sertakan minimal `elis_token` sebagai HttpOnly cookie saat login sukses, verify signature ringan di middleware | Open |
| NCR-01-06 | Login | Backend | Backend | `login(@Body() loginDto: any)` tanpa DTO class | `auth.controller.ts:12` | Belum dibuat DTO | Payload non-string diterima → error tak konsisten, potensi eksploitasi input yang tidak divalidasi | **P1** | Buat `LoginDto { @IsEmail() email; @IsString() @MinLength(1) password; }`, ubah param controller | Open |
| NCR-01-07 | Login | SRS §3.1 | Backend + DB | Login attempt (success/fail) tidak dicatat di `audit_logs` | `auth.service.ts` tidak call `AuditService` | Belum diintegrasi | Tidak bisa investigate incident login gagal berulang | P2 | Injeksi `AuditService` ke `AuthService`, log `LOGIN_SUCCESS`/`LOGIN_FAILED` dengan ipAddress | Open |
| NCR-01-08 | Login | Backend | Backend | JWT_EXPIRATION default `1d`, deviasi dari FS `15m` | `apps/api/.env.example` | Untuk kenyamanan dev tapi menyimpang dari spec | Window token bocor jauh lebih lebar | P2 | Set `JWT_EXPIRATION=15m` untuk access token + refresh token 7 hari | Open |
| NCR-01-09 | Login | Frontend | Frontend | Middleware tidak validasi token; user bisa set cookie manual | `middleware.ts` | Design trade-off | Cosmetic bypass; server tetap block | P4 | Sudah dicakup di NCR-01-05 | Open |
| NCR-01-10 | Login | Backend | Test | Test suite lama untuk `auth.controller` kemungkinan tak sinkron pasca hapus envelope manual (commit 6dc803b) | `auth.controller.spec.ts` belum diverifikasi | Test tidak dijalankan | Regresi bisa tak terdeteksi | P3 | Jalankan `npm test auth` dan sesuaikan asertsi ke envelope tunggal | Open |

## 10. Required Actions (Prioritas)

1. **P1** — Buat `LoginDto` class + apply validation (NCR-01-06). Effort: S.
2. **P1** — Aktifkan rate limiter di `/auth/login` (NCR-01-04). Effort: S.
3. **P2** — Implement `POST /auth/logout` dengan Redis blocklist (NCR-01-03). Effort: M.
4. **P2** — Set `JWT_EXPIRATION=15m` + refresh token flow (NCR-01-01, NCR-01-08). Effort: M.
5. **P2** — Login audit log (NCR-01-07). Effort: S.
6. **P3** — Tambah `clinicId` claim (NCR-01-02) + kolom di users. Effort: S.
7. **P3** — Sync test suite (NCR-01-10). Effort: S.
8. **P4** — Perkuat middleware Next.js (NCR-01-05, NCR-01-09). Effort: M.

## 11. FS / FR Update yang Direkomendasikan

Rekomendasi patch untuk `FS functional spec Lab.docx` versi berikutnya (dan SRS §2.1):

- **FR-AUTH-01**: tandai status *PARTIAL* — hanya accessToken; refreshToken dan logout belum ada. Tambah tanggal target implementasi.
- **FR-AUTH-02**: sesuaikan default `JWT_EXPIRATION`; jelaskan mengapa klinikId belum ada (menunggu multi-clinic phase).
- **Tambah FR-AUTH-04** (baru): *Login rate limiting 5 req/menit/IP dengan Redis*. Status: MISSING.
- **Tambah FR-AUTH-05** (baru): *Audit log semua percobaan login (success & failed) dengan action=LOGIN dan ipAddress*. Status: MISSING.
- **Tambah FR-AUTH-06** (baru): *Login payload divalidasi via DTO class dengan @IsEmail dan @IsString*. Status: MISSING.
- **Cross-ref ke `docs/17-Audit/rbac-review.md`** untuk RBAC yang sudah diaudit terpisah.

## 12. Reused Prior Audit References

Selama audit ini, saya menyitir dan tidak duplikasi temuan berikut:

- `docs/17-Audit/rbac-review.md` — audit RBAC end-to-end (RolesGuard, hierarki role). Temuan hierarki role sudah dicatat di sana; tidak diulang di sini.
- `docs/17-Audit/_inventory/rbac-implementation-current.md` — pemetaan Roles decorator di controllers.
- `docs/17-Audit/_inventory/functional-gap-report.md` — FG-ADM-001..003 (User management), disebut cross-ref untuk menu 02 nanti.
- `docs/17-Audit/_inventory/feature-coverage-matrix.md` — FR-AUTH-* tidak tercantum di matrix (matrix fokus lab); menu Login diinventarisasi baru di dokumen ini.

## 13. Note on No-Code-Modification Attestation

Audit ini murni analitis. Tidak ada perubahan kode selama sesi audit. Perubahan sebelumnya
di `auth.controller.ts` (commit `6dc803b`) adalah bug fix bukan bagian dari audit ini,
dan sudah tercatat sebagai referensi bagaimana envelope duplikat diperbaiki.
