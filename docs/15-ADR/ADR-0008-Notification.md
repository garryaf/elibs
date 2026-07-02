# ADR-0008: Notification

## Context
Salah satu fitur krusial eLIS adalah mengirimkan notifikasi otomatis beserta PDF hasil laboratorium yang telah di-approve kepada pasien melalui Email dan WhatsApp.

## Problem
Pengiriman pesan via jaringan eksternal (SMTP server atau WhatsApp API Vendor) memakan waktu yang bervariasi (bisa sampai beberapa detik). Jika pengiriman dilakukan secara sinkron, response API kepada user (Dokter/Teknisi) akan sangat lambat atau bahkan time-out.

## Alternative
1. **Synchronous (Inline)**: Kirim notifikasi dalam *request-response cycle* yang sama.
2. **Simple Asynchronous**: Jalankan proses di background Node.js tanpa antrean (misal: `Promise.all` tanpa `await` respon).
3. **Queue-Based Asynchronous (Message Broker)**: Masukkan task pengiriman ke dalam antrean terpisah yang dikerjakan oleh worker.

## Pros
- **Queue-Based (menggunakan BullMQ + Redis)**:
  - Respon API instan (hanya memasukkan task ke antrean).
  - Memiliki fitur retry otomatis jika vendor WhatsApp/Email sedang down.
  - Memiliki fitur rate limiting (menghindari diblokir oleh vendor karena mengirim terlalu banyak pesan per detik).
  - Tahan banting (Resilient): Jika server crash, task tidak akan hilang dan akan dilanjutkan saat server hidup kembali.

## Cons
- **Queue-Based**:
  - Arsitektur menjadi lebih kompleks (membutuhkan Redis dan setup worker).
  - Perlu membuat dashboard monitor untuk melacak antrean yang gagal (Dead Letter Queue).

## Selected
**Queue-Based Asynchronous menggunakan BullMQ (berbasis Redis)**

## Consequence
1. Akan ada dua antrean terpisah: `email-queue` dan `wa-queue`.
2. Saat dokter klik "Approve", backend hanya meng-update database dan mem-publish 2 job ke antrean tersebut, lalu segera mengembalikan response HTTP 200 OK ke dokter.
3. Worker terpisah (di NestJS module) akan mendengarkan antrean tersebut, men-generate/mengunduh PDF dari MinIO, dan mengirimkannya melalui API vendor eksternal.
4. Perlu mekanisme *logging* yang baik jika pesan gagal dikirim setelah sekian kali retry.

## Future Consideration
Seiring bertambahnya volume (ratusan ribu notifikasi per hari), worker untuk notifikasi ini bisa dipisahkan menjadi *independent microservice* (Notification Service) yang di-deploy terpisah dari monolith eLIS utama, mendengarkan via RabbitMQ atau Kafka.
