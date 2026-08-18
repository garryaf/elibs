"use client";

import { useMasterTestDetail } from "@/services";
import { Loader2 } from "lucide-react";

interface TestDetailPanelProps {
  testId: string;
}

/**
 * Expandable detail panel shown when a test row is clicked in the "Pemeriksaan Lab" table.
 * Displays related entities: Reference Values, Active Tariffs, Panels containing this test, Reagents used.
 */
export function TestDetailPanel({ testId }: TestDetailPanelProps) {
  const { data: test, isLoading, error } = useMasterTestDetail(testId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-6 py-4 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Memuat detail...
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="px-6 py-4 text-sm text-red-500">
        Gagal memuat detail pemeriksaan.
      </div>
    );
  }

  const referenceValues = (test.referenceValues ?? []) as Array<{
    id: string;
    gender: string;
    minAge: number;
    maxAge: number;
    minRef: string | number;
    maxRef: string | number;
    criticalMin?: string | number | null;
    criticalMax?: string | number | null;
  }>;

  const tariffs = (test.tariffs ?? []) as Array<{
    id: string;
    price: string | number;
    discount: string | number;
    effectiveFrom: string;
    effectiveTo?: string | null;
    clinic?: { name: string } | null;
    insurance?: { name: string } | null;
  }>;

  const panelTests = (test.panelTests ?? []) as Array<{
    id: string;
    panel: { id: string; name: string; price?: string | number };
  }>;

  const reagentTestMappings = (test.reagentTestMappings ?? []) as Array<{
    id: string;
    usagePerTest?: string | number | null;
    reagent: { id: string; name: string; code?: string; manufacturer?: string };
  }>;

  return (
    <div className="grid grid-cols-1 gap-4 bg-slate-50/80 px-6 py-4 dark:bg-slate-900/60 md:grid-cols-2">
      {/* Reference Values */}
      <DetailSection title="Nilai Rujukan" count={referenceValues.length}>
        {referenceValues.length === 0 ? (
          <EmptyState text="Belum ada nilai rujukan" />
        ) : (
          <div className="space-y-1">
            {referenceValues.slice(0, 5).map((rv) => (
              <div key={rv.id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <span className="rounded bg-slate-200 px-1.5 py-0.5 font-medium dark:bg-slate-700">
                  {rv.gender === "MALE" ? "L" : rv.gender === "FEMALE" ? "P" : rv.gender}
                </span>
                <span>Usia {rv.minAge}–{rv.maxAge}</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {rv.minRef} – {rv.maxRef}
                </span>
                {(rv.criticalMin || rv.criticalMax) && (
                  <span className="text-red-500">
                    (kritis: {rv.criticalMin ?? "—"} – {rv.criticalMax ?? "—"})
                  </span>
                )}
              </div>
            ))}
            {referenceValues.length > 5 && (
              <p className="text-xs text-slate-400">+{referenceValues.length - 5} lainnya</p>
            )}
          </div>
        )}
      </DetailSection>

      {/* Active Tariffs */}
      <DetailSection title="Tarif Aktif" count={tariffs.length}>
        {tariffs.length === 0 ? (
          <EmptyState text="Belum ada tarif khusus" />
        ) : (
          <div className="space-y-1">
            {tariffs.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Rp {Number(t.price).toLocaleString("id-ID")}
                </span>
                {t.clinic && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700 dark:bg-blue-900 dark:text-blue-300">{t.clinic.name}</span>}
                {t.insurance && <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700 dark:bg-green-900 dark:text-green-300">{t.insurance.name}</span>}
                {!t.clinic && !t.insurance && <span className="text-slate-400">Umum</span>}
              </div>
            ))}
            {tariffs.length > 5 && (
              <p className="text-xs text-slate-400">+{tariffs.length - 5} lainnya</p>
            )}
          </div>
        )}
      </DetailSection>

      {/* Panels containing this test */}
      <DetailSection title="Panel Terkait" count={panelTests.length}>
        {panelTests.length === 0 ? (
          <EmptyState text="Tidak termasuk dalam panel apapun" />
        ) : (
          <div className="space-y-1">
            {panelTests.map((pt) => (
              <div key={pt.id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <span className="font-medium text-slate-700 dark:text-slate-300">{pt.panel.name}</span>
                {pt.panel.price && (
                  <span className="text-slate-400">
                    (Rp {Number(pt.panel.price).toLocaleString("id-ID")})
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </DetailSection>

      {/* Reagents */}
      <DetailSection title="Reagen yang Digunakan" count={reagentTestMappings.length}>
        {reagentTestMappings.length === 0 ? (
          <EmptyState text="Belum ada reagen yang dipetakan" />
        ) : (
          <div className="space-y-1">
            {reagentTestMappings.map((rtm) => (
              <div key={rtm.id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <span className="font-medium text-slate-700 dark:text-slate-300">{rtm.reagent.name}</span>
                {rtm.reagent.manufacturer && (
                  <span className="text-slate-400">({rtm.reagent.manufacturer})</span>
                )}
                {rtm.usagePerTest && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                    {rtm.usagePerTest}/tes
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </DetailSection>
    </div>
  );
}

function DetailSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
      <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}
        <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          {count}
        </span>
      </h4>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-xs italic text-slate-400 dark:text-slate-500">{text}</p>;
}
