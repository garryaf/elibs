"use client";

import { useState, useEffect } from "react";
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
  Activity,
  Microscope,
  Info,
  ChevronDown,
  ChevronUp,
  X,
  TrendingUp,
  Search,
} from "lucide-react";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { BulkPriceAdjustDialog } from "@/components/master-data/BulkPriceAdjustDialog";

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
    name: "Nilai Referensi",
    description: "Atur rentang normal dan kritis per pemeriksaan (untuk auto-flagging)",
    icon: Activity,
    href: "/dashboard/master-data/reference-values",
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
    name: "Metode",
    description: "Kelola metode pemeriksaan laboratorium (Fotometri, Turbidimetri, Impedansi, dll)",
    icon: Microscope,
    href: "/dashboard/master-data/metode",
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

const SETUP_ORDER_DISMISSED_KEY = "elis-master-data-setup-order-dismissed";

const setupOrderSteps = [
  { step: 1, name: "Satuan", description: "Unit pengukuran dasar" },
  { step: 2, name: "Metode", description: "Metode pemeriksaan" },
  { step: 3, name: "Jenis Sampel", description: "Tipe spesimen" },
  { step: 4, name: "Kategori", description: "Grup pemeriksaan" },
  { step: 5, name: "Pemeriksaan", description: "Data tes laboratorium" },
  { step: 6, name: "Reference Range", description: "Nilai normal & kritis" },
  { step: 7, name: "Panel", description: "Paket pemeriksaan" },
  { step: 8, name: "Tarif", description: "Harga pemeriksaan" },
  { step: 9, name: "Alat", description: "Instrumen lab" },
  { step: 10, name: "Reagen", description: "Bahan kimia" },
];

export default function MasterDataPage() {
  const [isInfoDismissed, setIsInfoDismissed] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showBulkPriceDialog, setShowBulkPriceDialog] = useState(false);
  const [cardSearch, setCardSearch] = useState("");

  useEffect(() => {
    const dismissed = localStorage.getItem(SETUP_ORDER_DISMISSED_KEY);
    setIsInfoDismissed(dismissed === "true");
  }, []);

  const handleDismiss = () => {
    setIsInfoDismissed(true);
    localStorage.setItem(SETUP_ORDER_DISMISSED_KEY, "true");
  };

  const handleShowAgain = () => {
    setIsInfoDismissed(false);
    localStorage.removeItem(SETUP_ORDER_DISMISSED_KEY);
  };

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN"]}>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Master Data
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola seluruh data referensi laboratorium dari satu tempat.
          </p>
        </div>
        <button
          onClick={() => setShowBulkPriceDialog(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark hover:shadow-md"
        >
          <TrendingUp className="h-4 w-4" />
          Penyesuaian Harga
        </button>
      </div>

      {/* Setup Order Info Banner */}
      {!isInfoDismissed ? (
        <div className="relative rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="absolute right-3 top-3 rounded-lg p-1 text-blue-400 transition-colors hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-800 dark:hover:text-blue-300"
            aria-label="Tutup panduan urutan pengisian"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Header */}
          <div className="flex items-start gap-3 pr-8">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-800">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-300" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                Panduan Urutan Pengisian Master Data
              </h3>
              <p className="mt-1 text-xs text-blue-600 dark:text-blue-300">
                Setiap entitas bergantung pada data sebelumnya sebagai referensi lookup. Ikuti urutan berikut untuk menghindari error data kosong.
              </p>

              {/* Collapsible detail */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-700 transition-colors hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100"
              >
                {isExpanded ? "Sembunyikan detail" : "Lihat urutan lengkap"}
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>

              {isExpanded && (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                  {setupOrderSteps.map((item) => (
                    <div
                      key={item.step}
                      className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 dark:bg-slate-800/50"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                        {item.step}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-blue-900 dark:text-blue-100">
                          {item.name}
                        </p>
                        <p className="truncate text-[10px] text-blue-600 dark:text-blue-400">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Small toggle to show the guide again */
        <button
          onClick={handleShowAgain}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300"
        >
          <Info className="h-3.5 w-3.5" />
          Panduan urutan pengisian
        </button>
      )}

      {/* UI-MD-07: Search bar for cards */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Cari menu master data..."
          value={cardSearch}
          onChange={(e) => setCardSearch(e.target.value)}
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white placeholder:text-slate-400"
          aria-label="Search master data cards"
        />
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {masterDataItems
          .filter((item) => {
            if (!cardSearch.trim()) return true;
            const q = cardSearch.toLowerCase();
            return item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
          })
          .map((item) => {
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

      {/* Bulk Price Adjustment Dialog */}
      <BulkPriceAdjustDialog
        isOpen={showBulkPriceDialog}
        onClose={() => setShowBulkPriceDialog(false)}
        onSuccess={() => {}}
      />
    </div>
    </RoleGuard>
  );
}
