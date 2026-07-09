import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-[#6B8E6B] focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
      >
        Langsung ke konten utama
      </a>
      <Header />
      <div className="flex flex-1 pt-16">
        <Sidebar />
        <main id="main-content" className="flex-1 lg:pl-64">
          <div className="mx-auto h-full max-w-7xl p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
