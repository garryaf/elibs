# Manual Book eLIS (Enterprise Laboratory Information System)

## Buku Panduan Pengguna

| Informasi | Detail |
|-----------|--------|
| Nama Sistem | eLIS — Enterprise Laboratory Information System |
| Versi | 1.0 |
| Tanggal | Juli 2026 |
| Klasifikasi | Internal |
| Ditujukan Untuk | Super Admin, Owner/CEO, Manager, Admin, Kasir, CS, Analis, Dokter, Sampling, Klinik Partner |

---

## Daftar Isi

1. [Pendahuluan](#1-pendahuluan)
2. [Peran Pengguna & Hak Akses](#2-peran-pengguna--hak-akses)
3. [Login & Dashboard](#3-login--dashboard)
4. [Menu Pasien](#4-menu-pasien)
5. [Menu Kunjungan (Registrasi)](#5-menu-kunjungan-registrasi)
6. [Menu Order & Kasir](#6-menu-order--kasir)
7. [Menu Laboratorium](#7-menu-laboratorium)
8. [Menu Validasi Dokter](#8-menu-validasi-dokter)
9. [Menu Master Data](#9-menu-master-data)
10. [Menu Pengaturan (Settings)](#10-menu-pengaturan-settings)
11. [Menu Administrasi Lainnya](#11-menu-administrasi-lainnya)
12. [Alur Kerja Lengkap (Workflow)](#12-alur-kerja-lengkap-workflow)
13. [FAQ & Troubleshooting](#13-faq--troubleshooting)

---

## 1. Pendahuluan

### 1.1 Apa itu eLIS?

eLIS adalah sistem informasi laboratorium klinik terintegrasi yang mengelola seluruh alur kerja laboratorium, mulai dari:
- Pendaftaran pasien
- Pembuatan order pemeriksaan
- Pembayaran
- Pengambilan sampel dengan pelacakan barcode
- Input hasil dengan auto-flagging otomatis
- Verifikasi teknisi (analis)
- Approval dokter
- Pengiriman notifikasi otomatis ke pasien (Email & WhatsApp)

### 1.2 Siapa yang Menggunakan eLIS?

eLIS dirancang untuk semua staf di laboratorium klinik Anda:
- **CEO/Owner** — Melihat dashboard eksekutif, performa bisnis, laporan
- **Manager** — Mengawasi operasional, laporan harian
- **Admin** — Mengelola user, master data, konfigurasi sistem
- **Kasir** — Membuat order, memproses pembayaran
- **CS (Customer Service)** — Mendaftarkan pasien baru
- **Sampling** — Menerima dan memverifikasi sampel
- **Analis** — Menginput hasil pemeriksaan, verifikasi teknis
- **Dokter** — Validasi/approval hasil laboratorium
- **Klinik Partner** — Mendaftarkan pasien dan membuat order dari klinik mitra

### 1.3 Cara Mengakses eLIS

Buka browser (Chrome/Firefox/Edge) dan akses alamat URL yang diberikan oleh admin IT Anda. Sistem mendukung tampilan terang (light mode) dan gelap (dark mode).

---

## 2. Peran Pengguna & Hak Akses

Setiap pengguna di eLIS memiliki **satu peran (role)** yang menentukan menu dan fitur apa saja yang bisa diakses.

### 2.1 Tabel Peran dan Akses Menu

| Peran | Dashboard | Pasien | Kunjungan | Order & Kasir | Lab | Validasi Dokter | Master Data | Kelola User | Laporan | Pengaturan | Audit Trail |
|-------|:---------:|:------:|:---------:|:-------------:|:---:|:---------------:|:-----------:|:-----------:|:-------:|:----------:|:-----------:|
| SUPER_ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| OWNER (CEO) | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ |
| MANAGER | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | — | ✅ | — | — |
| ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| KASIR | ✅ | ✅ | ✅ | ✅ | — | — | — | — | ✅ | — | — |
| CS | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — | — | — |
| SAMPLING | ✅ | ✅ | — | — | ✅ | — | — | — | — | — | — |
| ANALIS | ✅ | ✅ | — | — | ✅ | — | — | — | — | — | — |
| DOKTER | ✅ | ✅ | — | — | — | ✅ | — | — | — | — | — |
| MARKETING | ✅ | ✅ | — | — | — | — | — | — | — | — | — |
| KLINIK_PARTNER | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — | — | — |

### 2.2 Penjelasan Per Peran

**SUPER_ADMIN** — Akses penuh ke seluruh sistem. Biasanya dipegang oleh IT atau pemilik teknis sistem.

**OWNER (CEO Klinik)** — Sebagai pemilik klinik, Anda bisa melihat semua data bisnis, dashboard eksekutif dengan pendapatan harian/bulanan, jumlah pasien, dan hasil kritis. Anda juga bisa mengelola user dan master data.

**MANAGER** — Mengawasi operasional harian. Bisa melihat laporan, master data, dan dashboard tapi tidak bisa mengubah pengaturan sistem.

**ADMIN** — Peran administratif utama. Mengelola user, master data, pengaturan, dan bisa mengawasi semua modul termasuk laboratorium.

**KASIR** — Fokus pada pembayaran dan order. Membuat order baru, memproses pembayaran tunai/BPJS/asuransi, mencetak invoice.

**CS (Customer Service)** — Mendaftarkan pasien baru, mencari data pasien, membuat kunjungan.

**SAMPLING** — Staf pengambil sampel. Melihat antrian lab, memverifikasi kondisi sampel yang diterima.

**ANALIS** — Teknisi laboratorium. Menginput hasil pemeriksaan, melihat delta check, melakukan verifikasi teknis.

**DOKTER** — Dokter penanggung jawab. Mereview hasil yang sudah diverifikasi analis, memberikan interpretasi, approve atau reject hasil.

**KLINIK_PARTNER** — Klinik mitra yang mengirim pasien. Bisa mendaftarkan pasien dan membuat order dari jarak jauh.

---

## 3. Login & Dashboard

### 3.1 Cara Login

1. Buka alamat eLIS di browser Anda
2. Masukkan **Email** dan **Password** yang diberikan admin
3. Klik tombol **Masuk**
4. Jika berhasil, Anda akan diarahkan ke halaman Dashboard

> **Catatan:** Jika lupa password, hubungi Super Admin atau Admin untuk reset password.

### 3.2 Dashboard — Halaman Utama

Setelah login, Anda akan melihat **Dashboard** yang menampilkan ringkasan operasional klinik secara real-time. Data diperbarui setiap 60 detik secara otomatis.

#### Informasi yang Ditampilkan:

| Kartu Informasi | Keterangan |
|-----------------|------------|
| Pasien Hari Ini | Jumlah pasien yang mendaftar/berkunjung hari ini |
| Total Pasien | Total pasien terdaftar di sistem |
| Pendapatan Hari Ini | Total pembayaran yang masuk hari ini |
| Total Pendapatan Bulan Ini | Akumulasi pendapatan bulan berjalan |
| Hasil Kritis | Jumlah hasil pemeriksaan yang flagnya CRITICAL |
| Menunggu Sampel | Jumlah order yang sudah dibayar tapi sampel belum diambil |
| Selesai Hari Ini | Jumlah order yang sudah selesai (APPROVED/NOTIFIED) hari ini |

#### Tabel Order Terbaru

Di bawah kartu informasi, terdapat tabel order terbaru yang menampilkan:
- Nomor Order
- Nama Pasien
- No. MRN
- Status (dengan badge warna)
- Total Tagihan
- Waktu Dibuat

#### Kode Warna Status Order:

| Status | Warna | Keterangan |
|--------|-------|------------|
| Menunggu Bayar | Kuning/Amber | Order belum dibayar |
| Terbayar | Biru | Sudah dibayar, menunggu sampel |
| Sampel Diterima | Indigo | Sampel sudah dikumpulkan |
| Proses Analisa | Hijau | Sedang dianalisa di lab |
| Terverifikasi | Lime | Sudah diverifikasi analis |
| Disetujui | Sage Green | Sudah diapprove dokter |
| Dibatalkan | Merah | Order dibatalkan |

### 3.3 Untuk CEO/Owner

Sebagai CEO/Owner, Dashboard memberikan Anda gambaran langsung tentang:
- **Performa bisnis** — Pendapatan harian dan bulanan
- **Volume pasien** — Berapa banyak pasien yang dilayani
- **Alert** — Hasil kritis yang perlu perhatian medis segera
- **Bottleneck** — Berapa sampel yang mengantre, untuk mengetahui kapasitas lab

---

## 4. Menu Pasien

**Lokasi:** Sidebar → UTAMA → Pasien  
**Akses:** Semua peran (semua user yang login bisa melihat data pasien)

### 4.1 Melihat Daftar Pasien

Halaman ini menampilkan seluruh pasien yang terdaftar di sistem dalam bentuk tabel dengan fitur:
- **Pencarian** — Cari berdasarkan Nama, NIK, atau Nomor Rekam Medis (MRN)
- **Pagination** — Navigasi halaman jika data pasien banyak

#### Kolom yang Ditampilkan:
| Kolom | Keterangan |
|-------|------------|
| MRN | Nomor Rekam Medis (format: RM-YYYYMM-XXXX), otomatis digenerate |
| Nama | Nama lengkap pasien |
| NIK | Nomor Induk Kependudukan (16 digit) |
| Tanggal Lahir | Tanggal lahir pasien |
| Jenis Kelamin | Laki-laki / Perempuan |
| No. Telepon | Nomor kontak pasien |
| Asuransi | Nama asuransi (jika ada) |

### 4.2 Tentang Nomor Rekam Medis (MRN)

- MRN digenerate **otomatis** oleh sistem saat pasien pertama kali didaftarkan
- Format: `RM-YYYYMM-XXXX` (contoh: RM-202607-0001)
- MRN **tidak bisa diubah** setelah dibuat (immutable)
- MRN adalah identitas unik pasien di seluruh sistem eLIS

### 4.3 Catatan untuk Admin/CS

- NIK harus tepat **16 digit angka**
- Sistem akan menolak jika NIK sudah terdaftar (duplikasi tidak diizinkan)
- Data pasien mendukung **soft-delete** (data tidak benar-benar dihapus, hanya dinonaktifkan)

---

## 5. Menu Kunjungan (Registrasi)

**Lokasi:** Sidebar → UTAMA → Kunjungan  
**Akses:** SUPER_ADMIN, OWNER, MANAGER, ADMIN, KASIR, CS, KLINIK_PARTNER

Menu Kunjungan adalah titik awal alur pelayanan pasien. Di sini Anda mendaftarkan kunjungan pasien ke laboratorium.

### 5.1 Alur Pendaftaran Pasien (3 Langkah)

eLIS menggunakan alur terpadu untuk pendaftaran:

```
Langkah 1: Cari Pasien → Langkah 2: Daftar Baru (jika belum ada) → Langkah 3: Buat Kunjungan
```

#### Langkah 1: Cari Pasien

1. Klik tombol **"+ Kunjungan Baru"** atau akses menu Pendaftaran
2. Ketik nama, NIK, atau MRN di kolom pencarian
3. Jika pasien **sudah terdaftar** → pilih pasien dari hasil pencarian → lanjut ke Langkah 3
4. Jika pasien **belum terdaftar** → klik "Daftar Pasien Baru" → lanjut ke Langkah 2

#### Langkah 2: Registrasi Pasien Baru

Isi form data pasien dengan lengkap:

| Field | Wajib? | Keterangan |
|-------|:------:|------------|
| Nama Lengkap | ✅ | Sesuai KTP |
| NIK | ✅ | 16 digit angka, harus unik |
| Tanggal Lahir | ✅ | Format: DD/MM/YYYY |
| Jenis Kelamin | ✅ | Laki-laki / Perempuan |
| No. Telepon | — | Untuk notifikasi hasil via WhatsApp |
| Email | — | Untuk notifikasi hasil via Email |
| Alamat | — | Alamat lengkap |
| Provinsi | — | Pilih dari dropdown wilayah Indonesia |
| Kabupaten/Kota | — | Otomatis terfilter sesuai provinsi |
| Kecamatan | — | Otomatis terfilter sesuai kab/kota |
| Kelurahan/Desa | — | Otomatis terfilter sesuai kecamatan |
| Golongan Darah | — | A, B, AB, O |
| Kontak Darurat | — | Nama kontak darurat |
| No. Telp Darurat | — | Nomor kontak darurat |
| Asuransi | — | Pilih dari daftar asuransi terdaftar |
| No. BPJS | — | Jika menggunakan BPJS |
| Consent Notifikasi Digital | — | Centang jika pasien setuju menerima hasil via digital |

Setelah berhasil mendaftar, sistem akan otomatis menggenerate **Nomor MRN** dan Anda lanjut ke Langkah 3.

#### Langkah 3: Buat Kunjungan

Setelah pasien dipilih/didaftarkan, buat kunjungan dengan mengisi:

| Field | Wajib? | Keterangan |
|-------|:------:|------------|
| Metode Pembayaran | ✅ | Tunai, BPJS, Transfer, Asuransi, EDC, Tagihan Korporat |
| Dokter Pengirim | — | Pilih dari daftar dokter terdaftar |
| Klinik | — | Pilih klinik pengirim (jika ada) |
| Asuransi | — | Jika metode pembayaran adalah BPJS/Asuransi |
| No. BPJS | — | Wajib jika metode BPJS |

Setelah berhasil, sistem akan menampilkan **Nomor Kunjungan** (format: VST-YYYYMM-XXXX) dan Anda bisa lanjut membuat order pemeriksaan.

### 5.2 Daftar Kunjungan

Halaman utama Kunjungan menampilkan tabel semua kunjungan dengan fitur:

- **Filter Status:** Semua, Terdaftar, Dalam Proses, Selesai, Dibatalkan
- **Pencarian:** Berdasarkan nama pasien atau nomor kunjungan
- **Pagination:** Navigasi halaman (20 data per halaman)

#### Status Kunjungan:

| Status | Badge | Keterangan |
|--------|-------|------------|
| TERDAFTAR | Biru | Baru didaftarkan, belum ada order |
| DALAM PROSES | Kuning | Sudah ada order yang berjalan |
| SELESAI | Hijau | Semua order sudah selesai |
| DIBATALKAN | Merah | Kunjungan dibatalkan |

### 5.3 Membatalkan Kunjungan

Kunjungan bisa dibatalkan dengan mengklik menu aksi (⋮) pada baris kunjungan, lalu pilih "Batalkan". Anda harus mengisi alasan pembatalan.

### 5.4 Metode Pembayaran yang Didukung

| Kode | Nama | Keterangan |
|------|------|------------|
| CASH | Tunai | Bayar langsung di kasir |
| BPJS | BPJS | Menggunakan jaminan BPJS Kesehatan |
| TRANSFER | Transfer Bank | Via transfer rekening |
| INSURANCE | Asuransi Swasta | Menggunakan asuransi swasta |
| EDC | EDC (Kartu) | Pembayaran via mesin EDC (debit/kredit) |
| INSURANCE_CASH_FALLBACK | Fallback Tunai | Asuransi ditolak, bayar tunai |
| CORPORATE_DEFERRED | Tagihan Korporat | Pembayaran ditanggung perusahaan (tagihan bulanan) |

---

## 6. Menu Order & Kasir

**Lokasi:** Sidebar → UTAMA → Order & Kasir  
**Akses:** SUPER_ADMIN, OWNER, MANAGER, ADMIN, KASIR, CS, KLINIK_PARTNER

Menu ini adalah pusat pengelolaan order pemeriksaan laboratorium dan pembayaran.

### 6.1 Melihat Daftar Order

Halaman utama menampilkan semua order dengan fitur:
- **Filter Status:** Semua, Belum Bayar, Lunas, Analisa, Selesai
- **Pencarian:** Berdasarkan nomor order atau nama pasien
- **Pagination:** 20 data per halaman

#### Kolom Tabel Order:

| Kolom | Keterangan |
|-------|------------|
| No. Order | Nomor unik order (auto-generate) |
| Pasien | Nama pasien |
| MRN | Nomor Rekam Medis |
| Status | Status order saat ini |
| Total | Total tagihan |
| Tanggal | Tanggal order dibuat |

### 6.2 Membuat Order Baru

1. Klik tombol **"+ Order Baru"**
2. Pilih **Kunjungan** yang sudah terdaftar
3. Pilih **Tes Pemeriksaan** yang akan dilakukan (minimal 1 tes)
   - Bisa pilih tes individual atau Panel (paket tes)
   - Harga akan dikalkulasi otomatis berdasarkan tarif yang berlaku
4. Pilih **Dokter Pengirim** dan **Klinik** (opsional)
5. Sistem menampilkan **Total Tagihan**
6. Klik **Buat Order**

Setelah order dibuat:
- Status awal: **MENUNGGU BAYAR (PENDING_PAYMENT)**
- Nomor Order otomatis digenerate
- Total dihitung otomatis dari tarif setiap tes

### 6.3 Memproses Pembayaran (Kasir)

1. Cari order dengan status **"Belum Bayar"** di daftar order
2. Klik order tersebut atau pilih aksi **"Bayar"**
3. Pilih **Metode Pembayaran** (Tunai/BPJS/Transfer/Asuransi/EDC/dll)
4. Masukkan **Jumlah yang Dibayar**
5. Klik **Proses Pembayaran**

Setelah pembayaran berhasil:
- Status berubah: **MENUNGGU BAYAR → TERBAYAR (PAID)**
- Sistem otomatis generate **Barcode** (Code-128) untuk tracking sampel
- Invoice bisa dicetak

### 6.4 Melihat Barcode & Invoice

- **Barcode:** Digunakan untuk pelacakan sampel di lab. Bisa dicetak dan ditempel di tabung sampel.
- **Invoice:** Bukti pembayaran yang bisa dicetak untuk pasien.

### 6.5 Membatalkan Order

Order hanya bisa dibatalkan jika masih berstatus **MENUNGGU BAYAR**:
1. Klik aksi **"Batalkan"** pada order
2. Masukkan **alasan pembatalan** (wajib)
3. Konfirmasi pembatalan

> **Perhatian:** Order yang sudah dibayar TIDAK bisa dibatalkan langsung. Hubungi Admin/Super Admin untuk proses refund manual.

### 6.6 Untuk CEO/Owner — Memahami Data Order

Sebagai pemilik klinik, dari menu Order Anda bisa memantau:
- Volume order harian (berapa banyak order masuk)
- Berapa yang belum dibayar (potensi piutang)
- Berapa yang sudah lunas (cash flow masuk)
- Tren pendapatan dari total tagihan

---

## 7. Menu Laboratorium

**Lokasi:** Sidebar → LABORATORIUM → Laboratorium  
**Akses:** SUPER_ADMIN, OWNER, MANAGER, ADMIN, SAMPLING, ANALIS

Menu Laboratorium adalah inti dari sistem eLIS. Di sini seluruh proses kerja lab berlangsung, dari pengambilan sampel hingga verifikasi hasil.

### 7.1 Sub-Menu Laboratorium

| Sub-Menu | Keterangan | Peran Utama |
|----------|------------|-------------|
| Antrian (Queue) | Melihat order yang siap diproses | SAMPLING, ANALIS |
| Input Hasil (Results) | Memasukkan hasil pemeriksaan | ANALIS |
| Lab Dashboard | Statistik dan metrik laboratorium | ADMIN, MANAGER, OWNER |

### 7.2 Antrian Lab (Queue)

Halaman antrian menampilkan semua order yang sudah dibayar dan siap diproses di laboratorium.

**Filter yang tersedia:**
- Status: PAID (siap ambil sampel), SAMPLE_COLLECTED (sampel sudah diambil), IN_ANALYSIS (sedang dianalisa)
- Pencarian: Berdasarkan nomor order, nama pasien, atau barcode
- Pagination

**Informasi per order:**
- Nomor Order + Barcode
- Data Pasien (Nama, MRN, umur, jenis kelamin)
- Daftar Tes yang dipesan
- Status terkini
- Waktu order dibuat

### 7.3 Pengambilan Sampel (Sampling)

**Peran:** SAMPLING, ADMIN

Setelah pasien datang dan membawa bukti pembayaran/barcode:

1. Cari order di antrian (scan barcode atau cari manual)
2. Ambil sampel dari pasien
3. Klik **"Terima Sampel"**
4. Pilih **Kondisi Sampel:**

| Kondisi | Hasil |
|---------|-------|
| ACCEPTABLE (Diterima) | Status berubah ke SAMPLE_COLLECTED ✅ |
| LIPEMIC (Lipemik) | Sampel ditolak, catat alasan ❌ |
| HEMOLYTIC (Hemolisis) | Sampel ditolak, catat alasan ❌ |
| CLOTTED (Beku) | Sampel ditolak, catat alasan ❌ |
| INSUFFICIENT (Kurang) | Sampel ditolak, catat alasan ❌ |

Jika sampel ditolak, status tetap **PAID** dan pasien perlu diambil ulang sampelnya.

### 7.4 Input Hasil Pemeriksaan (Analis)

**Peran:** ANALIS, ADMIN

Setelah sampel diterima dan dianalisa di alat lab:

1. Buka menu **Input Hasil** atau pilih order dari antrian
2. Klik order yang statusnya **SAMPLE_COLLECTED**
3. Untuk setiap parameter tes, masukkan:
   - **Nilai Hasil** (angka atau teks sesuai jenis tes)
   - **Komentar** (opsional)

#### Auto-Flagging Otomatis

Sistem secara otomatis akan memberikan **flag** berdasarkan nilai referensi:

| Flag | Warna | Kondisi |
|------|-------|---------|
| NORMAL | 🟢 Hijau | Nilai dalam rentang normal |
| LOW | 🟡 Kuning | Nilai di bawah batas minimum |
| HIGH | 🟡 Kuning | Nilai di atas batas maksimum |
| CRITICAL | 🔴 Merah | Nilai di bawah batas kritis minimum ATAU di atas batas kritis maksimum |

> **Catatan:** Flag ditentukan otomatis berdasarkan data Reference Value yang sudah dikonfigurasi di Master Data, disesuaikan dengan jenis kelamin dan usia pasien.

#### Delta Check

Fitur delta check menampilkan **5 hasil terakhir** pasien untuk tes yang sama, sehingga analis bisa membandingkan tren hasil. Ini membantu mendeteksi hasil yang anomali.

4. Setelah **semua** hasil diisi → status berubah ke **IN_ANALYSIS**
5. Klik **"Verifikasi"** untuk melakukan verifikasi teknis

### 7.5 Verifikasi Teknis (Analis)

**Peran:** ANALIS, ADMIN

Setelah semua hasil dimasukkan:
1. Review semua hasil dan flag
2. Pastikan tidak ada kesalahan input
3. Klik **"Verifikasi"**
4. Status berubah: **IN_ANALYSIS → VERIFIED**

> **Penting:** Verifikasi hanya bisa dilakukan jika SEMUA parameter tes sudah memiliki nilai hasil.

### 7.6 Lab Dashboard (Statistik)

**Peran:** OWNER, MANAGER, ADMIN, SUPER_ADMIN

Dashboard laboratorium menampilkan:
- **Total order hari ini** — Berapa order masuk hari ini
- **Breakdown status** — Distribusi order per status
- **Rata-rata TAT (Turn Around Time)** — Waktu rata-rata dari sampel diterima hingga hasil disetujui (dalam menit)
- **Jumlah antrian per status** — Berapa order di setiap tahap proses
- **Volume harian** — Grafik tren volume pemeriksaan per hari

### 7.7 Untuk CEO/Owner — Lab Dashboard

Sebagai pemilik, Lab Dashboard memberi insight tentang:
- **Efisiensi lab:** TAT rata-rata menunjukkan seberapa cepat lab Anda bekerja
- **Kapasitas:** Jumlah antrian menunjukkan apakah lab Anda overload
- **Tren volume:** Apakah bisnis lab Anda tumbuh dari waktu ke waktu

---

## 8. Menu Validasi Dokter

**Lokasi:** Sidebar → LABORATORIUM → Validasi Dokter  
**Akses:** SUPER_ADMIN, OWNER, MANAGER, ADMIN, DOKTER

Menu ini khusus untuk dokter penanggung jawab laboratorium (DPJP) untuk mereview dan menyetujui hasil pemeriksaan.

### 8.1 Antrian Approval

Halaman ini menampilkan semua order yang statusnya **VERIFIED** (sudah diverifikasi oleh analis) dan menunggu keputusan dokter.

Informasi yang ditampilkan per order:
- Data Pasien (Nama, MRN, Usia, Jenis Kelamin)
- Daftar hasil pemeriksaan dengan flag warna
- Riwayat delta check
- Nomor Order

### 8.2 Proses Approval

Untuk setiap order yang perlu divalidasi:

1. Klik order dari antrian approval
2. Review semua hasil pemeriksaan dan flagnya
3. Tulis **Interpretasi Klinis** di textarea yang tersedia (opsional tapi disarankan)
4. Pilih keputusan:

| Keputusan | Efek |
|-----------|------|
| **APPROVE (Setujui)** | Status: VERIFIED → APPROVED. Sistem akan mengirim notifikasi ke pasien. |
| **REJECT (Tolak)** | Status: VERIFIED → IN_ANALYSIS. Analis harus memperbaiki/mengulang analisa. |

Jika menolak, Anda **wajib** mengisi alasan penolakan agar analis tahu apa yang harus diperbaiki.

### 8.3 Auto-Approval

Beberapa tes yang **tidak memerlukan approval dokter** (ditandai `requiresDoctorApproval = false` di master data) akan otomatis diapprove oleh sistem setelah verifikasi analis. Tes-tes ini tidak akan muncul di antrian approval dokter.

### 8.4 Setelah Approval

Setelah dokter menyetujui:
- Status berubah ke **APPROVED**
- Sistem otomatis menjadwalkan pengiriman notifikasi:
  - **Email** dengan PDF laporan hasil (jika email pasien tersedia)
  - **WhatsApp** notifikasi (jika nomor telepon tersedia dan consent diberikan)
- Setelah semua notifikasi terkirim, status berubah ke **NOTIFIED**

### 8.5 Untuk CEO/Owner & Dokter

- Sebagai CEO yang juga dokter, Anda bisa langsung mereview hasil-hasil kritis (flag MERAH) di antrian ini
- Interpretasi klinis yang Anda tulis akan tercetak di laporan hasil pasien
- Anda bisa memantau berapa banyak hasil yang menunggu validasi untuk memastikan tidak ada bottleneck

---

## 9. Menu Master Data

**Lokasi:** Sidebar → ADMINISTRASI → Master Data  
**Akses:** SUPER_ADMIN, OWNER, MANAGER, ADMIN

Master Data adalah kumpulan data referensi yang menjadi dasar operasional laboratorium. Halaman ini menampilkan grid kartu yang masing-masing mengarah ke sub-menu pengelolaan data.

### 9.1 Daftar Master Data

| # | Master Data | Ikon | Keterangan |
|---|-------------|------|------------|
| 1 | Kategori Pemeriksaan | 📑 | Kelompok/kategori jenis tes (misal: Hematologi, Kimia Klinik) |
| 2 | Pemeriksaan Lab | 🧪 | Daftar tes laboratorium (misal: Hemoglobin, Glukosa, Kolesterol) |
| 3 | Panel | ⚗️ | Paket tes yang sering dipesan bersamaan (misal: Panel Lipid) |
| 4 | Dokter | 🩺 | Data dokter pengirim dan penanggung jawab |
| 5 | Klinik | 🏢 | Data klinik dan fasilitas kesehatan mitra |
| 6 | Asuransi | 🛡️ | Data penyedia asuransi dan kerjasama |
| 7 | Alat | 🔧 | Inventaris alat/instrumen laboratorium beserta kalibrasi |
| 8 | Reagen | 🧫 | Data reagen dan bahan kimia yang digunakan |
| 9 | Satuan | 📏 | Satuan pengukuran (misal: mg/dL, g/dL, U/L) |
| 10 | Jenis Sampel | 💧 | Tipe spesimen (misal: Darah EDTA, Serum, Urine) |
| 11 | Tarif | 💳 | Pengaturan harga per tes (bisa per klinik/asuransi) |
| 12 | Wilayah | 📍 | Data wilayah Indonesia (Provinsi → Kab/Kota → Kecamatan → Desa) |
| 13 | Users | 👥 | Kelola akun pengguna dan peran akses |

### 9.2 Kategori Pemeriksaan

**Tujuan:** Mengelompokkan jenis tes lab ke dalam kategori untuk navigasi dan pelaporan yang lebih mudah.

**Operasi:**
- ➕ Tambah kategori baru
- ✏️ Edit nama/deskripsi kategori
- 🗑️ Hapus kategori (soft-delete, hanya jika tidak ada tes aktif di dalamnya)

**Contoh Kategori:**
- Hematologi
- Kimia Klinik
- Urinalisis
- Serologi/Imunologi
- Mikrobiologi

### 9.3 Pemeriksaan Lab (Tes)

**Tujuan:** Mendaftarkan semua jenis pemeriksaan yang ditawarkan laboratorium.

**Operasi:**
- ➕ Tambah tes baru
- ✏️ Edit informasi tes
- 🗑️ Hapus tes (soft-delete)

**Field yang dikelola:**

| Field | Keterangan |
|-------|------------|
| Kode | Kode unik tes (misal: HB-001), tidak boleh duplikat |
| Nama | Nama pemeriksaan (misal: Hemoglobin) |
| Kategori | Pilih dari kategori yang sudah dibuat |
| Satuan | Satuan hasil (misal: g/dL) |
| Metode | Metode pemeriksaan (misal: Cyanmethemoglobin) |
| Tipe Sampel | Jenis spesimen yang dibutuhkan |
| Harga | Harga dasar pemeriksaan |
| Perlu Approval Dokter | Ya/Tidak (jika Tidak, hasil otomatis diapprove) |
| Perlu Pre-Auth Asuransi | Ya/Tidak |
| Status Aktif | Aktif/Nonaktif |

**Nilai Referensi (Reference Value):**

Untuk setiap tes, Anda bisa mengatur nilai referensi berdasarkan:
- **Jenis Kelamin:** Laki-laki / Perempuan (berbeda referensi)
- **Rentang Usia:** Minimum dan maksimum usia
- **Nilai Normal:** Min Ref — Max Ref
- **Nilai Kritis:** Critical Min — Critical Max

Contoh untuk Hemoglobin:
| Gender | Usia | Min Normal | Max Normal | Critical Min | Critical Max |
|--------|------|:----------:|:----------:|:------------:|:------------:|
| Laki-laki | 18-60 | 13.0 | 17.0 | 7.0 | 20.0 |
| Perempuan | 18-60 | 12.0 | 15.5 | 7.0 | 20.0 |

### 9.4 Panel (Paket Tes)

**Tujuan:** Membuat paket pemeriksaan yang berisi beberapa tes sekaligus, memudahkan pemesanan.

**Contoh Panel:**
- Panel Lipid: Kolesterol Total + Trigliserida + HDL + LDL
- Panel Fungsi Hati: SGOT + SGPT + Bilirubin Total + Albumin
- Panel Hematologi Rutin: Hemoglobin + Leukosit + Trombosit + Hematokrit

**Operasi:**
- ➕ Tambah panel baru (pilih nama, harga, dan tes-tes yang masuk)
- ✏️ Edit panel (tambah/hapus tes dari panel)
- 🗑️ Hapus panel (soft-delete)

### 9.5 Dokter

**Tujuan:** Mengelola data dokter pengirim dan dokter penanggung jawab laboratorium.

| Field | Keterangan |
|-------|------------|
| Kode | Kode unik dokter |
| Nama | Nama lengkap dokter |
| Spesialisasi | Spesialis (misal: Patologi Klinik) |
| No. Telepon | Kontak dokter |
| Email | Email dokter |
| No. SIP (Lisensi) | Nomor Surat Izin Praktik |
| Status Aktif | Aktif/Nonaktif |

### 9.6 Klinik

**Tujuan:** Mengelola data klinik/faskes mitra yang mengirim pasien atau bekerja sama.

| Field | Keterangan |
|-------|------------|
| Kode | Kode unik klinik |
| Nama | Nama klinik |
| Alamat | Alamat lengkap |
| No. Telepon | Kontak klinik |
| Email | Email klinik |
| Status Aktif | Aktif/Nonaktif |

### 9.7 Asuransi

**Tujuan:** Mengelola data penyedia asuransi yang diterima.

| Field | Keterangan |
|-------|------------|
| Kode | Kode unik asuransi |
| Nama | Nama perusahaan asuransi |
| Tipe | BPJS / Swasta / Corporate |
| No. Telepon | Kontak PIC asuransi |
| Email | Email asuransi |
| Status Aktif | Aktif/Nonaktif |

### 9.8 Alat (Equipment)

**Tujuan:** Inventarisasi semua alat laboratorium beserta jadwal kalibrasi.

| Field | Keterangan |
|-------|------------|
| Kode | Kode inventaris alat |
| Nama | Nama alat (misal: Hematology Analyzer) |
| Produsen | Merek/produsen alat |
| Model | Model/tipe alat |
| Nomor Seri | Serial number |
| Lokasi | Lokasi penempatan alat |
| Status | ACTIVE / MAINTENANCE / RETIRED |
| Kalibrasi Terakhir | Tanggal kalibrasi terakhir |
| Kalibrasi Berikutnya | Jadwal kalibrasi berikutnya |

**Riwayat Kalibrasi:** Setiap alat memiliki riwayat kalibrasi yang mencatat tanggal, petugas, hasil (PASS/FAIL), dan nomor sertifikat.

### 9.9 Reagen

**Tujuan:** Mengelola stok bahan kimia/reagen yang digunakan untuk pemeriksaan.

| Field | Keterangan |
|-------|------------|
| Kode | Kode reagen |
| Nama | Nama reagen |
| Produsen | Merek/produsen |
| No. Lot | Nomor lot/batch |
| Tanggal Kadaluarsa | Expiry date |
| Jumlah Stok | Stok tersedia |
| Satuan | Satuan stok (misal: mL, pcs) |
| Suhu Penyimpanan | Kondisi simpan (misal: 2-8°C) |

### 9.10 Satuan Ukur

**Tujuan:** Daftar satuan pengukuran yang digunakan dalam hasil pemeriksaan.

**Contoh:** mg/dL, g/dL, U/L, mmol/L, mIU/mL, x10³/µL

### 9.11 Jenis Sampel

**Tujuan:** Mendefinisikan tipe spesimen yang diterima lab beserta container dan instruksi.

| Field | Keterangan |
|-------|------------|
| Kode | Kode jenis sampel |
| Nama | Nama (misal: Darah EDTA, Serum, Urine Pagi) |
| Container | Wadah/tabung (misal: Tabung EDTA, Tabung SST) |
| Instruksi | Instruksi pengambilan khusus |

### 9.12 Tarif

**Tujuan:** Mengatur harga pemeriksaan yang bisa berbeda berdasarkan klinik atau asuransi tertentu.

**Konsep Tarif:**
- **Tarif Default:** Harga umum untuk semua pasien
- **Tarif per Klinik:** Harga khusus untuk klinik mitra tertentu
- **Tarif per Asuransi:** Harga khusus untuk asuransi tertentu

**Prioritas pencarian tarif:**
1. Tarif spesifik (klinik + asuransi) → paling prioritas
2. Tarif per klinik
3. Tarif per asuransi
4. Tarif default → paling umum

| Field | Keterangan |
|-------|------------|
| Tes | Pemeriksaan yang ditarifkan |
| Klinik | Klinik tertentu (kosong = berlaku umum) |
| Asuransi | Asuransi tertentu (kosong = berlaku umum) |
| Harga | Harga tarif |
| Diskon (%) | Diskon 0-100% |
| Berlaku Dari | Tanggal mulai berlaku |
| Berlaku Hingga | Tanggal berakhir (kosong = tanpa batas) |

### 9.13 Wilayah Indonesia

**Tujuan:** Data referensi wilayah Indonesia 4 level untuk alamat pasien.

Struktur hierarki:
```
Provinsi → Kabupaten/Kota → Kecamatan → Kelurahan/Desa
```

Data ini digunakan saat registrasi pasien untuk memilih alamat secara terstruktur (dropdown cascading).

### 9.14 Users (Pengelolaan Pengguna)

**Tujuan:** Menambah, mengedit, dan menonaktifkan akun pengguna sistem.

| Field | Keterangan |
|-------|------------|
| Email | Email untuk login (harus unik) |
| Nama | Nama lengkap pengguna |
| Password | Password login (terenkripsi) |
| Peran (Role) | Pilih salah satu dari 11 peran yang tersedia |
| Departemen | Departemen pengguna (opsional) |
| Jabatan | Posisi/jabatan (opsional) |
| Klinik | Klinik tempat bertugas (opsional, untuk KLINIK_PARTNER) |

**Yang bisa dilakukan:**
- ➕ Tambah user baru
- ✏️ Edit informasi user (termasuk ganti role)
- 🔒 Reset password user
- 🗑️ Nonaktifkan user (soft-delete)

> **Catatan untuk CEO/Owner:** Sebagai Owner, Anda bisa menambah dan mengatur siapa saja yang memiliki akses ke sistem. Pastikan setiap staf hanya mendapat peran yang sesuai tugasnya (prinsip least privilege).

---

## 10. Menu Pengaturan (Settings)

**Lokasi:** Sidebar → ADMINISTRASI → Pengaturan  
**Akses:** SUPER_ADMIN, ADMIN

Menu Pengaturan berisi konfigurasi sistem yang mengatur perilaku keseluruhan aplikasi eLIS.

### 10.1 General (Umum)

Konfigurasi umum sistem klinik Anda:

| Pengaturan | Keterangan |
|------------|------------|
| Nama Klinik/Lab | Nama yang tampil di header, laporan, dan invoice |
| Alamat | Alamat lengkap yang tercetak di dokumen |
| Telepon | Nomor telepon klinik |
| Email | Email resmi klinik |
| Logo | Upload logo untuk kop surat dan laporan |
| Format MRN | Kustomisasi format nomor rekam medis |
| Timezone | Zona waktu operasional (default: Asia/Jakarta) |

### 10.2 SMTP (Email Server)

Konfigurasi server email untuk pengiriman notifikasi hasil ke pasien:

| Pengaturan | Keterangan |
|------------|------------|
| SMTP Host | Alamat server email (misal: smtp.gmail.com) |
| SMTP Port | Port server (biasanya 587 atau 465) |
| Username | Username/email pengirim |
| Password | Password email pengirim |
| Enkripsi | TLS/SSL |
| Email Pengirim | Alamat "From" yang tampil di email pasien |
| Nama Pengirim | Nama yang tampil (misal: "Lab Klinik ABC") |

**Tips:** Disarankan menggunakan email khusus untuk notifikasi (misal: notifikasi@klinikanda.com), jangan email pribadi.

### 10.3 Notifications (Notifikasi)

Mengatur preferensi pengiriman notifikasi:

| Pengaturan | Keterangan |
|------------|------------|
| Aktifkan Email | Ya/Tidak — kirim hasil via email |
| Aktifkan WhatsApp | Ya/Tidak — kirim notifikasi via WhatsApp |
| Template Email | Kustomisasi isi email notifikasi |
| Template WhatsApp | Kustomisasi pesan WhatsApp |
| Auto-send on Approve | Otomatis kirim saat dokter approve |
| Max Retry | Berapa kali percobaan jika gagal kirim (default: 3x) |

### 10.4 Laboratory (Pengaturan Lab)

Konfigurasi khusus operasional laboratorium:

| Pengaturan | Keterangan |
|------------|------------|
| Auto-approve | Tes mana saja yang bisa auto-approve tanpa dokter |
| TAT Target | Target Turn Around Time (dalam menit) |
| Barcode Format | Format barcode (default: Code-128) |
| Print Otomatis | Otomatis cetak label barcode setelah pembayaran |
| Sample Rejection Flow | Alur jika sampel ditolak |
| Critical Alert | Kirim notifikasi segera jika ada hasil CRITICAL |

### 10.5 WhatsApp (Integrasi WhatsApp)

Konfigurasi koneksi dengan layanan WhatsApp Business API:

| Pengaturan | Keterangan |
|------------|------------|
| API Provider | Pilih provider (Wablas, Fonnte, dll) |
| API Key/Token | Token autentikasi API |
| Nomor Pengirim | Nomor WhatsApp bisnis yang digunakan |
| Status Koneksi | Indicator apakah koneksi aktif |
| Test Message | Kirim pesan tes untuk verifikasi |

**Format Nomor:** Sistem menerima format 08xx atau 62xx dan otomatis mengkonversi ke format internasional.

### 10.6 Appearance (Tampilan)

Kustomisasi tampilan antarmuka:

| Pengaturan | Keterangan |
|------------|------------|
| Tema | Light (Terang) / Dark (Gelap) / System (Ikuti OS) |
| Warna Utama | Warna aksen (default: Sage Green #6B8E6B) |
| Font Size | Ukuran huruf (Kecil / Normal / Besar) |
| Compact Mode | Mode kompak untuk tampilan lebih padat |

### 10.7 Untuk CEO/Owner — Mengapa Settings Penting?

Sebagai pemilik klinik, pastikan:
1. **Logo dan identitas klinik** sudah benar — ini tampil di semua laporan dan invoice
2. **Konfigurasi notifikasi** aktif — pasien yang puas dengan pengiriman hasil cepat akan kembali
3. **WhatsApp terintegrasi** — Mayoritas pasien Indonesia lebih nyaman menerima hasil via WA
4. **Target TAT** ditetapkan — Ini alat ukur kinerja lab Anda

---

## 11. Menu Administrasi Lainnya

### 11.1 Kelola User

**Lokasi:** Sidebar → ADMINISTRASI → Kelola User  
**Akses:** SUPER_ADMIN, OWNER, ADMIN

Halaman khusus untuk manajemen akun pengguna (terpisah dari Master Data → Users untuk akses cepat).

**Fitur:**
- Melihat daftar semua user dengan filter dan pencarian
- Tambah user baru
- Edit user (nama, email, role, departemen)
- Reset password
- Nonaktifkan/aktifkan akun

### 11.2 Laporan

**Lokasi:** Sidebar → ADMINISTRASI → Laporan  
**Akses:** SUPER_ADMIN, OWNER, MANAGER, ADMIN, KASIR

Modul pelaporan untuk menghasilkan laporan operasional dan keuangan.

**Jenis Laporan yang Tersedia:**
- Laporan Pendapatan Harian/Bulanan
- Laporan Volume Pemeriksaan
- Laporan Pasien Baru
- Laporan Status Order
- Laporan Waktu Proses (TAT)
- Laporan per Dokter Pengirim
- Laporan per Klinik Mitra
- Laporan per Asuransi

### 11.3 Notifikasi

**Lokasi:** Sidebar → ADMINISTRASI → Notifikasi  
**Akses:** SUPER_ADMIN, OWNER, ADMIN

Melihat riwayat pengiriman notifikasi ke pasien:
- Status: PENDING (menunggu), SENT (terkirim), FAILED (gagal)
- Tipe: EMAIL atau WHATSAPP
- Jumlah percobaan (retry)
- Error terakhir jika gagal

### 11.4 Audit Trail

**Lokasi:** Sidebar → ADMINISTRASI → Audit Trail  
**Akses:** SUPER_ADMIN, OWNER, ADMIN

Catatan audit yang **tidak bisa diubah atau dihapus** (immutable) yang mencatat semua aktivitas penting di sistem:

| Informasi | Keterangan |
|-----------|------------|
| Timestamp | Waktu kejadian |
| User | Siapa yang melakukan aksi |
| Aksi | CREATE, UPDATE, DELETE |
| Entitas | Order, Patient, User, dll |
| Data Lama | Nilai sebelum perubahan |
| Data Baru | Nilai setelah perubahan |
| IP Address | Alamat IP pengguna |

**Kegunaan untuk CEO/Owner:**
- **Compliance** — Bukti digital bahwa proses lab berjalan sesuai prosedur
- **Investigasi** — Jika ada insiden, bisa ditelusuri siapa, kapan, apa yang berubah
- **Akuntabilitas** — Setiap staf bertanggung jawab atas aksi yang dilakukan di sistem

**Yang TIDAK dicatat:** Password/hash password (untuk keamanan).

---

## 12. Alur Kerja Lengkap (Workflow)

Berikut adalah alur kerja lengkap dari pasien datang hingga hasil dikirim:

### 12.1 Diagram Alur Utama

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌───────────────┐
│  1. PASIEN  │ →  │ 2. KUNJUNGAN │ →  │  3. ORDER   │ →  │ 4. PEMBAYARAN │
│   DATANG    │    │  DIDAFTARKAN │    │   DIBUAT    │    │  DIPROSES     │
│   (CS)      │    │   (CS/Kasir) │    │   (Kasir)   │    │   (Kasir)     │
└─────────────┘    └──────────────┘    └─────────────┘    └───────────────┘
                                                                    │
                                                                    ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌───────────────┐
│ 8. NOTIF    │ ←  │ 7. APPROVAL  │ ←  │ 6. VERIFI-  │ ←  │ 5. INPUT      │
│   DIKIRIM   │    │   DOKTER     │    │    KASI     │    │    HASIL      │
│  (Otomatis) │    │   (Dokter)   │    │   (Analis)  │    │   (Analis)    │
└─────────────┘    └──────────────┘    └─────────────┘    └───────────────┘
                                                                    ▲
                                                                    │
                                                          ┌───────────────┐
                                                          │ 4b. SAMPLING  │
                                                          │  (Petugas     │
                                                          │   Sampling)   │
                                                          └───────────────┘
```

### 12.2 Detail Status Order (State Machine)

```
PENDING_PAYMENT ─── bayar ──→ PAID ─── sampel OK ──→ SAMPLE_COLLECTED
       │                                                       │
       │                                                  semua hasil diisi
       ▼                                                       │
   CANCELLED                                                   ▼
  (dibatalkan)                                           IN_ANALYSIS
                                                               │
                                                          verifikasi
                                                               │
                                                               ▼
                        APPROVED ←── approve ── VERIFIED ─── reject ──→ IN_ANALYSIS
                            │                                            (kembali)
                       notifikasi
                            │
                            ▼
                        NOTIFIED
                       (selesai)
```

### 12.3 Penjelasan Per Langkah

| Langkah | Petugas | Aksi | Hasil |
|---------|---------|------|-------|
| 1 | CS / Kasir | Cari/daftarkan pasien | Pasien terdaftar di sistem |
| 2 | CS / Kasir | Buat kunjungan + pilih metode bayar | Nomor kunjungan digenerate |
| 3 | Kasir | Buat order, pilih tes pemeriksaan | Nomor order + total tagihan |
| 4 | Kasir | Proses pembayaran | Barcode digenerate |
| 4b | Sampling | Terima sampel, verifikasi kondisi | Sampel diterima/ditolak |
| 5 | Analis | Input nilai hasil pemeriksaan | Flag otomatis (Normal/Low/High/Critical) |
| 6 | Analis | Verifikasi teknis | Hasil siap direview dokter |
| 7 | Dokter | Review + approve/reject | Interpretasi klinis ditambahkan |
| 8 | Sistem | Kirim email/WhatsApp + PDF | Pasien menerima hasil |

### 12.4 Waktu Proses Ideal (TAT Target)

| Tahap | Target Waktu |
|-------|:------------:|
| Pendaftaran → Pembayaran | 5-10 menit |
| Pembayaran → Sampel diambil | 10-15 menit |
| Sampel → Hasil diinput | 60-120 menit (tergantung jenis tes) |
| Hasil → Verifikasi analis | 15-30 menit |
| Verifikasi → Approval dokter | 30-60 menit |
| Approval → Notifikasi terkirim | 5 menit (otomatis) |
| **Total (end-to-end)** | **~2-4 jam** |

---

## 13. FAQ & Troubleshooting

### 13.1 Pertanyaan Umum

**Q: Saya lupa password, bagaimana caranya?**  
A: Hubungi Admin atau Super Admin untuk melakukan reset password akun Anda.

**Q: Pasien sudah mendaftar tapi NIK ditolak sistem?**  
A: NIK harus tepat 16 digit angka. Pastikan tidak ada spasi atau huruf. Jika muncul error "duplikasi", berarti NIK sudah terdaftar — cari pasien tersebut di menu Pasien.

**Q: Order sudah dibayar tapi tidak muncul di antrian lab?**  
A: Pastikan status order sudah berubah ke "PAID". Jika masih "PENDING_PAYMENT", proses pembayaran mungkin belum selesai. Coba refresh halaman.

**Q: Sampel ditolak, apa yang harus dilakukan?**  
A: Hubungi pasien untuk pengambilan ulang. Setelah sampel baru diambil, proses penerimaan sampel ulang dari order yang sama.

**Q: Dokter menolak hasil, apa yang terjadi?**  
A: Status kembali ke IN_ANALYSIS. Analis harus memeriksa ulang hasil, memperbaiki jika ada kesalahan, lalu verifikasi ulang.

**Q: Pasien tidak menerima notifikasi email/WhatsApp?**  
A: Periksa di menu Notifikasi apakah statusnya FAILED. Kemungkinan:
- Email/nomor telepon pasien salah
- Pasien belum centang consent notifikasi digital
- Konfigurasi SMTP/WhatsApp belum benar (hubungi Admin)

**Q: Bagaimana cara membatalkan order yang sudah dibayar?**  
A: Order yang sudah dibayar tidak bisa dibatalkan langsung via sistem. Hubungi Super Admin untuk proses pembatalan manual dan refund.

**Q: Siapa yang bisa menghapus data pasien?**  
A: Data pasien menggunakan mekanisme soft-delete (dinonaktifkan, bukan dihapus permanen). Hanya ADMIN dan SUPER_ADMIN yang bisa melakukan ini. Data yang sudah di-soft-delete tidak tampil di pencarian normal tapi masih tersimpan di database untuk keperluan audit.

### 13.2 Tips untuk CEO/Owner

1. **Pantau Dashboard setiap pagi** — Lihat jumlah pasien, pendapatan, dan alert kritis
2. **Review LAB Dashboard mingguan** — Perhatikan tren TAT dan volume, apakah perlu tambah staf?
3. **Periksa Audit Trail bulanan** — Pastikan tidak ada aktivitas mencurigakan
4. **Kelola user secara berkala** — Nonaktifkan akun staf yang sudah resign
5. **Update tarif berkala** — Sesuaikan dengan biaya operasional dan pasar

### 13.3 Tips untuk Admin

1. **Backup data master** — Catat konfigurasi penting di luar sistem
2. **Test notifikasi** — Setelah setup SMTP/WhatsApp, kirim pesan tes
3. **Monitor kalibrasi alat** — Pastikan jadwal kalibrasi selalu up-to-date
4. **Review reagen** — Perhatikan tanggal kadaluarsa stok reagen
5. **Kelola tarif** — Update tarif saat ada perubahan harga dari manajemen

### 13.4 Tips untuk Kasir

1. **Verifikasi identitas pasien** — Cocokkan NIK/MRN sebelum membuat order
2. **Cetak invoice** — Selalu berikan bukti pembayaran ke pasien
3. **Label barcode** — Tempel label barcode di wadah sampel segera setelah pembayaran
4. **Perhatikan metode bayar** — Pastikan metode pembayaran sesuai (terutama BPJS)

### 13.5 Tips untuk Analis

1. **Perhatikan flag CRITICAL** — Laporkan segera ke dokter jika ada hasil kritis
2. **Gunakan Delta Check** — Bandingkan dengan hasil sebelumnya untuk deteksi anomali
3. **Input semua parameter** — Verifikasi hanya bisa dilakukan jika semua hasil sudah diisi
4. **Double check sebelum verifikasi** — Setelah verifikasi, perubahan harus melalui rejection dokter

### 13.6 Tips untuk Dokter

1. **Prioritaskan hasil CRITICAL** — Hasil kritis perlu tindakan medis segera
2. **Tulis interpretasi** — Interpretasi klinis membantu dokter pengirim memahami hasil
3. **Reject dengan alasan jelas** — Jika menolak, tulis alasan spesifik agar analis bisa memperbaiki
4. **Review tepat waktu** — Jangan biarkan antrian approval menumpuk

---

## Catatan Penutup

Manual ini mencakup seluruh fitur yang tersedia di eLIS versi 1.0. Sistem akan terus diperbarui dan ditingkatkan. Jika ada pertanyaan yang tidak terjawab di manual ini, hubungi tim IT atau Super Admin.

**Kontak Support:**
- Internal: Super Admin masing-masing klinik
- Teknis: Tim Development eLIS

---

*Dokumen ini dibuat secara otomatis berdasarkan arsitektur sistem eLIS Enterprise v1.0*  
*Terakhir diperbarui: Juli 2026*
