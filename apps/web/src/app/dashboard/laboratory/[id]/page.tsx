"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/**
 * Legacy route — redirects to the proper result entry page.
 * `/dashboard/laboratory/[id]` → `/dashboard/laboratory/results/[id]`
 */
export default function LegacyLabDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/dashboard/laboratory/results/${id}`);
  }, [id, router]);

  return (
    <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
      Mengalihkan...
    </div>
  );
}
