"use client";

import { Search, Bell, Menu, LogOut } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getInitials } from "@/lib/format";
import { useShortcut } from "@/hooks/use-shortcuts";

interface HeaderProps {
  onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [quickSearch, setQuickSearch] = useState("");

  useShortcut("k", () => searchInputRef.current?.focus(), { ctrlCmd: true });

  const handleLogout = () => {
    logout();
    router.replace("/");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = quickSearch.trim();
    if (!q) return;
    router.push(`/dashboard/orders?search=${encodeURIComponent(q)}`);
  };

  const displayName = user?.email?.split("@")[0] || "User";
  const displayRole = user?.role || "Staff";
  const initial = getInitials(displayName);

  return (
    <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-border bg-card/85 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label="Buka menu navigasi"
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand font-bold text-white shadow-sm">
            e
          </div>
          <span className="hidden text-xl font-bold tracking-tight text-foreground sm:inline-block">
            LIS
          </span>
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-end gap-4 sm:justify-between sm:px-8">
        <form onSubmit={handleSearchSubmit} className="hidden max-w-md flex-1 items-center sm:flex">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="search"
              name="global-search"
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              aria-label="Cari pasien atau order"
              placeholder="Cari pasien atau order…"
              className="w-full rounded-full border border-border bg-muted/40 py-2 pl-10 pr-12 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-brand focus:bg-card focus:ring-2 focus:ring-brand/20"
            />
            <div className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center" aria-hidden="true">
              <kbd className="hidden items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
                <span className="text-xs">⌘</span>&nbsp;K
              </kbd>
            </div>
          </div>
        </form>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/laboratory/critical-values"
            aria-label="Lihat nilai kritis laboratorium"
            title="Nilai Kritis"
            className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
          </Link>

          <div className="h-8 w-px bg-border" aria-hidden="true" />

          <div className="flex items-center gap-2 rounded-full p-1 pl-2">
            <div className="hidden flex-col items-end sm:flex">
              <span className="text-sm font-semibold text-foreground">
                {displayName}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground">
                {displayRole}
              </span>
            </div>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand dark:bg-brand/20"
              aria-hidden="true"
            >
              {initial}
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            aria-label="Keluar dari aplikasi"
            title="Keluar"
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
