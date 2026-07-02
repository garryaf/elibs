# ADR-0004: Database

## Context
Data eLIS (pasien, riwayat medis, hasil lab, transaksi billing) sangat berelasi, kritis, dan membutuhkan konsistensi transaksi (ACID). Pada saat yang sama, tim membutuhkan kecepatan pengembangan dan type-safety pada lapisan ORM.

## Problem
Memilih sistem manajemen database relasional (RDBMS) dan Object-Relational Mapper (ORM) yang paling handal untuk transaksi kesehatan.

## Alternative
- **Database**: PostgreSQL, MySQL, SQL Server, Oracle.
- **ORM/Query Builder**: TypeORM, Sequelize, Prisma, Kysely.

## Pros
- **PostgreSQL**: 
  - Standard industri untuk database open-source yang sangat handal dan scalable.
  - Dukungan kuat untuk tipe data kompleks (JSONB, array) yang sangat berguna untuk menyimpan data dinamis seperti variasi hasil laboratorium.
  - Fitur indexing dan streaming replication yang advanced.
- **Prisma**:
  - Developer Experience (DX) terbaik dengan auto-generated & fully type-safe database client.
  - Migrasi database deklaratif yang mudah dimanage.
  - Sangat cocok dipadukan dengan TypeScript dan NestJS.

## Cons
- **PostgreSQL**: Manajemen dan tuning di level enterprise membutuhkan keahlian khusus (meskipun managed services seperti AWS RDS bisa menutupi kekurangan ini).
- **Prisma**: Query yang sangat kompleks (multi-level joins/aggregations besar) seringkali menghasilkan query SQL yang kurang efisien atau bahkan tidak didukung, sehingga memerlukan fallback ke raw SQL.

## Selected
**PostgreSQL sebagai Database dan Prisma sebagai ORM**

## Consequence
1. Seluruh skema database akan didefinisikan dalam `schema.prisma`.
2. Interaksi database dari backend wajib menggunakan Prisma Client yang ter-generate (type-safe).
3. Transaksi database (seperti insert order + billing) wajib menggunakan fitur Prisma Interactive Transactions untuk menjamin ACID.

## Future Consideration
Untuk laporan analitik (Dashboard Phase 2/3) yang membutuhkan agregasi jutaan baris data, kita akan menggunakan read-replica PostgreSQL dan jika Prisma menjadi bottleneck, kita akan beralih menggunakan Raw Query atau Query Builder seperti Kysely khusus untuk modul Laporan.
