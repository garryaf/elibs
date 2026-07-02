# API Documentation & Specification
# Enterprise Laboratory Information System (eLIS)

| Field            | Detail                                       |
|------------------|----------------------------------------------|
| **Document ID**  | API-eLIS-2026-001                            |
| **Version**      | 1.0                                          |
| **Status**       | Draft                                        |
| **Date Created** | 2026-06-30                                   |

---

## 1. Standar Desain API

- **Arsitektur**: RESTful API.
- **Protokol**: HTTPS / TLS 1.3 (Mandatory).
- **Format Pertukaran Data**: application/json.
- **Versioning**: Semua endpoint dilindungi oleh path versioning `/api/v1/`.

## 2. Authentication & RBAC

- **Mekanisme**: JWT (JSON Web Token).
- **Penempatan Token**:
  - `Access Token`: Dikirim oleh klien melalui header HTTP: `Authorization: Bearer <TOKEN>`.
  - `Refresh Token`: Dikirim oleh backend melalui Cookie (Flags: `HttpOnly`, `Secure`, `SameSite=Strict`).
- **Authorization**: Diatur melalui NestJS Guards berbasis RBAC.

## 3. Response Standard (Envelope Pattern)

Sistem menggunakan format pembungkus (envelope) yang seragam untuk semua endpoint, guna memudahkan *parsing* di frontend (TanStack Query).

### 3.1 Response Sukses
```json
{
  "success": true,
  "message": "Data pasien berhasil diambil",
  "data": {
    "id": "uuid-1234",
    "name": "Budi Santoso"
  },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 120,
    "totalPages": 12
  }
}
```
*(Catatan: Blok `meta` hanya muncul pada endpoint yang mengembalikan tipe list/array dengan pagination).*

### 3.2 Response Gagal / Error
```json
{
  "success": false,
  "errorCode": "ERR_VALIDATION",
  "message": "Validasi input gagal",
  "errors": [
    { "field": "nik", "message": "NIK wajib berisi 16 digit angka" }
  ],
  "traceId": "req-uuid-9876-..."
}
```
*(Catatan: `traceId` disediakan untuk mencari detail error di Grafana Loki / Logs).*

## 4. Query Parameters Standard

Untuk endpoint GET (List Data), parameter berikut menjadi standar:
- `?page=1` : Nomor halaman (Pagination).
- `?limit=20` : Jumlah item per halaman.
- `?sort=createdAt:desc` : Sorting (Format: `field:direction`).
- `?search=budi` : Pencarian teks penuh (Global search).
- `?status=PAID` : Contoh pemfilteran field spesifik.

## 5. Daftar API Core (High-Level)

### 5.1 Modul Authentication (`/api/v1/auth`)
- `POST /login` : Autentikasi user, kembalikan JWT.
- `POST /refresh` : Dapatkan access token baru menggunakan refresh token cookie.
- `POST /logout` : Invalidate token (Blacklist ke Redis).
- `POST /otp-request` : Minta kode OTP untuk lupa password (Queue ke Email).

### 5.2 Modul Master Data (`/api/v1/master`)
- `GET /tests` : List semua jenis pemeriksaan.
- `POST /tests` : [RBAC: ADMIN] Tambah jenis pemeriksaan baru.
- `GET /clinics` : List klinik mitra.
- `GET /doctors` : List dokter rujukan.

### 5.3 Modul Pasien (`/api/v1/patients`)
- `GET /` : List pasien dengan paginasi.
- `POST /` : Daftarkan pasien baru.
- `GET /:id` : Detail pasien beserta riwayat lab-nya.

### 5.4 Modul Order & Billing (`/api/v1/orders`)
- `POST /` : Buat order lab baru (Status PENDING_PAYMENT).
- `POST /:id/pay` : Proses pembayaran, cetak invoice, ganti status ke PAID.
- `GET /:id/barcode` : Generate/Get base64 barcode gambar untuk dicetak.

### 5.5 Modul Laboratorium (`/api/v1/lab`)
- `GET /queue` : List order yang statusnya `PAID` atau `SAMPLE_COLLECTED`.
- `POST /:orderId/sample` : Konfirmasi sampel diterima lab (barcode scan).
- `PUT /:orderId/results` : Input hasil lab parameter.
- `POST /:orderId/verify` : [RBAC: TEKNISI] Verifikasi hasil (Status VERIFIED).
- `POST /:orderId/approve` : [RBAC: DOKTER] Approval hasil (Status APPROVED, trigger PDF & Email Queue).

## 6. Dokumentasi Interaktif (OpenAPI)
Dokumentasi teknis menyeluruh (lengkap dengan schema payload dan testing form) akan di-generate otomatis oleh NestJS Swagger.
- Akses via: `https://api.elis.id/api/docs`
- Spesifikasi menggunakan standar **OpenAPI 3.0**.

---
**END OF API DOCUMENTATION**
