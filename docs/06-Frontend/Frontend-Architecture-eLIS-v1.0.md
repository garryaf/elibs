
# Frontend Architecture Specification
# Enterprise Laboratory Information System (eLIS)

| Field            | Detail                                       |
|------------------|----------------------------------------------|
| **Document ID**  | FE-eLIS-2026-001                             |
| **Version**      | 1.0                                          |
| **Status**       | Draft                                        |
| **Date Created** | 2026-06-30                                   |

---

## 1. Technology Stack
Tumpukan teknologi frontend dipilih untuk menjamin performa, skalabilitas tim, dan pengalaman pengguna (UX) yang sangat responsif:

- **Core Framework**: Next.js (App Router)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS
- **Component Library**: Shadcn/UI (Radix UI Primitives)
- **Data Fetching & Caching**: TanStack Query (React Query) v5
- **Form Handling**: React Hook Form
- **Schema Validation**: Zod

## 2. Directory Structure

Aplikasi akan mengadopsi pola struktur direktori berbasis fitur (*Feature-Sliced Design* modularitas):

```text
/
├── app/                  # Next.js App Router (Pages, Layouts, API Routes)
│   ├── (auth)/           # Route group untuk login/register
│   ├── (dashboard)/      # Route group untuk aplikasi utama
│   └── globals.css       # Tailwind base & CSS variables
├── components/           # Komponen UI
│   ├── ui/               # Base components dari Shadcn (Button, Input, Table)
│   ├── shared/           # Komponen shared (Sidebar, Header, Layout wrappers)
│   └── modules/          # Komponen spesifik fitur (OrderForm, PatientList)
├── lib/                  # Utilities (Axios instance, Tailwind `cn` utility)
├── hooks/                # Custom React Hooks
├── services/             # API clients dan TanStack Query hooks (usePatients, dll)
├── types/                # TypeScript Interfaces & Types
└── schemas/              # Zod Validation Schemas
```

## 3. Theming & Design System Implementation
- **Tailwind Config**: Konfigurasi `tailwind.config.ts` akan secara ketat membatasi warna hanya pada palet *Calm Medical Experience* (Sage Green, Muted Olive, Off White, Cream). Dilarang menggunakan warna default biru (Blue/Indigo/Sky) dari Tailwind.
- **Dark Mode Ready**: Komponen dibangun kompatibel dengan `next-themes`. Variabel warna CSS akan didefinisikan untuk state `:root` (Light) dan `.dark` (Dark).
- **Bento Grid**: Utility classes Grid CSS (`grid-cols-12`, `gap-6`) akan menjadi standar layout.

## 4. Accessibility (WCAG 2.1 AA)
- Seluruh elemen form, tabel, dan modal wajib menggunakan komponen Shadcn/UI (berbasis Radix UI) yang sudah memenuhi standar ARIA secara *out-of-the-box*.
- Rasio kontras warna akan dievaluasi ketat (> 4.5:1 untuk teks normal).
- Dukungan navigasi penuh menggunakan *Keyboard* (Focus trap pada modal).

## 5. Form & Validation
- Setiap form input wajib dikendalikan oleh **React Hook Form**.
- Validasi data (seperti format NIK, nilai batas rujukan lab) didefinisikan secara deklaratif dengan **Zod**. Zod schema akan dibagikan (shared) antara frontend dan backend (jika memungkinkan/monorepo) untuk menjamin konsistensi.

## 6. API Integration & State Management
- **TanStack Query** bertanggung jawab penuh untuk semua *server state* (Data pasien, list order, metrik dashboard). Ini memberikan fitur *auto-caching*, *background fetching*, dan *optimistic updates*.
- *Client state* (seperti state sidebar terbuka, modal aktif) akan menggunakan Zustand atau sekadar React `useState`/`useContext`.

## 7. Responsiveness (Mobile First)
- Seluruh antarmuka di-develop dengan pendekatan mobile-first.
- Menu navigasi akan berubah menjadi *hamburger menu* atau *bottom navigation bar* pada viewport mobile (`< 768px`). Tabel data yang besar akan menggunakan *horizontal scroll* atau berubah menjadi *card list view* pada layar sempit.

---
**END OF FRONTEND ARCHITECTURE**
