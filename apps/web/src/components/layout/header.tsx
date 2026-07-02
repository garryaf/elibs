import { Search, Bell, Menu } from "lucide-react";

export function Header() {
  return (
    <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80 sm:px-6">
      <div className="flex items-center gap-4">
        {/* Mobile menu button (placeholder) */}
        <button className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white shadow-sm">
            e
          </div>
          <span className="hidden text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:inline-block">
            LIS
          </span>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-4 sm:justify-between sm:px-8">
        <div className="hidden max-w-md flex-1 items-center sm:flex">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search patients, orders, or results..."
              className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:focus:border-blue-500 dark:focus:bg-slate-950"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-950"></span>
          </button>
          
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800"></div>
          
          <button className="flex items-center gap-2 rounded-full p-1 pl-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">dr. Admin</span>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Pathologist</span>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
              A
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
