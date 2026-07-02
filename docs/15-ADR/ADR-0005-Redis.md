# ADR-0005: Redis

## Context
Sistem eLIS tidak hanya memproses request HTTP secara langsung, tetapi juga perlu memproses task background, menyimpan state sementara yang cepat diakses, dan mengamankan pengelolaan sesi.

## Problem
Diperlukan in-memory datastore yang cepat dan andal untuk mengatasi berbagai kebutuhan caching dan background processing.

## Alternative
- **Caching**: Memcached, Redis, In-memory Node.js (seperti node-cache).
- **Queue**: RabbitMQ, Kafka, AWS SQS, Redis (BullMQ).
- **Session/OTP**: Database SQL (lambat), JWT (stateless), Redis.

## Pros
- **Redis**: 
  - Solusi "Swiss Army Knife" yang teruji: satu infrastruktur yang dapat digunakan untuk Cache, Queue, dan Session Store sekaligus.
  - Performa sangat cepat (in-memory).
  - Ekosistem Queue di Node.js (khususnya BullMQ) sangat matang dan dibangun di atas Redis.
  - Mendukung TTL (Time To Live) bawaan, cocok untuk Session dan OTP.

## Cons
- **Redis**:
  - Data bersifat in-memory, sehingga besaran data dibatasi oleh kapasitas RAM (walaupun bisa di-persist ke disk secara asinkron).
  - Menambah kompleksitas infrastruktur deployment (membutuhkan instance Redis).

## Selected
**Redis** sebagai In-Memory Datastore Utama.

## Consequence
Redis akan digunakan untuk:
1. **Cache**: Menyimpan master data yang jarang berubah (seperti tarif, jenis pemeriksaan) untuk mengurangi load ke PostgreSQL.
2. **Queue (via BullMQ)**: Menangani job asinkron yang lambat, yaitu **Email Queue**, **WhatsApp Queue**, dan **PDF Generation Queue**.
3. **Session & Auth**: Mengelola blocklist JWT (untuk logout) atau menyimpan refresh token session.
4. **OTP**: Menyimpan OTP reset password dengan batas waktu (TTL) 5 menit.

## Future Consideration
Jika aplikasi mencapai skala besar (jutaan background job), kita bisa memisahkan Redis instance khusus untuk Queue dan instance terpisah untuk Cache, atau mempertimbangkan migrasi ke RabbitMQ/Kafka jika pola messaging semakin kompleks (Pub/Sub antar microservice).
