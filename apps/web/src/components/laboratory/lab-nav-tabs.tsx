"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  FlaskConical,
  ShieldCheck,
  BarChart3,
} from "lucide-react";

export type LabRole =
  | "ADMIN"
  | "SUPER_ADMIN"
  | "SAMPLING"
  | "ANALIS"
  | "DOKTER"
  | "OWNER"
  | "MANAGER";

export interface LabTab {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  /** Roles that can see this tab */
  allowedRoles: LabRole[];
}

const LAB_TABS: LabTab[] = [
  {
    id: "queue",
    label: "Antrian",
    href: "/dashboard/laboratory/queue",
    icon: ClipboardList,
    allowedRoles: ["ADMIN", "SUPER_ADMIN", "SAMPLING", "ANALIS", "DOKTER"],
  },
  {
    id: "results",
    label: "Hasil",
    href: "/dashboard/laboratory/results",
    icon: FlaskConical,
    allowedRoles: ["ADMIN", "SUPER_ADMIN", "ANALIS"],
  },
  {
    id: "approval",
    label: "Approval",
    href: "/dashboard/laboratory/approval",
    icon: ShieldCheck,
    allowedRoles: ["ADMIN", "SUPER_ADMIN", "DOKTER"],
  },
  {
    id: "lab-dashboard",
    label: "Dashboard",
    href: "/dashboard/laboratory/lab-dashboard",
    icon: BarChart3,
    allowedRoles: ["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER"],
  },
];

interface LabNavTabsProps {
  /** Current user role — determines which tabs are visible */
  userRole?: LabRole;
}

export function LabNavTabs({ userRole = "ADMIN" }: LabNavTabsProps) {
  const pathname = usePathname();

  const visibleTabs = LAB_TABS.filter((tab) =>
    tab.allowedRoles.includes(userRole)
  );

  return (
    <nav
      aria-label="Laboratory navigation"
      className="flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1"
    >
      {visibleTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive =
          pathname === tab.href || pathname.startsWith(`${tab.href}/`);

        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all",
              isActive
                ? "bg-brand text-white shadow-sm"
                : "text-[#8B8B6B] hover:bg-brand/10 hover:text-brand"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
