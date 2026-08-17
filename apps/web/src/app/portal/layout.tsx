import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hasil Laboratorium — eLIS Portal",
  description: "Portal mandiri pasien untuk melihat dan mengunduh hasil laboratorium.",
};

/**
 * Minimal portal layout — no dashboard sidebar/header.
 * This is a public page authenticated via UUID token in the URL.
 */
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4"
            >
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <line x1="10" y1="9" x2="8" y2="9" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">eLIS</h1>
            <p className="text-xs text-muted-foreground">Portal Hasil Laboratorium</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
      <footer className="border-t bg-card px-4 py-4 text-center text-xs text-muted-foreground sm:px-6">
        <p>© {new Date().getFullYear()} eLIS — Enterprise Laboratory Information System</p>
        <p className="mt-1">Laporan ini bersifat rahasia dan hanya ditujukan untuk pasien yang bersangkutan.</p>
      </footer>
    </div>
  );
}
