"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Mail,
  Bell,
  FlaskConical,
  MessageCircle,
  Palette,
} from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";

const settingsNav = [
  {
    label: "General",
    href: "/dashboard/settings/general",
    icon: Building2,
    description: "Konfigurasi sistem umum",
  },
  {
    label: "SMTP",
    href: "/dashboard/settings/smtp",
    icon: Mail,
    description: "Konfigurasi email server",
  },
  {
    label: "Notifications",
    href: "/dashboard/settings/notifications",
    icon: Bell,
    description: "Preferensi notifikasi",
  },
  {
    label: "Laboratory",
    href: "/dashboard/settings/laboratory",
    icon: FlaskConical,
    description: "Pengaturan laboratorium",
  },
  {
    label: "WhatsApp",
    href: "/dashboard/settings/whatsapp",
    icon: MessageCircle,
    description: "Integrasi WhatsApp",
  },
  {
    label: "Appearance",
    href: "/dashboard/settings/appearance",
    icon: Palette,
    description: "Tema & tampilan",
  },
];

function getActiveSection(pathname: string): string | null {
  const match = settingsNav.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );
  return match?.label ?? null;
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const activeSection = getActiveSection(pathname);

  const breadcrumbItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Pengaturan", href: "/dashboard/settings" },
    ...(activeSection ? [{ label: activeSection }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} />

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Pengaturan
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Kelola konfigurasi dan preferensi sistem
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar Navigation */}
        <nav className="w-full shrink-0 lg:w-56">
          <ul className="space-y-1">
            {settingsNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-brand/10 text-brand dark:bg-brand-light dark:text-brand"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Content Area */}
        <div className="min-w-0 flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
