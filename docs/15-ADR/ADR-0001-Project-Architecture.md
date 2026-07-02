# ADR-0001: Project Architecture

## Context
Enterprise Laboratory Information System (eLIS) dirancang untuk beroperasi sebagai sistem internal bagi satu laboratorium pada tahap awal (Phase 1), namun memiliki visi strategis untuk berkembang menjadi platform laboratorium rujukan multi-klinik (Phase 2) dan SaaS (Phase 3). Sistem ini harus bisa dikembangkan dengan cepat di awal, namun tidak boleh menjadi sistem legacy yang sulit di-scale nantinya.

## Problem
Memilih pola arsitektur backend yang menyeimbangkan antara kecepatan pengembangan awal (time-to-market) dan skalabilitas jangka panjang. 

## Alternative
1. **Monolithic Architecture**: Semua kode dalam satu codebase tanpa batasan domain yang jelas.
2. **Microservices Architecture**: Setiap domain bisnis (Patient, Billing, Lab) dipecah menjadi service independen sejak hari pertama.
3. **Modular Monolith**: Satu codebase dan satu deployment unit, tetapi kode dipisahkan ke dalam modul-modul domain bisnis yang independen secara logika (strict boundary).

## Pros
- **Modular Monolith**: 
  - Deployment sangat mudah (hanya satu unit).
  - Tidak ada overhead network antar modul (latency rendah, tidak perlu distributed tracing di awal).
  - Refactoring lintas domain lebih mudah karena masih dalam satu repository dan satu proses.
  - Mempersiapkan jalan yang jelas menuju Microservices dengan domain yang sudah terisolasi.

## Cons
- **Modular Monolith**:
  - Membutuhkan disiplin tinggi dari developer untuk menjaga batas-batas antar modul (boundaries) agar tidak terjadi tight-coupling.
  - Jika satu modul mengalami memory leak atau CPU spike, akan berdampak pada keseluruhan aplikasi.

## Selected
**Modular Monolith**

## Consequence
1. Pengembangan aplikasi akan dilakukan dalam satu repository (monorepo).
2. Kode akan diorganisasikan per domain (contoh: modul Authentication, Patient, Billing, Laboratory).
3. Modul tidak boleh mengakses database modul lain secara langsung; komunikasi antar modul harus melalui interface (service/API internal).
4. Kita perlu menerapkan linting/aturan yang ketat untuk mencegah import antar domain yang tidak sah.

## Future Consideration
Pada Phase 2 atau Phase 3 (SaaS), ketika beban operasional spesifik meningkat drastis (misalnya, modul generate PDF report yang berat secara komputasi), modul tersebut akan dengan mudah di-extract menjadi Microservice yang berdiri sendiri (Independent Microservice).
