# ADR-0002: Backend Framework

## Context
Membangun backend untuk eLIS yang handal, maintainable, serta sejalan dengan arsitektur Modular Monolith yang telah dipilih. Sistem ini akan di-maintenance oleh tim enterprise dan harus mendukung skala besar di kemudian hari.

## Problem
Menentukan framework backend Node.js dan bahasa pemrograman pendukung yang cocok untuk level enterprise.

## Alternative
- **Framework Node.js**: Express.js, Fastify, NestJS, Koa.
- **Bahasa Pemrograman**: JavaScript, TypeScript.
- **Alternatif Bahasa Lain**: Golang, Spring Boot (Java), Laravel (PHP).

## Pros
- **NestJS**: 
  - Memiliki arsitektur bawaan berbasis modul (Out-of-the-box Modular Architecture) yang sangat cocok dengan Modular Monolith.
  - Dependency Injection terintegrasi yang memudahkan testing dan manajemen dependensi.
  - Native support untuk TypeScript.
  - Ekosistem yang kuat dan terdokumentasi dengan baik, standar de-facto untuk Node.js enterprise.
- **TypeScript**: 
  - Type-safety mengurangi bug di production.
  - Auto-completion dan developer experience (DX) yang superior.
  - Dokumentasi kode sebagai bagian dari tipe data.

## Cons
- **NestJS & TypeScript**:
  - Kurva pembelajaran yang sedikit lebih curam dibandingkan Express biasa.
  - Overhead performa framework dibandingkan microframework seperti Fastify (meski NestJS bisa menggunakan Fastify sebagai HTTP adapter).
  - Cukup banyak boilerplate code.

## Selected
**NestJS menggunakan TypeScript (dengan Fastify/Express HTTP Adapter)**

## Consequence
1. Seluruh tim backend harus mengikuti pola arsitektur NestJS (Controllers, Providers, Modules).
2. Penulisan kode diwajibkan menggunakan TypeScript dengan Strict Mode aktif.
3. Setiap domain bisnis akan menjadi Module yang terpisah di dalam NestJS.

## Future Consideration
NestJS memiliki dukungan natif untuk microservices (TCP, Redis, Kafka, gRPC). Jika di masa depan sistem dipecah menjadi microservices, transisi codebase NestJS akan sangat smooth.
