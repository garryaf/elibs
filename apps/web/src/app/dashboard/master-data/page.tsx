"use client";

import Link from "next/link";
import {
  FlaskConical,
  TestTube,
  Layers,
  Stethoscope,
  Building2,
  ShieldCheck,
  Wrench,
  Beaker,
  Ruler,
  Droplets,
  CreditCard,
  MapPin,
  Users as UsersIcon,
} from "lucide-react";
import { RoleGuard } from "@/components/guards/RoleGuard";

const masterDataItems = [
  {
    name: "Kategori Pemeriksaan",
    description: "Kelola kategori jenis pemeriksaan laboratorium",
    icon: Layers,
    href: "/dashboard/master-data/kategori-pemeriksaan",
  },
  {
    name: "Pemeriksaan Lab",
    description: "Daftar pemeriksaan laboratorium yang tersedia",
    icon: TestTube,
    href: "/dashboard/master-data/pemeriksaan-lab",
  },
  {
    name: "Panel",
    description: "Konfigurasi panel pemeriksaan (paket tes)",
    icon: FlaskConical,
    href: "/dashboard/master-data/panel",
  },
  {
    name: "Dokter",
    description: "Data dokter pengirim dan penanggung jawab",
    icon: Stethoscope,
    href: "/dashboard/master-data/dokter",
  },
  {
    name: "Klinik",
    description: "Data klinik dan faskes mitra",
    icon: Building2,
    href: "/dashboard/master-data/klinik",
  },
  {
    name: "Asuransi",
    description: "Data penyedia asuransi dan kerjasama",
    icon: ShieldCheck,
    href: "/dashboard/master-data/asuransi",
  },
  {
    name: "Alat",
    description: "Inventaris alat dan instrumen laboratorium",
    icon: Wrench,
    href: "/dashboard/master-data/alat",
  },
  {
    name: "Reagen",
    description: "Data reagen dan bahan kimia",
    icon: Beaker,
    href: "/dashboard/master-data/reagen",
  },
  {
    name: "Satuan",
    description: "Satuan pengukuran hasil pemeriksaan",
    icon: Ruler,
    href: "/dashboard/master-data/satuan",
  },
  {
    name: "Jenis Sampel",
    description: "Jenis spesimen/sampel yang diterima",
    icon: Droplets,
    href: "/dashboard/master-data/jenis-sampel",
  },
  {
    name: "Tarif",
    description: "Kelola tarif pemeriksaan",
    icon: CreditCard,
    href: "/dashboard/master-data/tarif",
  },
  {
    name: "Wilayah",
    description: "Data wilayah Indonesia (provinsi, kabupaten/kota, dll)",
    icon: MapPin,
    href: "/dashboard/master-data/regions",
  },
  {
    name: "Users",
    description: "Kelola pengguna dan peran akses",
    icon: UsersIcon,
    href: "/dashboard/master-data/users",
  },
];

export default function MasterDataPage() {
  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN"]}>
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Master Data
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Kelola seluruh data referensi laboratorium dari satu tempat.
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {masterDataItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-brand/40 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand/40"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10">
                <Icon className="h-5 w-5 text-brand" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 group-hover:text-brand dark:text-slate-200 dark:group-hover:text-brand">
                {item.name}
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {item.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
    </RoleGuard>
  );
}
