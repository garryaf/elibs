# Business Requirement Document (BRD)
# Enterprise Laboratory Information System (eLIS) v1.0

## 01 Executive Summary
Laboratorium klinik eLIS saat ini beroperasi menggunakan sistem manual berbasis Microsoft Excel, yang menyebabkan tingginya risiko *human error*, ketidakefisienan proses, dan kurangnya auditabilitas. Proyek ini bertujuan untuk membangun sistem informasi laboratorium skala enterprise yang mendigitalisasi seluruh proses—mulai dari pendaftaran pasien, kasir, pengambilan sampel, hingga pengiriman hasil secara otomatis via Email dan WhatsApp. Arsitektur sistem dirancang sangat skalabel (*SaaS-ready*) untuk ke depannya dapat melayani ekosistem *Referral Laboratory* (Multi Klinik) secara terpusat.

## 02 Project Background
Operasional menggunakan Excel tidak lagi memadai seiring meningkatnya volume pasien. Proses saat ini tidak memiliki kontrol keamanan data (RBAC), rawan manipulasi, lambat dalam *Turnaround Time* (TAT), dan tidak memiliki integrasi antar departemen. eLIS diinisiasi untuk memodernisasi infrastruktur TI, menggantikan Excel dengan *platform* yang *secure*, otomatis, dan memiliki fondasi integrasi API masa depan (SatuSehat, BPJS, HL7).

## 03 Vision
Menjadi tulang punggung (*backbone*) infrastruktur digital laboratorium rujukan di Indonesia yang akurat, cepat, dan terpercaya bagi ratusan klinik mitra dan jutaan pasien.

## 04 Mission
1. Mengeliminasi proses manual dan *human error* di laboratorium.
2. Mempercepat TAT (Turnaround Time) pelayanan pasien dari registrasi hingga hasil.
3. Menyediakan antarmuka yang intuitif (Calm Medical Experience) bagi staf.
4. Mengamankan rekam medis pasien sesuai standar kepatuhan regulasi (UU PDP & HIPAA).

## 05 Business Goal
1. **Zero Excel**: 100% digitalisasi operasional dalam 3 bulan.
2. **Kecepatan**: Mengurangi waktu tunggu pasien dan waktu distribusi hasil lab hingga 50%.
3. **Ekspansi B2B**: Memungkinkan *onboarding* 50 klinik mitra (SaaS) pada tahun kedua tanpa kendala arsitektur.
4. **Keamanan**: 100% data termutasi tercatat di *Audit Trail* yang *immutable*.

## 06 Business Objective
- Menggantikan Excel secara total.
- Mendukung fitur Barcode & QR Code untuk pelacakan sampel.
- Menerapkan pengiriman otomatis hasil lab via Email dan WhatsApp.
- Mendukung kapabilitas Multi-Klinik, Multi-Dokter, dan Multi-User.
- Menyediakan Dashboard Eksekutif (*Business Intelligence*).
- Membuka jalur integrasi API (HL7/ASTM/SATUSEHAT) untuk pengembangan mendatang.

## 07 Stakeholder
1. **Sponsor / Owner**: Pendana dan pengambil keputusan utama.
2. **Manager**: Pengguna laporan manajerial dan *dashboard*.
3. **Teknisi/Analis Lab**: Pengguna inti yang memproses data analitik sampel.
4. **Dokter Penanggung Jawab**: Verifikator akhir medis.
5. **Klinik Partner**: Pengirim rujukan pasien (B2B).
6. **Pasien**: Penerima layanan dan notifikasi akhir.
7. **IT/Vendor Development**: Tim pengembang (Developer, QA, DevOps).

## 08 Scope
- **Dashboard**: Eksekutif & Operasional.
- **Master Data**: Pasien, Klinik, Dokter, Pemeriksaan, Paket, Harga, Asuransi, User, Role, Permission, Email Template.
- **Operasional**: Registrasi, Kasir (Billing), Laboratorium (Input & Validasi Hasil).
- **Medis**: Approval Dokter.
- **Distribusi**: Report, Result Viewer, Notification (WA/Email).
- **Security**: Audit Trail, Settings, RBAC.

## 09 Out of Scope
- Integrasi langsung LIS dua arah ke mesin Analyzer (Instrument Integration/HL7) — dialokasikan untuk fase mendatang.
- Modul Akuntansi Jurnal Umum / Buku Besar (Integrasi ERP).
- Modul Penggajian / HRIS Staf Klinik.
- Aplikasi Mobile Native (iOS/Android) — Fase ini difokuskan pada Web Responsif.

## 10 Current Business Process
1. Klinik menelpon/chat WA lab untuk merujuk pasien.
2. Pasien datang, staf mencatat data identitas di buku tulis/Excel.
3. Pasien membayar, staf kasir menghitung manual dan menulis kuitansi kertas.
4. Sampel diambil, wadah ditulisi spidol manual.
5. Hasil keluar dari mesin, analis memindahkan angka secara manual (ketik) ke Excel.
6. Hasil Excel di-print, ditaruh di meja dokter untuk ditandatangani.
7. Hasil di-scan atau di-fotocopy, lalu dikirim manual via WA ke pasien.

