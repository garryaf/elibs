"use client";

import { useState } from "react";
import { useMasterTestDetail } from "@/services";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { PriceHistoryPanel } from "./PriceHistoryPanel";
import { apiClient } from "@/lib/api";

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
      {/* Reference Values (UI-MD-03: with inline add) */}
      <ReferenceValueSection testId={testId} referenceValues={referenceValues} />

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

      {/* Price History (Audit Trail) */}
      <PriceHistoryPanel testId={testId} className="md:col-span-2" />
    </div>
  );
}

function ReferenceValueSection({ testId, referenceValues }: {
  testId: string;
  referenceValues: Array<{ id: string; gender: string; ageUnit?: string; minAge: number; maxAge: number; minRef: string | number; maxRef: string | number; criticalMin?: string | number | null; criticalMax?: string | number | null }>;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [gender, setGender] = useState("MALE");
  const [ageUnit, setAgeUnit] = useState("YEARS");
  const [minAge, setMinAge] = useState("0");
  const [maxAge, setMaxAge] = useState("150");
  const [minRef, setMinRef] = useState("");
  const [maxRef, setMaxRef] = useState("");
  const [criticalMin, setCriticalMin] = useState("");
  const [criticalMax, setCriticalMax] = useState("");

  const queryClient = useQueryClient();
  const addMutation = useMutation({
    mutationFn: (data: unknown) => apiClient.post(`/api/v1/master/tests/${testId}/reference-values`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-test-detail", testId] });
      setShowAddForm(false);
      setMinRef(""); setMaxRef(""); setCriticalMin(""); setCriticalMax("");
    },
  });

  const handleAdd = () => {
    addMutation.mutate({
      testId,
      gender,
      ageUnit,
      minAge: Number(minAge),
      maxAge: Number(maxAge),
      minRef: Number(minRef),
      maxRef: Number(maxRef),
      ...(criticalMin ? { criticalMin: Number(criticalMin) } : {}),
      ...(criticalMax ? { criticalMax: Number(criticalMax) } : {}),
    });
  };

  const ageUnitLabel = (unit?: string) => {
    if (unit === "DAYS") return "hari";
    if (unit === "MONTHS") return "bln";
    return "thn";
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Nilai Rujukan
          <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {referenceValues.length}
          </span>
        </h4>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-brand hover:bg-brand/10 transition"
        >
          <Plus className="h-3 w-3" /> Tambah
        </button>
      </div>

      {referenceValues.length === 0 && !showAddForm && (
        <p className="text-xs italic text-slate-400 dark:text-slate-500">Belum ada nilai rujukan</p>
      )}

      {referenceValues.length > 0 && (
        <div className="space-y-1 mb-2">
          {referenceValues.slice(0, 6).map((rv) => (
            <div key={rv.id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span className="rounded bg-slate-200 px-1.5 py-0.5 font-medium dark:bg-slate-700">
                {rv.gender === "MALE" ? "L" : rv.gender === "FEMALE" ? "P" : rv.gender}
              </span>
              <span>{rv.minAge}–{rv.maxAge} {ageUnitLabel(rv.ageUnit)}</span>
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
          {referenceValues.length > 6 && (
            <p className="text-xs text-slate-400">+{referenceValues.length - 6} lainnya</p>
          )}
        </div>
      )}

      {/* Inline add form with ageUnit support (BP-MD-04) */}
      {showAddForm && (
        <div className="mt-2 space-y-2 rounded-lg border border-brand/20 bg-brand/5 p-2.5 dark:bg-brand/10">
          <div className="grid grid-cols-4 gap-2">
            <select value={gender} onChange={(e) => setGender(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white">
              <option value="MALE">Laki-laki</option>
              <option value="FEMALE">Perempuan</option>
            </select>
            <select value={ageUnit} onChange={(e) => { setAgeUnit(e.target.value); setMinAge("0"); setMaxAge(e.target.value === "YEARS" ? "150" : e.target.value === "MONTHS" ? "1800" : "54750"); }} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white">
              <option value="YEARS">Tahun</option>
              <option value="MONTHS">Bulan</option>
              <option value="DAYS">Hari</option>
            </select>
            <input type="number" placeholder={`Min (${ageUnitLabel(ageUnit)})`} value={minAge} onChange={(e) => setMinAge(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            <input type="number" placeholder={`Max (${ageUnitLabel(ageUnit)})`} value={maxAge} onChange={(e) => setMaxAge(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" step="0.01" placeholder="Nilai min" value={minRef} onChange={(e) => setMinRef(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white" required />
            <input type="number" step="0.01" placeholder="Nilai max" value={maxRef} onChange={(e) => setMaxRef(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white" required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" step="0.01" placeholder="Kritis min (opsional)" value={criticalMin} onChange={(e) => setCriticalMin(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            <input type="number" step="0.01" placeholder="Kritis max (opsional)" value={criticalMax} onChange={(e) => setCriticalMax(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAddForm(false)} className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400">Batal</button>
            <button
              onClick={handleAdd}
              disabled={!minRef || !maxRef || addMutation.isPending}
              className="flex-1 rounded-lg bg-brand py-1.5 text-xs font-bold text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              {addMutation.isPending ? "..." : "Simpan"}
            </button>
          </div>
        </div>
      )}
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
