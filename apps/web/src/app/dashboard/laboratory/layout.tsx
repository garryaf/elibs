"use client";

import { LabNavTabs } from "@/components/laboratory/lab-nav-tabs";
import type { LabRole } from "@/components/laboratory/lab-nav-tabs";

/**
 * Placeholder: in production this would come from an auth context or session.
 * For now, defaults to ADMIN so all tabs are visible during development.
 */
function useCurrentUserRole(): LabRole {
  // TODO: replace with real auth context (e.g. useSession().user.role)
  return "ADMIN";
}

export default function LaboratoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userRole = useCurrentUserRole();

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
