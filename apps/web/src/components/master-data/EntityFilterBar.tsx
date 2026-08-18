"use client";

import { useQuery } from "@tanstack/react-query";
import { Filter } from "lucide-react";
import { apiClient } from "@/lib/api";

interface EntityFilter {
  name: string;
  label: string;
  endpoint: string;
}

interface EntityFilterBarProps {
  filters: EntityFilter[];
  values: Record<string, string>;
  onChange: (filterName: string, value: string) => void;
}

interface EntityOption {
  id: string;
  name: string;
  code?: string;
}

function FilterDropdown({
  filter,
  value,
  onChange,
}: {
  filter: EntityFilter;
  value: string;
  onChange: (value: string) => void;
}) {
  const { data } = useQuery({
    queryKey: ["filter-options", filter.endpoint],
    queryFn: () =>
      apiClient.get<{ data: EntityOption[] }>(`${filter.endpoint}?limit=100`),
  });

  const options = data?.data ?? [];

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor={`filter-${filter.name}`}
        className="text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap"
      >
        {filter.label}
      </label>
      <select
        id={`filter-${filter.name}`}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm transition-colors hover:border-slate-300 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
        aria-label={filter.label}
      >
        <option value="">Semua</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.name}{opt.code ? ` (${opt.code})` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

export function EntityFilterBar({ filters, values, onChange }: EntityFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
        <Filter className="h-4 w-4" />
        <span>Filter:</span>
      </div>
      {filters.map((filter) => (
        <FilterDropdown
          key={filter.name}
          filter={filter}
          value={values[filter.name] || ""}
          onChange={(val) => onChange(filter.name, val)}
        />
      ))}
    </div>
  );
}
