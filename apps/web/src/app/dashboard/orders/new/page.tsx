"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, CheckCircle2, ChevronRight, FlaskConical, ArrowLeft, Tag, Loader2, Calendar, Plus, Package } from "lucide-react";
import { apiClient } from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { VisitSelector, type VisitOption } from "@/components/orders/visit-selector";
import { InlineVisitCreate } from "@/components/orders/inline-visit-create";
import { PatientAvatar } from "@/components/patients/PatientAvatar";

type Step = 1 | 2 | 3;

// ─── Local types matching API responses ─────────────────────────────────────

interface TestApi {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  unit: string;
  price: number;
  category: { name: string };
}

interface PanelTestApi {
  testId: string;
  test: TestApi;
}

interface PanelApi {
  id: string;
  name: string;
  description: string | null;
  price: number;
  panelTests: PanelTestApi[];
}

interface TestCategoryApi {
  id: string;
  name: string;
}

/* ────────────────────────────────────────────────────────────────
   STEP INDICATOR
──────────────────────────────────────────────────────────────── */
function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { n: 1, label: "Pilih Kunjungan", icon: Calendar },
    { n: 2, label: "Pilih Pemeriksaan", icon: FlaskConical },
    { n: 3, label: "Konfirmasi", icon: CheckCircle2 },
  ];
  return (
    <div className="flex items-center gap-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const done = current > s.n;
        const active = current === s.n;
        return (
          <div key={s.n} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1 flex-1">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition-all",
                  active ? "bg-brand text-white shadow-sm shadow-brand/30"
                    : done ? "bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand"
                    : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span className={cn("hidden text-xs font-medium sm:block", active ? "text-brand" : "text-slate-500 dark:text-slate-400")}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn("h-px flex-1 mx-2 transition-all", done ? "bg-brand/40 dark:bg-brand/40" : "bg-slate-200 dark:bg-slate-700")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   STEP 1: VISIT SELECTION (mandatory)
──────────────────────────────────────────────────────────────── */
function VisitStep({
  selectedVisit,
  onSelect,
  onClear,
}: {
  selectedVisit: VisitOption | null;
  onSelect: (visit: VisitOption) => void;
  onClear: () => void;
}) {
  const [showInlineCreate, setShowInlineCreate] = useState(false);
  const [inlineCreatePatientId, setInlineCreatePatientId] = useState<string | undefined>(undefined);

  const handleVisitChange = (visit: VisitOption | null) => {
    if (visit) {
      onSelect(visit);
    } else {
      onClear();
    }
  };

  const handleInlineCreated = (created: { id: string; visitNumber: string; status: string; patient: { id: string; name: string; mrn: string } }) => {
    const visitOption: VisitOption = {
      id: created.id,
      visitNumber: created.visitNumber,
      status: created.status,
      registrationDate: new Date().toISOString(),
      patient: {
        id: created.patient.id,
        name: created.patient.name,
        mrn: created.patient.mrn,
      },
    };
    onSelect(visitOption);
    setShowInlineCreate(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Pilih Kunjungan</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cari dan pilih kunjungan pasien. Minimal 3 karakter untuk mencari.
        </p>
      </div>

      <VisitSelector
        value={selectedVisit}
        onChange={handleVisitChange}
        onInlineCreate={(patientId?: string) => {
          setInlineCreatePatientId(patientId);
          setShowInlineCreate(true);
        }}
      />

      {/* Inline create option */}
      {!selectedVisit && (
        <button
          type="button"
          onClick={() => {
            setInlineCreatePatientId(undefined);
            setShowInlineCreate(true);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand/50 px-4 py-3 text-sm font-medium text-brand transition-colors hover:bg-brand/5"
        >
          <Plus className="h-4 w-4" />
          Buat Kunjungan Baru
        </button>
      )}

      {/* Patient info from selected visit */}
      {selectedVisit && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
          <p className="mb-2 text-xs font-bold tracking-wide text-slate-400 uppercase">Pasien (dari kunjungan)</p>
          <div className="flex items-center gap-3">
            <PatientAvatar name={selectedVisit.patient.name} size="md" />
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">{selectedVisit.patient.name}</div>
              <div className="font-mono text-xs text-brand">{selectedVisit.patient.mrn}</div>
            </div>
          </div>
        </div>
      )}

      {!selectedVisit && (
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 dark:bg-amber-900/20">
          <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Pilih kunjungan terlebih dahulu untuk melanjutkan. Pasien akan otomatis terisi dari data kunjungan.
          </p>
        </div>
      )}

      <InlineVisitCreate
        isOpen={showInlineCreate}
        onClose={() => {
          setShowInlineCreate(false);
          setInlineCreatePatientId(undefined);
        }}
        onCreated={handleInlineCreated}
        preselectedPatientId={inlineCreatePatientId}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   STEP 2: TEST SELECTION (loads from API)
──────────────────────────────────────────────────────────────── */
type SelectionMode = "individual" | "panel";

function TestStep({
  selectedTests,
  onToggle,
  allTests,
  categories,
  loadingTests,
  panels,
  selectedPanels,
  onTogglePanel,
  loadingPanels,
}: {
  selectedTests: TestApi[];
  onToggle: (t: TestApi) => void;
  allTests: TestApi[];
  categories: TestCategoryApi[];
  loadingTests: boolean;
  panels: PanelApi[];
  selectedPanels: PanelApi[];
  onTogglePanel: (p: PanelApi) => void;
  loadingPanels: boolean;
}) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<SelectionMode>("individual");

  // Default to first category once loaded
  useEffect(() => {
    if (categories.length > 0 && !activeCategoryId) {
      setActiveCategoryId(categories[0].id);
    }
  }, [categories, activeCategoryId]);

  const byCategory = useMemo(() => {
    if (search && mode === "individual") {
      const lower = search.toLowerCase();
      const filtered = allTests.filter(
        (t) => t.name.toLowerCase().includes(lower) || t.code.toLowerCase().includes(lower)
      );
      const catIds = [...new Set(filtered.map((t) => t.categoryId))];
      return catIds.map((catId) => ({
        category: categories.find((c) => c.id === catId)?.name || "Lainnya",
        tests: filtered.filter((t) => t.categoryId === catId),
      })).filter((g) => g.tests.length > 0);
    }
    const tests = allTests.filter((t) => t.categoryId === activeCategoryId);
    const catName = categories.find((c) => c.id === activeCategoryId)?.name || "Lainnya";
    return tests.length > 0 ? [{ category: catName, tests }] : [];
  }, [activeCategoryId, search, allTests, categories, mode]);

  const filteredPanels = useMemo(() => {
    if (!search) return panels;
    const lower = search.toLowerCase();
    return panels.filter(
      (p) => p.name.toLowerCase().includes(lower) || (p.description && p.description.toLowerCase().includes(lower))
    );
  }, [panels, search]);

  const isSelected = (id: string) => selectedTests.some((t) => t.id === id);
  const isPanelSelected = (id: string) => selectedPanels.some((p) => p.id === id);

  if (loadingTests || loadingPanels) {
    return (
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-10 w-full animate-pulse rounded-xl bg-muted" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border p-4">
              <div className="h-5 w-5 animate-pulse rounded bg-muted" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                <div className="h-3 w-32 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Pilih Pemeriksaan</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Pilih tes individual atau paket pemeriksaan.</p>
      </div>

      {/* Mode toggle: Individual vs Panel */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => setMode("individual")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
            mode === "individual"
              ? "bg-brand text-white shadow-sm"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          <FlaskConical className="h-3.5 w-3.5" />
          Tes Individual
        </button>
        <button
          type="button"
          onClick={() => setMode("panel")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
            mode === "panel"
              ? "bg-brand text-white shadow-sm"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          <Package className="h-3.5 w-3.5" />
          Paket Pemeriksaan
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          id="new-order-test-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={mode === "individual" ? "Cari nama atau kode pemeriksaan..." : "Cari nama paket..."}
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
      </div>

      {/* ─── INDIVIDUAL TEST MODE ─── */}
      {mode === "individual" && (
        <>
          {/* Category tabs */}
          {!search && categories.length > 0 && (
            <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  id={`test-cat-${cat.name.toLowerCase().replace(/\s/g, "-")}`}
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={cn(
                    "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                    activeCategoryId === cat.id
                      ? "bg-brand text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Test list */}
          <div className="space-y-4">
            {byCategory.map(({ category, tests }) => (
              <div key={category}>
                {search && (
                  <p className="mb-2 text-xs font-bold tracking-wide text-slate-400 dark:text-slate-500 uppercase">{category}</p>
                )}
                <div className="grid gap-2 sm:grid-cols-2">
                  {tests.map((test) => {
                    const selected = isSelected(test.id);
                    return (
                      <button
                        key={test.id}
                        id={`test-item-${test.id}`}
                        onClick={() => onToggle(test)}
                        className={cn(
                          "flex items-center justify-between rounded-xl border p-3.5 text-left transition-all",
                          selected
                            ? "border-brand/50 bg-brand/10 ring-1 ring-brand/30 dark:border-brand dark:bg-brand/10"
                            : "border-slate-200 bg-white hover:border-brand/30 hover:bg-brand/10/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand/50 dark:hover:bg-brand/10"
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold",
                              selected ? "bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            )}>
                              {test.code}
                            </span>
                            <span className="truncate text-sm font-medium text-slate-900 dark:text-white">{test.name}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                            <span>{formatRupiah(Number(test.price))}</span>
                            <span>·</span>
                            <span>{test.unit}</span>
                          </div>
                        </div>
                        <div className={cn(
                          "ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                          selected ? "border-brand bg-brand" : "border-slate-300 dark:border-slate-600"
                        )}>
                          {selected && (
                            <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ─── PANEL MODE ─── */}
      {mode === "panel" && (
        <div className="space-y-3">
          {filteredPanels.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Package className="h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {search ? "Tidak ada paket yang cocok" : "Belum ada paket pemeriksaan"}
              </p>
            </div>
          )}
          {filteredPanels.map((panel) => {
            const selected = isPanelSelected(panel.id);
            const testCount = panel.panelTests?.length ?? 0;
            return (
              <button
                key={panel.id}
                id={`panel-item-${panel.id}`}
                type="button"
                onClick={() => onTogglePanel(panel)}
                className={cn(
                  "w-full rounded-xl border p-4 text-left transition-all",
                  selected
                    ? "border-brand/50 bg-brand/10 ring-1 ring-brand/30 dark:border-brand dark:bg-brand/10"
                    : "border-slate-200 bg-white hover:border-brand/30 hover:bg-brand/5 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand/50 dark:hover:bg-brand/10"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Package className={cn("h-4 w-4 shrink-0", selected ? "text-brand" : "text-slate-400")} />
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{panel.name}</span>
                    </div>
                    {panel.description && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 pl-6">{panel.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-3 pl-6">
                      <span className="text-xs font-medium text-brand">{formatRupiah(Number(panel.price))}</span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-500">{testCount} parameter</span>
                    </div>
                    {/* Show included tests */}
                    {panel.panelTests && panel.panelTests.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1 pl-6">
                        {panel.panelTests.slice(0, 5).map((pt) => (
                          <span key={pt.testId} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {pt.test?.code || pt.testId.slice(0, 6)}
                          </span>
                        ))}
                        {panel.panelTests.length > 5 && (
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            +{panel.panelTests.length - 5} lainnya
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className={cn(
                    "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                    selected ? "border-brand bg-brand" : "border-slate-300 dark:border-slate-600"
                  )}>
                    {selected && (
                      <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   STEP 3: CONFIRMATION
──────────────────────────────────────────────────────────────── */
function ConfirmStep({
  visit,
  selectedTests,
  selectedPanels,
  notes,
  onNotesChange,
}: {
  visit: VisitOption;
  selectedTests: TestApi[];
  selectedPanels: PanelApi[];
  notes: string;
  onNotesChange: (v: string) => void;
}) {
  const testsSubtotal = selectedTests.reduce((s, t) => s + Number(t.price), 0);
  const panelsSubtotal = selectedPanels.reduce((s, p) => s + Number(p.price), 0);
  const subtotal = testsSubtotal + panelsSubtotal;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Konfirmasi Order</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Periksa kembali detail order sebelum disimpan.</p>
      </div>

      {/* Visit & Patient summary */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
        <p className="mb-2 text-xs font-bold tracking-wide text-slate-400 uppercase">Kunjungan</p>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">{visit.visitNumber}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {new Date(visit.registrationDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
        <p className="mb-2 text-xs font-bold tracking-wide text-slate-400 uppercase">Pasien</p>
        <div className="flex items-center gap-3">
          <PatientAvatar name={visit.patient.name} size="md" />
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">{visit.patient.name}</div>
            <div className="font-mono text-xs text-brand">{visit.patient.mrn}</div>
          </div>
        </div>
      </div>

      {/* Test list */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:border-slate-700 dark:bg-slate-950">
        <div className="border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
          <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">
            Pemeriksaan ({selectedTests.length + selectedPanels.length} item)
          </p>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {/* Panels */}
          {selectedPanels.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <Package className="h-3.5 w-3.5 text-brand" />
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{p.name}</span>
                <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-medium text-brand">
                  {p.panelTests?.length ?? 0} parameter
                </span>
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{formatRupiah(Number(p.price))}</span>
            </div>
          ))}
          {/* Individual tests */}
          {selectedTests.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">{t.code}</span>
                <span className="text-sm text-slate-800 dark:text-slate-200">{t.name}</span>
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{formatRupiah(Number(t.price))}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Total</span>
          <span className="text-lg font-bold text-brand">{formatRupiah(subtotal)}</span>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="order-notes" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
          <Tag className="h-3.5 w-3.5 text-slate-400" /> Catatan Klinis (opsional)
        </label>
        <textarea
          id="order-notes"
          rows={2}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          maxLength={2000}
          placeholder="Mis: Pasien puasa 10 jam, suspek DM tipe 2..."
          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   MAIN PAGE
──────────────────────────────────────────────────────────────── */
function NewOrderPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>(1);
  const [selectedVisit, setSelectedVisit] = useState<VisitOption | null>(null);
  const [selectedTests, setSelectedTests] = useState<TestApi[]>([]);
  const [selectedPanels, setSelectedPanels] = useState<PanelApi[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tests, categories, and panels loaded on mount
  const [allTests, setAllTests] = useState<TestApi[]>([]);
  const [categories, setCategories] = useState<TestCategoryApi[]>([]);
  const [panels, setPanels] = useState<PanelApi[]>([]);
  const [loadingTests, setLoadingTests] = useState(true);
  const [loadingPanels, setLoadingPanels] = useState(true);

  // Pre-populate visit from URL query param (e.g., from registration flow CTA)
  useEffect(() => {
    const visitId = searchParams.get("visitId");
    if (!visitId || selectedVisit) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.getVisit(visitId);
        const data = (res?.data ?? res) as Record<string, unknown> | undefined;
        if (cancelled || !data || !data.id) return;

        const patient = data.patient as Record<string, unknown> | undefined;
        if (!patient) return;

        const visitOption: VisitOption = {
          id: data.id as string,
          visitNumber: data.visitNumber as string,
          status: data.status as string,
          registrationDate: (data.registrationDate as string) || new Date().toISOString(),
          patient: {
            id: patient.id as string,
            name: patient.name as string,
            mrn: patient.mrn as string,
            dateOfBirth: (patient.dateOfBirth as string) || undefined,
          },
        };

        setSelectedVisit(visitOption);
        setStep(2); // Skip to test selection since visit is pre-selected
      } catch {
        // On error, fall back to normal flow — user can search manually
      }
    })();

    return () => { cancelled = true; };
  }, [searchParams, selectedVisit]);

  useEffect(() => {
    const loadData = async () => {
      setLoadingTests(true);
      setLoadingPanels(true);
      try {
        const [testsRes, catsRes, panelsRes] = await Promise.all([
          apiClient.getTests({ limit: 100 }),
          apiClient.getTestCategories({ limit: 50 }),
          apiClient.getPanels({ limit: 50 }),
        ]);
        // After unwrapResponse, response is { data: [...], meta: {...} }
        const testsEnvelope = testsRes as unknown as Record<string, unknown>;
        const catsEnvelope = catsRes as unknown as Record<string, unknown>;
        const panelsEnvelope = panelsRes as unknown as Record<string, unknown>;
        const testsArray = Array.isArray(testsEnvelope?.data) ? testsEnvelope.data : [];
        const catsArray = Array.isArray(catsEnvelope?.data) ? catsEnvelope.data : [];
        const panelsArray = Array.isArray(panelsEnvelope?.data) ? panelsEnvelope.data : [];
        // Prisma Decimal fields serialize as strings — convert to number
        const testsWithNumericPrice = (testsArray as TestApi[]).map((t) => ({
          ...t,
          price: typeof t.price === "string" ? parseFloat(t.price) : Number(t.price) || 0,
        }));
        const panelsWithNumericPrice = (panelsArray as PanelApi[]).map((p) => ({
          ...p,
          price: typeof p.price === "string" ? parseFloat(p.price) : Number(p.price) || 0,
        }));
        setAllTests(testsWithNumericPrice);
        setCategories(catsArray as TestCategoryApi[]);
        setPanels(panelsWithNumericPrice);
      } catch {
        // Silently fail, tests will be empty
      } finally {
        setLoadingTests(false);
        setLoadingPanels(false);
      }
    };
    loadData();
  }, []);

  const subtotal = selectedTests.reduce((s, t) => s + Number(t.price), 0)
    + selectedPanels.reduce((s, p) => s + Number(p.price), 0);

  const toggleTest = (t: TestApi) => {
    setSelectedTests((prev) =>
      prev.some((x) => x.id === t.id) ? prev.filter((x) => x.id !== t.id) : [...prev, t]
    );
  };

  const togglePanel = (p: PanelApi) => {
    setSelectedPanels((prev) =>
      prev.some((x) => x.id === p.id) ? prev.filter((x) => x.id !== p.id) : [...prev, p]
    );
  };

  const handleVisitSelect = (visit: VisitOption) => {
    setSelectedVisit(visit);
    setErrorMessage(null);
  };

  const handleVisitClear = () => {
    setSelectedVisit(null);
    setSelectedTests([]);
    setSelectedPanels([]);
    setNotes("");
    setErrorMessage(null);
  };

  const handleSubmit = async () => {
    if (!selectedVisit) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiClient.createOrder({
        visitId: selectedVisit.id,
        patientId: selectedVisit.patient.id,
        testIds: selectedTests.map((t) => t.id),
        panelIds: selectedPanels.length > 0 ? selectedPanels.map((p) => p.id) : undefined,
        notes: notes.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => router.push("/dashboard/orders"), 1800);
    } catch (err: unknown) {
      const message = err && typeof err === "object" && "message" in err ? (err as { message: string }).message : "Gagal membuat order";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand/10 dark:bg-brand/20">
          <CheckCircle2 className="h-10 w-10 text-brand" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Order Berhasil Dibuat!</h2>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Pasien <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedVisit?.patient.name}</span> sedang diarahkan ke kasir...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Back */}
      <button
        id="new-order-back-btn"
        onClick={() => (step > 1 ? setStep((s) => (s - 1) as Step) : router.back())}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {step > 1 ? "Kembali" : "Batal"}
      </button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Buat Order Baru</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Ikuti langkah-langkah di bawah untuk membuat order pemeriksaan.</p>
      </div>

      {/* Step indicator */}
      <StepIndicator current={step} />

      {/* Step content */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        {step === 1 && (
          <VisitStep
            selectedVisit={selectedVisit}
            onSelect={handleVisitSelect}
            onClear={handleVisitClear}
          />
        )}
        {step === 2 && (
          <TestStep
            selectedTests={selectedTests}
            onToggle={toggleTest}
            allTests={allTests}
            categories={categories}
            loadingTests={loadingTests}
            panels={panels}
            selectedPanels={selectedPanels}
            onTogglePanel={togglePanel}
            loadingPanels={loadingPanels}
          />
        )}
        {step === 3 && selectedVisit && (
          <ConfirmStep
            visit={selectedVisit}
            selectedTests={selectedTests}
            selectedPanels={selectedPanels}
            notes={notes}
            onNotesChange={setNotes}
          />
        )}
      </div>

      {/* Selected tests floating summary (step 2) */}
      {step === 2 && (selectedTests.length > 0 || selectedPanels.length > 0) && (
        <div className="rounded-2xl border border-brand/30 bg-brand/10 p-4 dark:border-brand/50 dark:bg-brand/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-brand dark:text-brand">
                {selectedPanels.length > 0 && `${selectedPanels.length} paket`}
                {selectedPanels.length > 0 && selectedTests.length > 0 && " + "}
                {selectedTests.length > 0 && `${selectedTests.length} tes`}
                {selectedPanels.length === 0 && selectedTests.length === 0 && "0 dipilih"}
                {" "}dipilih
              </p>
              <p className="text-xs text-brand">
                Total: <span className="font-bold">{formatRupiah(subtotal)}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 max-w-xs justify-end">
              {selectedPanels.slice(0, 2).map((p) => (
                <span key={p.id} className="flex items-center gap-1 rounded-full bg-brand/10 pl-2 pr-1 py-0.5 text-[11px] font-semibold text-brand dark:bg-brand/20 dark:text-brand">
                  <Package className="h-2.5 w-2.5" />
                  {p.name.length > 12 ? p.name.slice(0, 12) + "…" : p.name}
                  <button onClick={() => togglePanel(p)} className="rounded-full hover:bg-brand/20 dark:hover:bg-brand/20 p-0.5">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
              {selectedTests.slice(0, 3).map((t) => (
                <span key={t.id} className="flex items-center gap-1 rounded-full bg-brand/10 pl-2 pr-1 py-0.5 text-[11px] font-semibold text-brand dark:bg-brand/20 dark:text-brand">
                  {t.code}
                  <button onClick={() => toggleTest(t)} className="rounded-full hover:bg-brand/20 dark:hover:bg-brand/20 p-0.5">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
              {(selectedTests.length + selectedPanels.length) > 5 && (
                <span className="rounded-full bg-brand/20 px-2 py-0.5 text-[11px] font-semibold text-brand dark:bg-brand/20 dark:text-brand">
                  +{selectedTests.length + selectedPanels.length - 5}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error toast */}
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="rounded-lg p-1 text-red-400 transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Navigation footer */}
      {step === 1 && selectedVisit && (
        <div className="flex justify-end">
          <button
            id="new-order-step1-next"
            onClick={() => setStep(2)}
            className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"
          >
            Pilih Pemeriksaan <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
      {step === 2 && (
        <div className="flex justify-end">
          <button
            id="new-order-step2-next"
            onClick={() => setStep(3)}
            disabled={selectedTests.length === 0 && selectedPanels.length === 0}
            className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            Konfirmasi <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
      {step === 3 && (
        <div className="flex justify-end">
          <button
            id="new-order-submit"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedVisit || (selectedTests.length === 0 && selectedPanels.length === 0)}
            className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>Simpan &amp; Ke Kasir <ChevronRight className="h-4 w-4" /></>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Page export — wraps inner component in Suspense (required for useSearchParams) ─────
export default function NewOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 py-6">
          <div className="space-y-2">
            <div className="h-7 w-48 animate-pulse rounded-lg bg-muted" />
            <div className="h-4 w-72 animate-pulse rounded bg-muted" />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
            <div className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
          </div>
        </div>
      }
    >
      <NewOrderPageInner />
    </Suspense>
  );
}
