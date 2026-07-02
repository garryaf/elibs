# ADR-0003: Frontend

## Context
Antarmuka eLIS menuntut desain yang "Wow", modern, responsive, dan sangat interaktif sesuai dengan tema "Calm Medical Experience". Sistem juga akan digunakan oleh berbagai role (Staf, Teknisi, Dokter) yang membutuhkan UX superior.

## Problem
Pemilihan stack frontend (Framework dan Styling) yang menunjang pengembangan UI/UX secara cepat, konsisten, dan scalable.

## Alternative
- **Framework**: React.js (Vite), Next.js, Vue.js, Angular.
- **Styling**: Vanilla CSS, Bootstrap, Material-UI, Tailwind CSS.
- **UI Component Library**: Ant Design, Chakra UI, Shadcn UI.

## Pros
- **Next.js**: Memiliki fitur routing yang solid (App Router), mendukung Server-Side Rendering (SSR) / Static Site Generation (SSG) untuk performa dan SEO yang lebih baik (berguna di Phase 2 Portal Klinik), dan didukung penuh oleh Vercel.
- **Tailwind CSS**: Utility-first CSS memungkinkan styling custom secara cepat tanpa perlu menulis custom CSS berulang. Memastikan konsistensi design token (warna, spacing).
- **Shadcn UI**: Bukan library yang di-install sebagai dependensi tertutup, melainkan copy-paste komponen (dengan Radix UI). Memberikan kontrol absolut terhadap styling tanpa bloat, sangat cocok untuk tema custom (Calm Medical Experience).

## Cons
- **Next.js**: Bisa jadi overkill untuk dashboard internal (SPA biasa sudah cukup), memiliki kompleksitas tambahan pada data fetching di Server Components vs Client Components.
- **Tailwind CSS**: Class name di file HTML/JSX menjadi sangat panjang (verbose).
- **Shadcn UI**: Perlu maintenance komponen secara mandiri karena source code komponen berada di codebase kita.

## Selected
**Next.js (React) + Tailwind CSS + Shadcn UI**

## Consequence
1. Frontend menggunakan React Framework Next.js.
2. Styling sepenuhnya di-handle menggunakan utility classes dari Tailwind CSS, dengan konfigurasi tema yang ketat (Sage Green, Muted Olive, Warm Off White).
3. Komponen UI akan dibangun dengan fondasi Shadcn UI untuk memastikan aksesibilitas (WCAG) dan konsistensi UX.

## Future Consideration
Jika aplikasi menjadi terlalu besar, kita bisa mempertimbangkan arsitektur Micro-Frontends (Module Federation) atau Multiple Next.js apps yang disatukan via reverse proxy (Multi-zones Next.js).
