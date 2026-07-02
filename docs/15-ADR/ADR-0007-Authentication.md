# ADR-0007: Authentication & Authorization

## Context
Sistem eLIS diakses oleh berbagai aktor (Staf, Kasir, Teknisi, Dokter, Admin) yang memiliki hak akses (privileges) berbeda. Mengamankan API dan mengelola sesi pengguna adalah hal krusial untuk mencegah kebocoran data medis.

## Problem
Memilih strategi autentikasi (identifikasi user) dan otorisasi (hak akses) yang aman, scalable, dan cocok untuk aplikasi SPA (Single Page Application) / mobile apps di masa depan.

## Alternative
- **Autentikasi**: Stateful Session (Cookies + Redis), Stateless JWT, OAuth2 / OIDC.
- **Otorisasi**: ACL (Access Control List), RBAC (Role-Based Access Control), ABAC (Attribute-Based Access Control).

## Pros
- **JWT (JSON Web Token)**: 
  - Stateless: Server tidak perlu mengecek database/Redis setiap kali request masuk (mengurangi load database).
  - Scalable: Sangat mudah diintegrasikan jika aplikasi berkembang menjadi microservices.
  - Format standar yang didukung luas oleh berbagai library.
- **Refresh Token Strategy**:
  - Access Token dibuat berumur pendek (misal: 15 menit) demi keamanan.
  - Refresh Token berumur panjang (misal: 7 hari) disimpan dengan aman (HttpOnly Cookie / secure storage) untuk mendapatkan Access Token baru, meminimalisir risiko pencurian token.
- **RBAC**:
  - Cukup simpel untuk diimplementasikan namun cukup powerful untuk kebutuhan eLIS saat ini (memetakan pengguna ke peran tertentu seperti "KASIR", "TEKNISI").

## Cons
- **JWT**:
  - *Invalidation* (mematikan token sebelum masa berlakunya habis, misal saat user di-kick) sulit dilakukan secara native. Harus diatasi dengan menggunakan Blocklist di Redis.
- **RBAC**:
  - Kurang fleksibel jika hak akses sangat granular (misal: "hanya bisa melihat order X di klinik Y"). Untuk Phase 1, ini masih bisa ditangani di level kode logika aplikasi.

## Selected
**JWT (Access Token + Refresh Token) dengan Role-Based Access Control (RBAC)**

## Consequence
1. Backend NestJS akan men-generate Access Token (umur pendek, disimpan di memori frontend) dan Refresh Token (umur panjang, disimpan di HttpOnly Cookie).
2. Setiap endpoint API harus dilindungi oleh Guard (di NestJS) yang memeriksa JWT dan mencocokkan Role (RBAC).
3. Redis digunakan untuk menyimpan blocklist token (untuk fitur logout).

## Future Consideration
Untuk Phase 3, saat platform multi-klinik berkembang, kita mungkin perlu bermigrasi ke ABAC (Attribute-Based Access Control) di mana otorisasi ditentukan oleh ID Klinik atau ID Tenant di dalam token (Multi-Tenancy). Atau beralih menggunakan Keycloak/Auth0 untuk manajemen identitas skala penuh.
