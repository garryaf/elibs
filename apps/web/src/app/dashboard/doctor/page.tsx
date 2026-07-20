"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DoctorPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/laboratory/approval");
  }, [router]);
  return null;
}
