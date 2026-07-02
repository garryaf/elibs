# ADR-0009: API Gateway

## Context
Arsitektur sistem kita saat ini adalah Modular Monolith. Namun, visi produk ke depan adalah ber-evolusi menjadi ekosistem aplikasi multi-klinik (SaaS) yang berpotensi melibatkan integrasi dari berbagai pihak ketiga dan mobile apps, sehingga kemungkinan pemisahan ke Microservices (Notification Service, Report Service) cukup besar.

## Problem
Bagaimana cara merutekan lalu lintas eksternal (client web, aplikasi mobile, klinik mitra) ke berbagai bagian dari backend tanpa mengunci arsitektur pada satu *entry point* monolitik secara permanen.

## Alternative
1. **Direct Routing**: Klien langsung memanggil endpoint ke Node.js Monolith. Jika ada perubahan layanan, klien harus mengganti URL.
2. **Reverse Proxy Biasa**: Menggunakan NGINX murni untuk proxying.
3. **API Gateway / Edge Proxy**: Menggunakan solusi API Gateway cerdas (seperti Kong, KrakenD, Traefik, atau NestJS Gateway layer) untuk memusatkan *cross-cutting concerns*.

## Pros
- **API Gateway**:
  - Sentralisasi rate-limiting, SSL termination, dan perlindungan DDoS dasar.
  - Menyembunyikan kompleksitas infrastruktur backend dari *client*. Client selalu memanggil satu URL (misal `api.elis.id`), dan API gateway yang menentukan apakah itu dilayani oleh monolith atau microservice baru.
  - Membantu transisi "Strangler Pattern" jika nanti kita mulai memotong modul dari Monolith menjadi Microservice (Gateway hanya tinggal mengarahkan rute API ke service baru).

## Cons
- **API Gateway**:
  - Menambah "hop" jaringan yang bisa (sedikit) meningkatkan latency.
  - Membutuhkan konfigurasi infrastruktur tambahan.

## Selected
**Menggunakan API Gateway Architecture (Traefik / NGINX / Kong)**

## Consequence
1. Pada Phase 1 (Monolith), API Gateway hanya akan meneruskan (pass-through) request ke aplikasi NestJS, namun tetap berfungsi untuk Rate Limiting dan SSL Termination.
2. Klien Frontend (Next.js) tidak pernah mengetahui arsitektur di belakang Gateway.

## Future Consideration
Untuk strategi Microservices ke depannya, Gateway ini akan menjadi pilar utama. Ketika kita memisahkan layanan otentikasi (Auth Service) dari Monolith, kita cukup mengubah rute di Gateway (`/api/auth/*` -> `Auth Service`, `/api/v1/*` -> `Monolith`). Ini memastikan perpindahan arsitektur (zero downtime migration) tanpa klien perlu melakukan pembaruan versi.
