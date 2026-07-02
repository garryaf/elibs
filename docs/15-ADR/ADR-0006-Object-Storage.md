# ADR-0006: Object Storage

## Context
Aplikasi eLIS akan menghasilkan puluhan hingga ratusan file PDF setiap harinya untuk hasil laboratorium. Selain itu, sistem perlu menyimpan file pendukung seperti logo lab, surat rujukan (upload), dan mungkin rekam medis pendukung lainnya.

## Problem
Menentukan arsitektur penyimpanan file yang dapat membesar (scalable) tanpa membebani server aplikasi utama dan memastikan aksesibilitas file secara aman.

## Alternative
1. **Local File System**: Menyimpan file langsung di disk server backend (contoh: folder `/uploads`).
2. **AWS S3 / Cloud Storage Managed**: Menyimpan file di layanan cloud.
3. **MinIO (Self-hosted Object Storage)**: Layanan object storage yang kompatibel dengan API AWS S3 namun dapat di-deploy mandiri.

## Pros
- **MinIO**:
  - API 100% kompatibel dengan AWS S3, artinya kode aplikasi (SDK) tidak perlu diubah jika nanti pindah ke AWS S3 yang sebenarnya.
  - Memisahkan storage dari computing node, sehingga backend bebas statis (stateless) dan lebih mudah di-scale up (Dockerized tanpa mount local storage untuk file statis).
  - Bisa di-deploy di infrastruktur on-premise (menjaga kedaulatan data jika diperlukan regulasi).

## Cons
- **MinIO**:
  - Perlu memelihara satu layanan tambahan di luar database dan aplikasi.
  - Perlu manajemen backup dan volume secara terpisah.

## Selected
**MinIO**

## Consequence
1. Tidak ada file persisten yang disimpan di *local disk* server aplikasi backend. 
2. Semua operasi unggah/unduh (upload/download) akan menggunakan library klien AWS S3 (seperti AWS SDK for JavaScript) yang diarahkan ke endpoint MinIO lokal.
3. Database hanya akan menyimpan URL atau *object key* dari file tersebut, bukan file aslinya.

## Future Consideration
Pada Phase 3 (SaaS), untuk memudahkan pengelolaan dan menjamin ketersediaan global (CDN), kita dapat memigrasikan bucket dari MinIO lokal langsung ke AWS S3 (managed service) tanpa mengubah satu baris pun logika kode di backend.
