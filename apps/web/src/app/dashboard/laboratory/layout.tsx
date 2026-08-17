"use client";

import { LabNavTabs } from "@/components/laboratory/lab-nav-tabs";
import type { LabRole } from "@/components/laboratory/lab-nav-tabs";
import { useAuth } from "@/lib/auth-context";

/** Valid lab roles that map to LabNavTabs visibility */
const VALID_LAB_ROLES: LabRole[] = [
  "ADMIN",
  "SUPER_ADMIN",
  "SAMPLING",
  "ANALIS",
  "DOKTER",
  "OWNER",
  "MANAGER",
];

export default function LaboratoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const rawRole = user?.role ?? "ANALIS";
  const userRole: LabRole = VALID_LAB_ROLES.includes(rawRole as LabRole)
    ? (rawRole as LabRole)
    : "ANALIS";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Laboratorium
        </h1>
        <p className="text-sm text-muted-foreground">
          Kelola antrian laboratorium, input hasil, verifikasi, dan approval.
        </p>
      </div>

      {/* Sub-navigation tabs */}
      <LabNavTabs userRole={userRole} />

      {/* Page content rendered inside a Bento Grid-ready container */}
      <section className="min-h-[60vh]">{children}</section>
    </div>
  );
}
