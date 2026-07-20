"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

// Map path segments to Indonesian labels
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  patients: "Pasien",
  orders: "Order",
  laboratory: "Laboratorium",
  doctor: "Validasi Dokter",
  reports: "Laporan",
  settings: "Pengaturan",
  "audit-trail": "Audit Trail",
  administration: "Administrasi",
  users: "Kelola User",
  system: "Sistem",
  "master-data": "Master Data",
  regions: "Wilayah",
  registration: "Registrasi",
  notifications: "Notifikasi",
  "reference-values": "Nilai Rujukan",
  new: "Baru",
};

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Don't show breadcrumb on root dashboard
  if (segments.length <= 1) return null;

  const breadcrumbs = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const label = SEGMENT_LABELS[segment] || segment;
    const isLast = index === segments.length - 1;

    return { href, label, isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1.5 text-sm text-slate-500">
        {breadcrumbs.map((crumb, i) => (
          <li key={crumb.href} className="flex items-center gap-1.5">
            {i === 0 && <Home className="h-3.5 w-3.5" />}
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" />}
            {crumb.isLast ? (
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="hover:text-brand transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
