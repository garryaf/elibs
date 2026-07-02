# Menu Checklist (Readiness Matrix)

Berikut adalah hasil audit ketersediaan dokumentasi per menu aplikasi. 

*Legenda: [x] = Tersedia & Sesuai | [ ] = Belum Tersedia / Kosong*

| Menu / Modul | BRD | SRS | Database (ERD) | API Spec | UI / Wireframe | Task Breakdown | Testing Plan |
|--------------|:---:|:---:|:--------------:|:--------:|:--------------:|:--------------:|:------------:|
| **Login** | [x] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| **Dashboard** | [x] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| **Patient** | [x] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| **Clinic** | [x] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| **Doctor** | [x] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| **Registration**| [x] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| **Billing** | [x] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| **Laboratory** | [x] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| **Result** | [x] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| **Report** | [x] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| **Settings** | [x] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| **Notification**| [x] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| **Audit Trail** | [x] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |

## Analisis Konsistensi
- **Business Consistency**: **LULUS**. BRD mencakup seluruh proses bisnis dengan sangat jelas.
- **Functional Consistency**: **GAGAL**. Tidak ada SRS yang menjelaskan *behavior* sistem di luar ekspektasi bisnis.
- **Database Consistency**: **GAGAL**. Struktur tabel, soft-delete, relasi, audit logging belum dirancang.
- **API Consistency**: **GAGAL**. Kontrak komunikasi antara frontend dan backend belum disepakati.
- **UI/UX Consistency**: **GAGAL**. Design system "Calm Medical Experience" belum diwujudkan dalam visual (Figma/Wireframe).
- **Coding Readiness**: **GAGAL**. Programmer tidak memiliki panduan task breakdown.