## 11 Future Business Process
1. Klinik mitra mendaftarkan pasien via Portal eLIS (atau API).
2. Pasien datang, Staf memverifikasi data di sistem eLIS.
3. Kasir memproses di sistem eLIS, sistem kalkulasi tarif & diskon otomatis, cetak invoice thermal.
4. Sistem otomatis *generate* dan cetak stiker Barcode. Stiker ditempel di tabung sampel.
5. Analis lab menginput hasil di eLIS. Sistem melakukan *auto-flagging* nilai abnormal (High/Low/Critical).
6. Dokter meninjau hasil di eLIS dan menekan "Approve".
7. eLIS otomatis men-*generate* PDF tersandi dan mengirim via API WhatsApp & Email secara asinkron (*Queue*).

## 12 Functional Requirement
*Berdasarkan best practice LIS:*
- **FR-01 (Order Management)**: Sistem harus dapat membuat Order dengan N pemeriksaan.
- **FR-02 (Barcode System)**: Sistem harus meng-generate barcode unik (Format Code-128 / QR).
- **FR-03 (Auto Flagging)**: Sistem otomatis menandai hasil H/L berdasarkan Master Data Nilai Rujukan (berdasarkan Umur & Jenis Kelamin). *(Wajib untuk enterprise)*
- **FR-04 (Delta Check)**: Sistem mampu menampilkan hasil lab sebelumnya dari pasien yang sama untuk perbandingan. *(Wajib untuk akurasi diagnosa medis)*
- **FR-05 (Multi-Tarif)**: Sistem mampu menerapkan harga berbeda tergantung Asuransi/Klinik Mitra.
- **FR-06 (Automated Notification)**: Integrasi SMTP & WhatsApp API (BullMQ queue).
- **FR-07 (Dynamic Approval)**: Flagging otomatis apakah tes butuh approval dokter atau cukup analis.

## 13 Non Functional Requirement
- **Availability**: 99.9% Uptime (High Availability configuration).
- **Performance**: API Load < 200ms per request (via Redis Cache & PgBouncer).
- **Scalability**: Arsitektur *Modular Monolith* yang ter-dockerisasi, siap dipecah ke *Microservices*.
- **Security**: OWASP Top 10, JWT, AES-256 (PII Encryption), TLS 1.3.
- **Auditability**: Immutable Audit Trail untuk C-U-D operations.
- **Backup & DR**: Point-in-time Recovery (WAL), Full Backup Harian, RTO 4 Jam, RPO 15 Menit.
- **Future SaaS Readiness**: Skema DB mendukung isolasi berbasis ID (tenant ID ready).

## 14 User Persona
1. **Owner (Dr. A)**: Ingin melihat profit harian dan pertumbuhan klinik tanpa harus ke lab.
2. **Manager (Bpk. B)**: Fokus pada efisiensi staf, SLA hasil lab, dan rekap utilisasi reagen (future).
3. **Kasir (Ibu C)**: Butuh interface cepat (seperti POS minimarket) dan kalkulasi diskon yang tidak bikin pusing.
4. **Admin (Sdr. D)**: Menangani komplain, perbaikan salah ketik NIK, mengatur hak akses staf baru.
5. **Analis Lab (Bpk. E)**: Butuh interface (Bento Grid) yang jelas membedakan mana nilai normal dan kritis, sangat lelah jika harus klik banyak menu.
6. **Dokter PJ (Dr. F)**: Sibuk, butuh melihat antrean hasil yang perlu di-*approve* dari tablet/HP dengan cepat.
7. **Klinik Partner (Klinik Sehat)**: Ingin mendaftarkan pasien dan mendownload rekap tagihan rujukan tiap akhir bulan.
8. **Pasien (Tn. G)**: Ingin hasil lab instan masuk ke HP tanpa harus kembali ke lab.

## 15 User Role
- `SUPER_ADMIN`: Akses seluruh sistem (Tech team).
- `OWNER / MANAGER`: Dashboard, Laporan, Master Data (Read-Only).
- `ADMIN`: Mengelola Master Data, User, Role.
- `KASIR`: Modul Kasir, Invoice, Registrasi.
- `SAMPLING`: Cetak Barcode, Konfirmasi sampel diterima.
- `ANALIS`: Modul Lab, Input Hasil, Validasi Teknisi.
- `DOKTER`: Approval Akhir.
- `CS / MARKETING`: Pendaftaran Pasien, Laporan Kunjungan.
- `KLINIK_PARTNER`: Portal Rujukan, Rekap Tagihan.

