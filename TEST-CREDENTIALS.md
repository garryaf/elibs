# Test Credentials

Kredensial untuk development dan testing. Jalankan `npx ts-node prisma/seeds/reset-passwords.ts` dari folder `apps/api` jika password tidak bekerja.

## Login URL

- Frontend: http://localhost:3000
- API: http://localhost:3001/api/v1/auth/login

## Akun Tersedia

| Email | Password | Role | Akses Menu |
|-------|----------|------|------------|
| admin@elis.local | Admin@1234 | SUPER_ADMIN | Semua menu |
| manager.siti@elis.local | Demo@1234 | MANAGER | Dashboard, Order, Lab, Reports |
| kasir@elis.local | Demo@1234 | KASIR | Order & Kasir, Billing |
| kasir.dian@elis.local | Demo@1234 | KASIR | Order & Kasir, Billing |
| cs.rina@elis.local | Demo@1234 | CS | Pasien, Kunjungan, Order |
| sampling@elis.local | Demo@1234 | SAMPLING | Laboratorium (Sampling) |
| sampling.agus@elis.local | Demo@1234 | SAMPLING | Laboratorium (Sampling) |
| analis@elis.local | Demo@1234 | ANALIS | Laboratorium (Input Hasil) |
| analis.maya@elis.local | Demo@1234 | ANALIS | Laboratorium (Input Hasil) |
| analis.budi@elis.local | Demo@1234 | ANALIS | Laboratorium (Input Hasil) |
| dokter@elis.local | Demo@1234 | DOKTER | Validasi Dokter, Riwayat |
| dokter.ahmad@elis.local | Demo@1234 | DOKTER | Validasi Dokter, Riwayat |

## Reset Password

Jika password tidak bekerja (misal setelah seed ulang atau migrasi):

```bash
cd apps/api
npx ts-node prisma/seeds/reset-passwords.ts
```

Script ini akan reset semua password ke default di atas.

## Alur Testing per Role

### KASIR (kasir@elis.local)
1. Login → Dashboard
2. Order & Kasir → lihat daftar order
3. Klik order PENDING_PAYMENT → proses pembayaran
4. Pilih metode → konfirmasi → selesai

### CS (cs.rina@elis.local)
1. Login → Pasien → buat pasien baru
2. Kunjungan → buat kunjungan
3. Order & Kasir → buat order baru (pilih kunjungan + pemeriksaan)

### ANALIS (analis@elis.local)
1. Login → Laboratorium
2. Pilih order yang sudah SAMPLE_COLLECTED
3. Input hasil pemeriksaan → submit

### DOKTER (dokter@elis.local)
1. Login → Validasi Dokter
2. Pilih order yang sudah VERIFIED
3. Review hasil → approve/reject
