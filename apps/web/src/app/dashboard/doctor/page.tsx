"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DoctorPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/laboratory/approval");
  }, [router]);
  return (
    <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
      Mengalihkan ke halaman approval...
    </div>
  );
}