## 16 Business Rule
- **BR-01**: Pasien WAJIB memiliki NIK unik (16 digit) atau identifier khusus WNA. No RM (Rekam Medis) digenerate otomatis dan tidak bisa diubah.
- **BR-02**: Invoice hanya dapat dicetak JIKA status order = `PAID`.
- **BR-03**: Barcode sampel harus UNIK secara sistem dan terhubung ke Order ID.
- **BR-04**: Hasil pemeriksaan hanya dapat di-publish/dikirim setelah divalidasi Analis dan disetujui (Approved) oleh Dokter.
- **BR-05**: Approval dokter bersifat opsional pada tingkat *Master Pemeriksaan* (misal: Tes Kehamilan instan tidak perlu dokter, tes Darah Lengkap perlu dokter).
- **BR-06**: Email & WhatsApp hasil lab HANYA dikirim jika status order = `APPROVED` dan pasien setuju menerima notifikasi digital.
- **BR-07**: WhatsApp hanya dikirim jika nomor HP berformat valid (prefix 62 / 08).
- **BR-08**: Segala bentuk perubahan data transaksi (Order/Hasil) setelah disimpan harus menciptakan baris log di tabel *Audit Trail* yang tidak dapat dihapus.

## 17 Risk Analysis
| Risiko | Tipe | Dampak | Probabilitas | Mitigasi |
|--------|------|--------|--------------|----------|
| Kebocoran Data Pasien | Technology | Critical | Low | Enkripsi AES-256, Audit Trail, RBAC Ketat |
| Downtime Server | Operational | High | Medium | Containerized Deployment, Auto-restart, Load Balancer |
| Notifikasi Gagal Terkirim | Business | Medium | High | Penggunaan Asynchronous Queue (BullMQ) dengan Retry Policy |
| Kegagalan transisi dari Excel | Operational | Medium | Medium | UI dibuat simpel (*Calm Medical Experience*) & Training komprehensif |

## 18 Gap Analysis
| Area | As-Is (Excel) | To-Be (eLIS) | Gap Action |
|------|---------------|--------------|------------|
| **Data Integrity** | Duplikasi data sangat banyak | Relational DB + NIK unik | Migrasi dan *cleansing* data lama |
| **Keamanan** | File bisa dicopy siapa saja | RBAC & Enkripsi | Setup JWT & Middleware authorization |
| **Distribusi Hasil** | Print & Scan manual | PDF Auto-generate & WA API | Integrasi layanan Fonnte/Twilio & Node HTML-to-PDF |

## 19 Business KPI
- **TAT (Turnaround Time)**: Waktu dari sampel diambil hingga hasil *Approved* (Target: < 2 Jam untuk darah rutin).
- **Error Rate**: Persentase revisi hasil lab (Target: < 0.1%).
- **Digital Adoption**: Persentase hasil lab yang sukses terkirim via WA/Email tanpa di-print (Target: > 80%).

## 20 Success Criteria
Sistem dinyatakan berhasil (GO-LIVE) apabila:
1. Mampu memproses 100 pasien simulasi tanpa hambatan dari Registrasi hingga Notifikasi.
2. Tidak ada error pada kalkulasi tarif dan kuitansi pembayaran.
3. Seluruh role dapat *login* dan hanya melihat menu yang diizinkan (RBAC lolos test).
4. Hasil *generate* PDF 100% akurat sesuai input laboratorium.

## 21 Future Roadmap
- **Fase 1 (Bulan 1-3)**: Core System eLIS (Monolith) beroperasi di 1 Lab Utama.
- **Fase 2 (Bulan 4-6)**: B2B Portal (Klinik Partner), Modul Tagihan B2B bulanan.
- **Fase 3 (Bulan 7-12)**: Integrasi API Alat Lab (HL7), Integrasi SATUSEHAT Kemenkes.
- **Fase 4 (Tahun 2)**: Migrasi ke SaaS (Multi-Tenant Microservices via Kubernetes) & Mobile App Pasien.

## 22 Assumption
- Staf lab memiliki koneksi internet stabil (Fiber Optic).
- Pasien rata-rata memiliki smartphone dengan WhatsApp aktif.
- Peraturan perundang-undangan rekam medis (Kemenkes) mengizinkan penyimpanan berbasis *cloud* terenkripsi (Server dalam negeri).

## 23 Constraint
- Desain arsitektur harus bisa berjalan lancar di *budget server/VPS* yang tidak terlalu tinggi pada awal operasi.
- Vendor API WhatsApp tunduk pada regulasi Meta (Meta Policy) jika mengirim massal.
- Tidak boleh ada "Hospital Blue" pada UI, wajib *Sage Green / Muted Olive* (Calm Experience).

## 24 Glossary
- **LIS**: Laboratory Information System.
- **TAT**: Turnaround Time.
- **RBAC**: Role-Based Access Control.
- **HL7**: Health Level Seven (Standar interoperabilitas data medis global).
- **SaaS**: Software as a Service.
- **MRN**: Medical Record Number (No. Rekam Medis).
- **Bento Grid**: Pendekatan UI modern menggunakan blok/kartu.

## 25 Appendix
- **Ref 1**: UI/UX Design System (`docs/05-UIUX`)
- **Ref 2**: Architecture (`docs/03-Architecture`)
- **Ref 3**: ADR Document (`docs/15-ADR`)
- **Ref 4**: Kemenkes SATUSEHAT Interoperability Guidelines (To be added in future Phase).

---
**END OF BRD DOCUMENT**
