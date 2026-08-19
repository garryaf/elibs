import React from "react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/format";
import type { Gender } from "@/types/patient";

export interface PatientAvatarProps {
  name?: string | null;
  gender?: Gender | string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs rounded-lg",
  md: "h-9 w-9 text-xs rounded-xl",
  lg: "h-12 w-12 text-base rounded-2xl",
  xl: "h-16 w-16 text-2xl rounded-2xl",
};

/**
 * Reusable Avatar component for patients with 2-letter initials and gender/brand theme styling.
 */
export function PatientAvatar({
  name,
  gender,
  size = "md",
  className,
}: PatientAvatarProps) {
  const initials = getInitials(name);

  const genderClass =
    gender === "MALE"
      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
      : gender === "FEMALE"
      ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
      : "bg-brand/10 text-brand dark:bg-brand/20";

  return (
    <div
      data-testid="patient-avatar"
      aria-label={`Avatar ${name || "Pasien"}`}
      className={cn(
        "flex shrink-0 items-center justify-center font-bold select-none",
        sizeClasses[size],
        genderClass,
        className
      )}
    >
      {initials}
    </div>
  );
}
