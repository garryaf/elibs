# ADR-0012: Security

## Context
eLIS menyimpan data sensitif: rekam medis, NIK pasien, riwayat kesehatan, dan transaksi finansial. Mengingat implikasi hukum yang ketat (seperti UU Perlindungan Data Pribadi/UU PDP Indonesia dan standar HIPAA), keamanan bukan lagi fitur sekunder melainkan prioritas utama (Security by Design).

## Problem
Menetapkan dan menerapkan standar keamanan minimum yang wajib diimplementasikan di semua level arsitektur dan pengembangan aplikasi.

## Alternative
Keamanan bukanlah hal opsional. Pertimbangannya adalah seberapa dalam tingkat *hardening* yang dibutuhkan pada fase perdana ini tanpa menghambat kecepatan pengiriman produk secara berlebihan.

## Pros
Menerapkan protokol OWASP dan enkripsi memberikan rasa aman dan mencegah risiko legal dan reputasi bagi laboratorium.

## Cons
Enkripsi dan validasi ketat menyebabkan penambahan overhead performa (CPU) dan memerlukan implementasi *key management* yang disiplin.

## Selected
**OWASP Top 10 Compliance, API Rate Limiting, Mandatory Audit Trail, dan AES-256 Encryption**

## Consequence
1. **OWASP Top 10**: Semua input divalidasi ketat (menggunakan library `class-validator` / `zod`). Proteksi XSS (via React/Next.js native behavior), CSRF perlindungan, dan SQL Injection (ditangani oleh Prisma ORM) adalah wajib. Middleware Helmet akan digunakan untuk *secure HTTP Headers*.
2. **Rate Limiting**: Setiap endpoint, terutama Authentication (Login/OTP), wajib memiliki batasan request (Rate Limiter via Redis) untuk mencegah *brute force* dan DDoS.
3. **Audit Trail**: Pembuatan sistem Audit Log yang meng-intercept setiap operasi mutasi data (Create, Update, Delete) di database, mencatat "siapa (User ID)", "melakukan apa (Aksi)", "kapan (Timestamp)", beserta "data sebelum dan sesudah" secara permanen dan tidak dapat diubah (immutable).
4. **Encryption at Rest**: Menggunakan algoritma enkripsi kuat (AES-256) untuk mengenkripsi fields di database yang secara hukum diidentifikasi sebagai PII (Personally Identifiable Information, contoh: NIK).

## Future Consideration
Fase lanjutan akan mempertimbangkan penetrasi pengujian periodik (Penetration Testing) oleh pihak ketiga profesional. Juga penerapan enkripsi end-to-end yang lebih ketat, serta integrasi manajemen key cloud yang canggih (KMS - Key Management Service) seiring peralihan menuju Phase 3 (Multi-tenant SaaS).
