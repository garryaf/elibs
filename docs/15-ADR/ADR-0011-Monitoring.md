# ADR-0011: Monitoring & Logging

## Context
Sebagai sistem kesehatan skala enterprise, eLIS tidak boleh dibiarkan beroperasi layaknya "kotak hitam" (black box). Jika terjadi masalah (error) atau kelambatan (latency) saat memproses order pasien, tim engineering harus segera tahu penyebabnya sebelum user menyadari.

## Problem
Menentukan standard platform pemantauan (monitoring) metrik kinerja aplikasi (CPU, memori, API throughput) dan manajemen log terpusat (centralized logging).

## Alternative
1. **Ad-hoc Logging**: Hanya mengandalkan console.log atau menulis file `.log` di server.
2. **APM Proprietary (Datadog, New Relic)**: Sangat lengkap namun berbiaya tinggi untuk fase awal.
3. **Open-Source Cloud Native Stack (Prometheus + Grafana + PLG/ELK)**: Menggunakan standar de facto cloud-native.

## Pros
- **Prometheus**: Dirancang khusus untuk arsitektur modern (pull-based), men-scrape metrik dengan efisiensi sangat tinggi.
- **Grafana**: Visualisasi data yang luar biasa intuitif, dengan ribuan dashboard komunitas yang siap pakai.
- **Logging Terpusat (contoh: Pino/Winston ke Grafana Loki)**: Log ditulis dalam format JSON (structured logging) dan dapat difilter atau dikorelasi (dengan UUID *Request ID*) lintas modul atau mikroservis.

## Cons
- **Prometheus & Grafana**: 
  - Memerlukan instalasi dan pemeliharaan server tambahan untuk memantau.
  - Kurva pembelajaran kueri log (LogQL) atau metrik (PromQL).

## Selected
**Prometheus (Metrik) + Grafana (Dashboard) + Structured JSON Logging (Grafana Loki/ELK)**

## Consequence
1. Framework backend NestJS harus dikonfigurasi untuk mengekspos endpoint `/metrics` di setiap layanan.
2. Sistem *logging* wajib menggunakan format JSON terstruktur (structured logging), bukan format teks biasa.
3. Setiap request HTTP yang masuk harus diinjeksi sebuah unik *Trace ID/Correlation ID* agar log dapat dilacak end-to-end dari frontend API gateway hingga ke kueri database.

## Future Consideration
Jika infrastruktur bertumbuh hingga menjadi sangat kompleks dan pemeliharaan platform monitoring internal terlalu menguras *engineering time*, sistem siap untuk di-switch (dipindahkan) ke solusi managed services seperti Datadog (berkat standar metrics dan *Trace ID* yang sudah diterapkan sejak awal).
