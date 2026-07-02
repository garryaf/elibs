import { Activity, Users, FileText, FlaskConical } from "lucide-react";

export default function DashboardPage() {
  const stats = [
    { name: "Total Patients Today", value: "148", change: "+12%", icon: Users, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400" },
    { name: "Active Orders", value: "42", change: "+5%", icon: FileText, color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-400" },
    { name: "Pending Results", value: "18", change: "-2%", icon: FlaskConical, color: "text-amber-600 bg-amber-100 dark:bg-amber-900/50 dark:text-amber-400" },
    { name: "System Uptime", value: "99.9%", change: "0%", icon: Activity, color: "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Welcome to Enterprise Laboratory Information System.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.name}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
              </div>
              <div className={`rounded-lg p-3 ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className={stat.change.startsWith("+") ? "text-emerald-600 font-medium" : stat.change.startsWith("-") ? "text-red-600 font-medium" : "text-slate-500"}>
                {stat.change}
              </span>
              <span className="ml-2 text-slate-500 dark:text-slate-400">from yesterday</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <h2 className="font-semibold text-slate-900 dark:text-white">Recent Orders</h2>
          </div>
          <div className="p-6">
            <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
              <p className="text-sm text-slate-500 dark:text-slate-400">Recent orders widget placeholder</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <h2 className="font-semibold text-slate-900 dark:text-white">Laboratory Status</h2>
          </div>
          <div className="p-6">
            <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
              <p className="text-sm text-slate-500 dark:text-slate-400">Lab equipment status widget placeholder</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
