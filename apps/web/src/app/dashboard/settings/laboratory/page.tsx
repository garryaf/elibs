"use client";

import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";

export default function LaboratorySettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Konfigurasi Laboratorium
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Pengaturan khusus laboratorium
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <Info className="h-5 w-5 text-blue-500 dark:text-blue-400" />
          </div>
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Master data laboratorium telah dipindahkan ke halaman Master Data.
              Konfigurasi lab spesifik akan tersedia pada rilis mendatang.
            </p>
            <Link
              href="/dashboard/master-data"
              className="inline-flex items-center gap-2 rounded-lg bg-[#6B8E6B] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#5A7D5A]"
            >
              Buka Master Data
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
