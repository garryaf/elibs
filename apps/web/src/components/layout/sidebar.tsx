"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  Users,
  FileText,
  TestTube,
  Stethoscope,
  BarChart3,
  Shield,
  Settings,
  ChevronDown,
  UserCog,
  Database,
  FlaskConical,
  Bell,
} from "lucide-react";

// ─── Role-based menu configuration ──────────────────────────────────────────

type RoleKey =
  | "SUPER_ADMIN"
  | "OWNER"
  | "MANAGER"
  | "ADMIN"
  | "KASIR"
  | "CS"
  | "SAMPLING"
  | "ANALIS"
  | "DOKTER"
  | "MARKETING"
  | "KLINIK_PARTNER";

interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: RoleKey[]; // If undefined, visible to all roles
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
  defaultOpen?: boolean;
}

const ALL_ROLES: RoleKey[] = [
  "SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN", "KASIR", "CS",
  "SAMPLING", "ANALIS", "DOKTER", "MARKETING", "KLINIK_PARTNER",
];

const menuGroups: MenuGroup[] = [
  {
    label: "UTAMA",
    defaultOpen: true,
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Pasien", href: "/dashboard/patients", icon: Users },
      {
        name: "Order & Kasir",
        href: "/dashboard/orders",
        icon: FileText,
        roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN", "KASIR", "CS", "KLINIK_PARTNER"],
      },
    ],
  },
  {
    label: "LABORATORIUM",
    defaultOpen: true,
    items: [
      {
        name: "Laboratorium",
        href: "/dashboard/laboratory",
        icon: TestTube,
        roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN", "SAMPLING", "ANALIS"],
      },
      {
        name: "Validasi Dokter",
        href: "/dashboard/doctor",
        icon: Stethoscope,
        roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN", "DOKTER"],
      },
    ],
  },
  {
    label: "ADMINISTRASI",
    defaultOpen: false,
    items: [
      {
        name: "Kelola User",
        href: "/dashboard/administration/users",
        icon: UserCog,
        roles: ["SUPER_ADMIN", "OWNER", "ADMIN"],
      },
      {
        name: "Master Data",
        href: "/dashboard/master-data",
        icon: Database,
        roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN"],
      },
      {
        name: "Laporan",
        href: "/dashboard/reports",
        icon: BarChart3,
        roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN", "KASIR"],
      },
      {
        name: "Notifikasi",
        href: "/dashboard/administration/notifications",
        icon: Bell,
        roles: ["SUPER_ADMIN", "OWNER", "ADMIN"],
      },
      {
        name: "Audit Trail",
        href: "/dashboard/audit-trail",
        icon: Shield,
        roles: ["SUPER_ADMIN", "OWNER", "ADMIN"],
      },
      {
        name: "Pengaturan",
        href: "/dashboard/settings/general",
        icon: Settings,
        roles: ["SUPER_ADMIN", "ADMIN"],
      },
    ],
  },
];

// ─── Sidebar Component ───────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const userRole = (user?.role || "KASIR") as RoleKey;

  // Track which groups are open
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    menuGroups.forEach((group) => {
      initial[group.label] = group.defaultOpen ?? false;
    });
    return initial;
  });

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  // Filter items by role
  const isItemVisible = (item: MenuItem): boolean => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  };

  // Auto-open group if it contains the active route
  const isGroupActive = (group: MenuGroup): boolean => {
    return group.items.some(
      (item) =>
        pathname === item.href ||
        (pathname.startsWith(`${item.href}/`) && item.href !== "/dashboard")
    );
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-slate-200 bg-slate-50 pt-16 transition-all duration-300 dark:border-slate-800 dark:bg-slate-950">
      <nav aria-label="Menu Utama" className="flex h-full flex-col overflow-y-auto px-4 py-6">
        {menuGroups.map((group) => {
          const visibleItems = group.items.filter(isItemVisible);
          if (visibleItems.length === 0) return null;

          const isOpen = openGroups[group.label] || isGroupActive(group);

          return (
            <div key={group.label} className="mb-3">
              <button
                onClick={() => toggleGroup(group.label)}
                className="flex w-full items-center justify-between px-2 py-1.5 text-xs font-bold tracking-wider text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
              >
                <span>{group.label}</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-200",
                    isOpen && "rotate-180"
                  )}
                />
              </button>

              {isOpen && (
                <ul className="mt-1 space-y-0.5 font-medium">
                  {visibleItems.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (pathname.startsWith(`${item.href}/`) && item.href !== "/dashboard");
                    const Icon = item.icon;

                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={cn(
                            "group flex items-center rounded-xl px-3 py-2.5 text-slate-600 hover:bg-white hover:text-[#6B8E6B] hover:shadow-sm dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-[#6B8E6B] transition-all duration-200 ease-in-out",
                            isActive &&
                              "bg-white text-[#6B8E6B] shadow-sm ring-1 ring-[#6B8E6B]/20 dark:bg-slate-900 dark:text-[#6B8E6B] dark:ring-[#6B8E6B]/30"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-5 w-5 text-slate-400 transition-colors duration-200 group-hover:text-[#6B8E6B] dark:text-slate-500 dark:group-hover:text-[#6B8E6B]",
                              isActive && "text-[#6B8E6B]"
                            )}
                          />
                          <span className="ml-3 text-sm">{item.name}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-center">
        <p className="text-[10px] font-medium tracking-wider text-slate-400">eLIS ENTERPRISE v1.0</p>
      </div>
    </aside>
  );
}
