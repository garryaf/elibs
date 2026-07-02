"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FileText,
  TestTube,
  Stethoscope,
  BarChart3,
  Settings,
} from "lucide-react";

const menuItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Pasien", href: "/dashboard/patients", icon: Users },
  { name: "Order & Kasir", href: "/dashboard/orders", icon: FileText },
  { name: "Laboratorium", href: "/dashboard/laboratory", icon: TestTube },
  { name: "Validasi Dokter", href: "/dashboard/doctor", icon: Stethoscope },
  { name: "Laporan", href: "/dashboard/reports", icon: BarChart3 },
  { name: "Pengaturan", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-slate-200 bg-slate-50 pt-16 transition-all duration-300 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex h-full flex-col overflow-y-auto px-4 py-6">
        <div className="mb-4 px-2 text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500">
          MAIN MENU
        </div>
        <ul className="space-y-1 font-medium">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(`${item.href}/`) && item.href !== "/dashboard");
            const Icon = item.icon;
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center rounded-xl px-3 py-2.5 text-slate-600 hover:bg-white hover:text-emerald-700 hover:shadow-sm dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-emerald-400 transition-all duration-200 ease-in-out",
                    isActive && "bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100 dark:bg-slate-900 dark:text-emerald-400 dark:ring-emerald-900/50"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 text-slate-400 transition-colors duration-200 group-hover:text-emerald-600 dark:text-slate-500 dark:group-hover:text-emerald-400",
                      isActive && "text-emerald-600 dark:text-emerald-400"
                    )}
                  />
                  <span className="ml-3 text-sm">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-center">
        <p className="text-[10px] font-medium tracking-wider text-slate-400">eLIS ENTERPRISE v1.0</p>
      </div>
    </aside>
  );
}
