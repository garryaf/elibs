"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Info } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function GeneralSettingsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const allowed = ["SUPER_ADMIN", "ADMIN"];
    if (user && !allowed.includes(user.role)) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  if (isLoading || !user) {
    return null;
  }

  const allowed = ["SUPER_ADMIN", "ADMIN"];
  if (!allowed.includes(user.role)) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Konfigurasi Sistem
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Pengaturan umum konfigurasi sistem aplikasi
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col items-center justify-center text-center py-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <Info className="h-7 w-7 text-slate-400" />
          </div>
          <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">
            Opsi konfigurasi sistem akan tersedia pada rilis mendatang.
          </p>
        </div>
      </div>
    </div>
  );
}
