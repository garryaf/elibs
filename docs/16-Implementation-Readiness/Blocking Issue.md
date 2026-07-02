# Blocking Issue

Ini adalah daftar isu kritis yang bertindak sebagai "Blocker" mutlak. Selama issue ini belum terselesaikan, implementasi kode (coding) **DILARANG KERAS** untuk dimulai.

## 1. BLOCKER: Missing System Requirement Specification (SRS)
- **Alasan**: Programmer tidak memiliki petunjuk flow data dan object state (State & Sequence Diagram). Coding berdasarkan BRD saja akan menghasilkan sistem yang rapuh terhadap *edge case*.
- **Tindakan Penyelesaian**: Lengkapi Tahap 2 (SRS).

## 2. BLOCKER: Missing Database Architecture
- **Alasan**: Backend di NestJS (Prisma) membutuhkan struktur tabel yang fix. Tanpa ERD, akan terjadi pembongkaran skema (schema rebuilds) yang membuang waktu dan berisiko merusak integritas data rekam medis.
- **Tindakan Penyelesaian**: Lengkapi Tahap 4 (Database).

## 3. BLOCKER: Missing UI/UX High Fidelity Design
- **Alasan**: Sesuai arahan *"Semua UI harus konsisten"* dan *"JANGAN menggunakan biru rumah sakit"*, tim Frontend Next.js / Tailwind tidak dapat menerjemahkan ide abstrak tanpa adanya Mockup/Design System yang final.
- **Tindakan Penyelesaian**: Lengkapi Tahap 3 (UI/UX).

## 4. BLOCKER: Missing API Blueprint
- **Alasan**: Pengembangan secara modular monolith mewajibkan isolasi domain. Tanpa API spec, Frontend dan Backend tidak bisa bekerja secara paralel, dan integrasi di akhir akan gagal (Integration Hell).
- **Tindakan Penyelesaian**: Lengkapi Tahap 7 (API).
