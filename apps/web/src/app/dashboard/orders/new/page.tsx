"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, X, CheckCircle2, ChevronRight, FlaskConical, ArrowLeft, Tag, Loader2, Calendar, Plus } from "lucide-react";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";
import { VisitSelector, type VisitOption } from "@/components/orders/visit-selector";
import { InlineVisitCreate } from "@/components/orders/inline-visit-create";

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

interface TestCategoryApi {
  id: string;
  name: string;
}

function formatRupiah(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
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
                  active ? "bg-[#6B8E6B] text-white shadow-sm shadow-[#6B8E6B]/30"
                    : done ? "bg-[#6B8E6B]/10 text-[#6B8E6B] dark:bg-[#6B8E6B]/20 dark:text-[#6B8E6B]"
                    : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span className={cn("hidden text-xs font-medium sm:block", active ? "text-[#6B8E6B]" : "text-slate-500 dark:text-slate-400")}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn("h-px flex-1 mx-2 transition-all", done ? "bg-[#6B8E6B]/40 dark:bg-[#6B8E6B]/40" : "bg-slate-200 dark:bg-slate-700")} />
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
        onInlineCreate={() => setShowInlineCreate(true)}
      />

      {/* Inline create option */}
      {!selectedVisit && (
        <button
          type="button"
          onClick={() => setShowInlineCreate(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#6B8E6B]/50 px-4 py-3 text-sm font-medium text-[#6B8E6B] transition-colors hover:bg-[#6B8E6B]/5"
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {selectedVisit.patient.name.charAt(0)}
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">{selectedVisit.patient.name}</div>
              <div className="font-mono text-xs text-[#6B8E6B]">{selectedVisit.patient.mrn}</div>
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
        onClose={() => setShowInlineCreate(false)}
        onCreated={handleInlineCreated}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   STEP 2: TEST SELECTION (loads from API)
──────────────────────────────────────────────────────────────── */
function TestStep({
  selectedTests,
  onToggle,
  allTests,
  categories,
  loadingTests,
}: {
  selectedTests: TestApi[];
  onToggle: (t: TestApi) => void;
  allTests: TestApi[];
  categories: TestCategoryApi[];
  loadingTests: boolean;
}) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Default to first category once loaded
  useEffect(() => {
    if (categories.length > 0 && !activeCategoryId) {
      setActiveCategoryId(categories[0].id);
    }
  }, [categories, activeCategoryId]);

  const byCategory = useMemo(() => {
    if (search) {
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
  }, [activeCategoryId, search, allTests, categories]);

  const isSelected = (id: string) => selectedTests.some((t) => t.id === id);

  if (loadingTests) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#6B8E6B]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Pilih Pemeriksaan</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Pilih satu atau lebih pemeriksaan yang diperlukan.</p>
      </div>

      {/* Search tests */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          id="new-order-test-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama atau kode pemeriksaan..."
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-[#6B8E6B] focus:ring-2 focus:ring-[#6B8E6B]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
      </div>

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
                  ? "bg-[#6B8E6B] text-white shadow-sm"
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
                        ? "border-[#6B8E6B]/50 bg-[#6B8E6B]/10 ring-1 ring-[#6B8E6B]/30 dark:border-[#6B8E6B] dark:bg-[#6B8E6B]/10"
                        : "border-slate-200 bg-white hover:border-[#6B8E6B]/30 hover:bg-[#6B8E6B]/10/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-[#6B8E6B]/50 dark:hover:bg-[#6B8E6B]/10"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold",
                          selected ? "bg-[#6B8E6B]/10 text-[#6B8E6B] dark:bg-[#6B8E6B]/20 dark:text-[#6B8E6B]" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        )}>
                          {test.code}
                        </span>
                        <span className="truncate text-sm font-medium text-slate-900 dark:text-white">{test.name}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <span>{formatRupiah(test.price)}</span>
                        <span>·</span>
                        <span>{test.unit}</span>
                      </div>
                    </div>
                    <div className={cn(
                      "ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                      selected ? "border-[#6B8E6B] bg-[#6B8E6B]/100" : "border-slate-300 dark:border-slate-600"
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
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   STEP 3: CONFIRMATION
──────────────────────────────────────────────────────────────── */
function ConfirmStep({
  visit,
  selectedTests,
  notes,
  onNotesChange,
}: {
  visit: VisitOption;
  selectedTests: TestApi[];
  notes: string;
  onNotesChange: (v: string) => void;
}) {
  const subtotal = selectedTests.reduce((s, t) => s + t.price, 0);

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
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6B8E6B]/10 text-[#6B8E6B]">
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
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            {visit.patient.name.charAt(0)}
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">{visit.patient.name}</div>
            <div className="font-mono text-xs text-[#6B8E6B]">{visit.patient.mrn}</div>
          </div>
        </div>
      </div>

      {/* Test list */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:border-slate-700 dark:bg-slate-950">
        <div className="border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
          <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">Pemeriksaan ({selectedTests.length} item)</p>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {selectedTests.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">{t.code}</span>
                <span className="text-sm text-slate-800 dark:text-slate-200">{t.name}</span>
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{formatRupiah(t.price)}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Total</span>
          <span className="text-lg font-bold text-[#6B8E6B]">{formatRupiah(subtotal)}</span>
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
          placeholder="Mis: Pasien puasa 10 jam, suspek DM tipe 2..."
          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-[#6B8E6B] focus:ring-2 focus:ring-[#6B8E6B]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   MAIN PAGE
──────────────────────────────────────────────────────────────── */
export default function NewOrderPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [selectedVisit, setSelectedVisit] = useState<VisitOption | null>(null);
  const [selectedTests, setSelectedTests] = useState<TestApi[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tests and categories loaded on mount
  const [allTests, setAllTests] = useState<TestApi[]>([]);
  const [categories, setCategories] = useState<TestCategoryApi[]>([]);
  const [loadingTests, setLoadingTests] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoadingTests(true);
      try {
        const [testsRes, catsRes] = await Promise.all([
          apiClient.getTests({ limit: 100 }),
          apiClient.getTestCategories({ limit: 50 }),
        ]);
        const testsData = (testsRes as { data: { data: TestApi[] } }).data;
        const catsData = (catsRes as { data: { data: TestCategoryApi[] } }).data;
        setAllTests(testsData.data || []);
        setCategories(catsData.data || []);
      } catch {
        // Silently fail, tests will be empty
      } finally {
        setLoadingTests(false);
      }
    };
    loadData();
  }, []);

  const subtotal = selectedTests.reduce((s, t) => s + t.price, 0);

  const toggleTest = (t: TestApi) => {
    setSelectedTests((prev) =>
      prev.some((x) => x.id === t.id) ? prev.filter((x) => x.id !== t.id) : [...prev, t]
    );
  };

  const handleVisitSelect = (visit: VisitOption) => {
    setSelectedVisit(visit);
    setErrorMessage(null);
  };

  const handleVisitClear = () => {
    setSelectedVisit(null);
    setSelectedTests([]);
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
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#6B8E6B]/10 dark:bg-[#6B8E6B]/20">
          <CheckCircle2 className="h-10 w-10 text-[#6B8E6B]" />
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
          />
        )}
        {step === 3 && selectedVisit && (
          <ConfirmStep
            visit={selectedVisit}
            selectedTests={selectedTests}
            notes={notes}
            onNotesChange={setNotes}
          />
        )}
      </div>

      {/* Selected tests floating summary (step 2) */}
      {step === 2 && selectedTests.length > 0 && (
        <div className="rounded-2xl border border-[#6B8E6B]/30 bg-[#6B8E6B]/10 p-4 dark:border-[#6B8E6B]/50 dark:bg-[#6B8E6B]/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#6B8E6B] dark:text-[#6B8E6B]">
                {selectedTests.length} pemeriksaan dipilih
              </p>
              <p className="text-xs text-[#6B8E6B]">
                Total: <span className="font-bold">{formatRupiah(subtotal)}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 max-w-xs justify-end">
              {selectedTests.slice(0, 4).map((t) => (
                <span key={t.id} className="flex items-center gap-1 rounded-full bg-[#6B8E6B]/10 pl-2 pr-1 py-0.5 text-[11px] font-semibold text-[#6B8E6B] dark:bg-[#6B8E6B]/20 dark:text-[#6B8E6B]">
                  {t.code}
                  <button onClick={() => toggleTest(t)} className="rounded-full hover:bg-[#6B8E6B]/20 dark:hover:bg-[#6B8E6B]/20 p-0.5">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
              {selectedTests.length > 4 && (
                <span className="rounded-full bg-[#6B8E6B]/20 px-2 py-0.5 text-[11px] font-semibold text-[#6B8E6B] dark:bg-[#6B8E6B]/20 dark:text-[#6B8E6B]">
                  +{selectedTests.length - 4}
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
            className="flex items-center gap-2 rounded-xl bg-[#6B8E6B] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#5A7D5A]"
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
            disabled={selectedTests.length === 0}
            className="flex items-center gap-2 rounded-xl bg-[#6B8E6B] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#5A7D5A] disabled:cursor-not-allowed disabled:opacity-40"
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
            disabled={isSubmitting || !selectedVisit}
            className="flex items-center gap-2 rounded-xl bg-[#6B8E6B] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#5A7D5A] disabled:cursor-not-allowed disabled:opacity-60"
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
