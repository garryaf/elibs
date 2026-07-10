import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-[#6B8E6B] text-white shadow-sm shadow-[#6B8E6B]/20 hover:bg-[#5A7D5A] hover:shadow-md hover:shadow-[#6B8E6B]/20 active:scale-[0.98]",
  secondary:
    "bg-[#6B8E6B]/10 text-[#6B8E6B] border border-[#6B8E6B]/30 hover:bg-[#6B8E6B]/20 dark:bg-[#6B8E6B]/10 dark:border-[#6B8E6B]/50",
  outline:
    "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
  danger:
    "bg-red-600 text-white shadow-sm hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800",
  ghost:
    "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
};

const sizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-base gap-2.5 rounded-xl",
};

/**
 * Application-level Button component with eLIS design system styling.
 * Supports loading state, icons, and multiple variants/sizes.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex shrink-0 items-center justify-center font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : icon ? (
          <span className="[&_svg]:h-4 [&_svg]:w-4">{icon}</span>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
