import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Reusable breadcrumb navigation for multi-level page hierarchies.
 * Last item is rendered as the current page (not clickable).
 *
 * @example
 * <Breadcrumb items={[
 *   { label: "Dashboard", href: "/dashboard" },
 *   { label: "Pengaturan", href: "/dashboard/settings" },
 *   { label: "SMTP" },
 * ]} />
 */
export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("mb-4", className)}>
      <ol className="flex items-center gap-1.5 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500"
                  aria-hidden="true"
                />
              )}
              {isLast || !item.href ? (
                <span
                  className="font-medium text-slate-700 dark:text-slate-200"
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-slate-500 transition-colors hover:text-[#6B8E6B] dark:text-slate-400 dark:hover:text-[#6B8E6B]"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
