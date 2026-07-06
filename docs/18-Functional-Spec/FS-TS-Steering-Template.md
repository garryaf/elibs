---
inclusion: manual
title: Functional Specification & Technical Specification (FS TS) — Steering Template
source: MIKA_FS_TS-ISHMED-MED-NCRXXXX_Template FS TS.docx
based_on_version: "2.0 (Release, 2023-05-23)"
project_reference: GENESIS
sap_module: ISH.Med - PMD
---

# Steering: Functional Specification & Technical Specification (FS TS)

Dokumen ini adalah **panduan (steering) sekaligus template** untuk menyusun
Functional Specification (FS) dan Technical Specification (TS). Strukturnya
diturunkan dari template resmi MIKA GENESIS (`MIKA_FS_TS-ISHMED-MED-NCRXXXX`)
untuk modul SAP ISH.Med.

Gunakan dokumen ini sebagai acuan setiap kali membuat FS/TS baru: salin bagian
[Template Siap Pakai](#template-siap-pakai) ke file baru, lalu isi setiap
bagian mengikuti [Panduan Pengisian](#panduan-pengisian-per-bagian).

---

## Konvensi Umum

- **Format ID dokumen**: `MIKA_FS_TS-<SYSTEM>-<MODULE>-NCR<NNNN>` (contoh:
  `MIKA_FS_TS-ISHMED-MED-NCR0123`). `XXXX`/`XXX` diganti nomor CR aktual.
- **Bahasa**: gunakan Bahasa Indonesia untuk narasi, istilah teknis SAP/ISH.Med
  tetap dalam bahasa aslinya.
- **Versi & status**: setiap revisi menaikkan versi (mis. 1.0 → 1.1) dan
  status mengikuti siklus `Draft` → `Review` → `Release`.
- **Checkbox**: `☒` = dipilih, `☐` = tidak dipilih. Isi sesuai peruntukan CR.
- **Kelengkapan Components**: daftar objek pada bagian Components menjadi dasar
  code review dan input CodeInspector, jadi WAJIB lengkap.

---

## Struktur Dokumen

1. Functional Specification
   1. Overview
   2. Profile and Background
   3. Functional requirements
   4. Layout / Form
   5. Process flow / Logic Program
   6. Customizing
2. Technical Specification
   1. Object Detail
   2. Capture / Processing Logic / Error treatment / Notes
3. Unit Test / Replication step (Func + Dev)
4. Further information / Authorization detail

---

## Panduan Pengisian per Bagian

### 1. Functional Specification

#### 1.1 Overview
Ringkasan singkat kebutuhan bisnis: apa yang diminta, mengapa, dan hasil akhir
yang diharapkan. Tulis 1–3 paragraf yang bisa dipahami oleh functional owner
maupun developer.

#### 1.2 Profile and Background
Latar belakang kebutuhan (proses bisnis saat ini, masalah, dampak). Lengkapi
**Profile Table** (lihat template) yang berisi metadata CR: ID, deskripsi,
modul SAP, jadwal milestone, klasifikasi objek, dan komponen yang tersentuh.

#### 1.3 Functional Requirements
Rincian kebutuhan fungsional yang terukur dan dapat diuji. Gunakan penomoran
(FR-01, FR-02, ...) dan hindari ambiguitas. Setiap requirement harus bisa
dipetakan ke test case pada bagian 3.

#### 1.4 Layout / Form
Rancangan tampilan layar/form: field, tipe data, mandatory/optional, tombol,
dan tata letak. Sertakan mockup/screenshot bila ada.

#### 1.5 Process flow / Logic Program
Alur proses bisnis dan logika program (boleh diagram alur, sequence, atau
narasi bertahap). Jelaskan kondisi cabang, validasi, dan hasil tiap langkah.

#### 1.6 Customizing
Konfigurasi/customizing SAP yang diperlukan (tabel customizing, entri, IMG
path). Kosongkan dengan "NA" jika tidak ada.

### 2. Technical Specification

#### 2.1 Object Detail
Daftar objek teknis yang dibuat/diubah: nama objek, tipe (Report, Enhancement,
Form, dsb.), package, transport request. Konsisten dengan bagian Components.

#### 2.2 Capture / Processing Logic / Error treatment / Notes
Detail teknis pemrosesan data: struktur data, algoritma, penanganan error
(pesan, kode), serta catatan implementasi penting bagi developer.

### 3. Unit Test / Replication step (Func + Dev)
Skenario dan langkah uji untuk functional dan developer. Setiap test case punya
ID, deskripsi, objek uji, langkah (input → expected result), dan status.

### 4. Further information / Authorization detail
Referensi dokumen terkait, detail otorisasi (authorization object, role), dan
daftar singkatan (abbreviations).

---

## Template Siap Pakai

> Salin bagian di bawah ini ke file FS/TS baru dan isi sesuai CR.

```markdown
# Functional & Technical Specification

| Field         | Value                                             |
|---------------|---------------------------------------------------|
| Specification | MIKA_FS_TS-<SYSTEM>-<MODULE>-NCR<NNNN>_<Title>     |
| Project Name  | GENESIS                                            |
| Business Unit | <Business Unit>                                    |
| Version       | 1.0                                                |
| Last revised  | YYYY-MM-DD                                         |
| Status        | Draft                                              |
| Author        | <Author>                                           |
| Protection    | Internal                                           |

## Project Profile
- Project Name: GENESIS
- Project Type: Implementation Project
- Business Unit: SAP
- Project Start: <dd Mon yyyy>
- Project End: <dd Mon yyyy>

## 1. Functional Specification

### 1.1 Overview
<ringkasan kebutuhan>

### 1.2 Profile and Background
<latar belakang>

#### Profile Table
| Field              | Description                                              |
|--------------------|----------------------------------------------------------|
| ID NO              | MIKA_FS_TS-<SYSTEM>-<MODULE>-NCR<NNNN>                    |
| Description        | <judul singkat>                                          |
| SAP Module         | ISH.Med - PMD                                            |
| Scheduling         | Milestones:                                              |
|                    | - Completion of technical specification: <tgl>          |
|                    | - Unit test: <tgl>                                       |
|                    | - Function test: <tgl>                                   |
|                    | - Integration test: <tgl>                                |
| Functional owner   | <nama>                                                   |
| Classification     | [ ] Report  [ ] Enhancement  [ ] Forms  [ ] Conversions  |
|                    | [ ] Webdynpro  [ ] Portal (ESS,MSS)  [ ] Workflow        |
| Components         | [ ] ERP  [ ] IS-H.Med  [ ] IS-H  [ ] Add On  [ ] Kiosk   |
|                    | [ ] Mika Apps  [ ] Mika Web                              |
| Performance class  | [ ] Critical  [ ] non-critical                           |
| Reference documents| NCR<NNNN> Template CR                                     |

### 1.3 Functional Requirements
- FR-01: <kebutuhan>
- FR-02: <kebutuhan>

### 1.4 Layout / Form
<rancangan layar/form + mockup>

### 1.5 Process flow / Logic Program
<alur proses / logika>

### 1.6 Customizing
<customizing atau NA>

## 2. Technical Specification

### 2.1 Object Detail
| No | Object Name | Type | Package | Transport | Description |
|----|-------------|------|---------|-----------|-------------|
| 1  |             |      |         |           |             |

### 2.2 Capture / Processing Logic / Error treatment / Notes
<detail teknis, penanganan error, catatan>

## 3. Unit Test / Replication step (Func + Dev)

### Scenario #01 — Test case #001 <judul>
- ID test case: 001
- Test case: <deskripsi>
- Test object (if applicable): NA

| Step | Description | SAP T-Code | Input Data | Expected result | Status |
|------|-------------|-----------|------------|-----------------|--------|
| 1    |             |           |            |                 |        |
| 2    |             |           |            |                 |        |
| 3    |             |           |            |                 |        |

## 4. Further information / Authorization detail

### References
| No | Name | Description | File |
|----|------|-------------|------|
| 1  |      |             |      |

### List of Abbreviations
| Abbreviation | Meaning |
|--------------|---------|
|              |         |
```

---

## Catatan
Konten disusun ulang (rephrased) dari template asli MIKA FS TS untuk kepatuhan
dan agar dapat digunakan sebagai panduan reusable. Field metadata proyek
(GENESIS, ISH.Med) dipertahankan sesuai template sumber.
