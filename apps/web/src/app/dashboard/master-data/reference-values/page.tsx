"use client";

import { useState, useCallback } from "react";
import {
  Search,
  Plus,
  X,
  FlaskConical,
  Pencil,
  Trash2,
  AlertCircle,
  Info,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useMasterTests } from "@/services/master-data";
import {
  useReferenceValues,
  useCreateReferenceValue,
  useUpdateReferenceValue,
  useDeleteReferenceValue,
  type ReferenceValue,
  type Gender,
  type CreateReferenceValuePayload,
} from "@/services/reference-values";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TestItem {
  id: string;
  name: string;
  code: string;
  unit?: string;
}

type FormMode = "create" | "edit";

interface FormState {
  gender: Gender;
  minAge: string;
  maxAge: string;
  minRef: string;
  maxRef: string;
  criticalMin: string;
  criticalMax: string;
}

const EMPTY_FORM: FormState = {
  gender: "MALE",
  minAge: "0",
  maxAge: "150",
  minRef: "",
  maxRef: "",
  criticalMin: "",
  criticalMax: "",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function genderLabel(gender: Gender): string {
  switch (gender) {
    case "MALE":
      return "Laki-laki";
    case "FEMALE":
      return "Perempuan";
    default:
      return String(gender);
  }
}

function genderBadgeClasses(gender: Gender): string {
  switch (gender) {
    case "MALE":
      return "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400";
    case "FEMALE":
      return "bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  }
}

// ─── Page Component ──────────────────────────────────────────────────────────

export default function ReferenceValuesPage() {
  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
      <ReferenceValuesContent />
    </RoleGuard>
  );
}

function ReferenceValuesContent() {
  // ─── Test search/selection state ───────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTest, setSelectedTest] = useState<TestItem | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // ─── Form/modal state ──────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);

  // ─── Delete confirmation state ─────────────────────────────────────────────
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ─── Error/success state ───────────────────────────────────────────────────
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ─── TanStack Query hooks ──────────────────────────────────────────────────
  const { data: testsData, isLoading: loadingTests } = useMasterTests({
    limit: 200,
    search: searchQuery || undefined,
  });

  const {
    data: refValuesData,
    isLoading: loadingRefValues,
  } = useReferenceValues(selectedTest?.id ?? "");

  const createMutation = useCreateReferenceValue();
  const updateMutation = useUpdateReferenceValue();
  const deleteMutation = useDeleteReferenceValue();

  // ─── Derived data ──────────────────────────────────────────────────────────
  const tests: TestItem[] = (() => {
    const raw = testsData as any;
    if (Array.isArray(raw)) return raw;
    if (raw?.data && Array.isArray(raw.data)) return raw.data;
    return [];
  })();

  const referenceValues: ReferenceValue[] = (() => {
    const raw = refValuesData as any;
    if (Array.isArray(raw)) return raw;
    if (raw?.data && Array.isArray(raw.data)) return raw.data;
    return [];
  })();

  const filteredTests = searchQuery.length >= 1
    ? tests.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // ─── Focus trap for modals ─────────────────────────────────────────────────
  const formTrapRef = useFocusTrap(showForm, () => handleCloseForm());
  const deleteTrapRef = useFocusTrap(!!deletingId, () => setDeletingId(null));

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectTest = useCallback((test: TestItem) => {
    setSelectedTest(test);
    setSearchQuery("");
    setShowDropdown(false);
    setErrorMessage(null);
    setSuccessMessage(null);
  }, []);

  const handleClearTest = useCallback(() => {
    setSelectedTest(null);
    setSearchQuery("");
    setErrorMessage(null);
    setSuccessMessage(null);
    setShowForm(false);
  }, []);

  const handleOpenCreateForm = useCallback(() => {
    setFormMode("create");
    setEditingId(null);
    setFormData({ ...EMPTY_FORM });
    setShowForm(true);
    setErrorMessage(null);
  }, []);

  const handleDuplicateForFemale = useCallback((rv: ReferenceValue) => {
    setFormMode("create");
    setEditingId(null);
    setFormData({
      gender: "FEMALE",
      minAge: String(rv.minAge ?? 0),
      maxAge: String(rv.maxAge ?? 150),
      minRef: String(rv.minRef ?? ""),
      maxRef: String(rv.maxRef ?? ""),
      criticalMin: rv.criticalMin != null ? String(rv.criticalMin) : "",
      criticalMax: rv.criticalMax != null ? String(rv.criticalMax) : "",
    });
    setShowForm(true);
    setErrorMessage(null);
  }, []);

  const handleOpenEditForm = useCallback((rv: ReferenceValue) => {
    setFormMode("edit");
    setEditingId(rv.id);
    setFormData({
      gender: rv.gender,
      minAge: String(rv.minAge ?? 0),
      maxAge: String(rv.maxAge ?? 150),
      minRef: String(rv.minRef ?? ""),
      maxRef: String(rv.maxRef ?? ""),
      criticalMin: rv.criticalMin != null ? String(rv.criticalMin) : "",
      criticalMax: rv.criticalMax != null ? String(rv.criticalMax) : "",
    });
    setShowForm(true);
    setErrorMessage(null);
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
  }, []);

  const handleSubmitForm = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedTest) return;

      // Validation
      const minRef = Number(formData.minRef);
      const maxRef = Number(formData.maxRef);

      if (isNaN(minRef) || isNaN(maxRef)) {
        setErrorMessage("Batas Normal Bawah dan Atas wajib diisi dengan angka.");
        return;
      }

      if (minRef >= maxRef) {
        setErrorMessage("Batas Normal Bawah harus lebih kecil dari Batas Normal Atas.");
        return;
      }

      const criticalMin = formData.criticalMin.trim() ? Number(formData.criticalMin) : undefined;
      const criticalMax = formData.criticalMax.trim() ? Number(formData.criticalMax) : undefined;

      if (criticalMin !== undefined && criticalMin >= minRef) {
        setErrorMessage("Batas Kritis Bawah harus lebih kecil dari Batas Normal Bawah.");
        return;
      }

      if (criticalMax !== undefined && criticalMax <= maxRef) {
        setErrorMessage("Batas Kritis Atas harus lebih besar dari Batas Normal Atas.");
        return;
      }

      const payload: CreateReferenceValuePayload = {
        gender: formData.gender,
        minAge: formData.minAge.trim() ? Number(formData.minAge) : 0,
        maxAge: formData.maxAge.trim() ? Number(formData.maxAge) : 150,
        minRef,
        maxRef,
        criticalMin: criticalMin ?? null,
        criticalMax: criticalMax ?? null,
      };

      try {
        if (formMode === "create") {
          await createMutation.mutateAsync({
            testId: selectedTest.id,
            data: payload,
          });
          setSuccessMessage("Nilai rujukan berhasil ditambahkan.");
        } else if (editingId) {
          await updateMutation.mutateAsync({
            testId: selectedTest.id,
            id: editingId,
            data: payload,
          });
          setSuccessMessage("Nilai rujukan berhasil diperbarui.");
        }
        handleCloseForm();
        setErrorMessage(null);
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Terjadi kesalahan saat menyimpan data.";
        setErrorMessage(msg);
      }
    },
    [
      selectedTest,
      formData,
      formMode,
      editingId,
      createMutation,
      updateMutation,
      handleCloseForm,
    ]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedTest || !deletingId) return;

    try {
      await deleteMutation.mutateAsync({
        testId: selectedTest.id,
        id: deletingId,
      });
      setDeletingId(null);
      setSuccessMessage("Nilai rujukan berhasil dihapus.");
      setErrorMessage(null);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Terjadi kesalahan saat menghapus data.";
      setErrorMessage(msg);
      setDeletingId(null);
    }
  }, [selectedTest, deletingId, deleteMutation]);

  // ─── Auto-dismiss success message ─────────────────────────────────────────

  if (successMessage) {
    setTimeout(() => setSuccessMessage(null), 4000);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Nilai Rujukan Pemeriksaan
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Atur rentang normal dan kritis per pemeriksaan. Data ini digunakan untuk auto-flagging hasil lab (Normal/Low/High/Critical).
        </p>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <p className="font-medium">Cara Pengisian:</p>
          <ol className="mt-1 list-inside list-decimal space-y-0.5 text-blue-600 dark:text-blue-400">
            <li>Pilih pemeriksaan dari pencarian di bawah</li>
            <li>Klik &quot;+ Tambah&quot; untuk tiap gender (Laki-laki &amp; Perempuan)</li>
            <li>Isi rentang normal (wajib) dan rentang kritis (opsional, untuk alert)</li>
            <li>Gunakan tombol duplikat (📋) untuk menyalin ke gender lain</li>
          </ol>
        </div>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400"
        >
          <FlaskConical className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="ml-auto text-red-400 hover:text-red-600"
            aria-label="Tutup pesan error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Test Selection */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
          1. Pilih Pemeriksaan
        </label>
        {selectedTest ? (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-xl bg-brand/10 px-4 py-2 text-sm font-medium text-brand">
              <FlaskConical className="h-4 w-4" />
              {selectedTest.code} — {selectedTest.name}
              {selectedTest.unit && (
                <span className="ml-1 rounded bg-brand/10 px-1.5 py-0.5 text-xs">
                  {selectedTest.unit}
                </span>
              )}
            </span>
            <button
              onClick={handleClearTest}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              aria-label="Ganti pemeriksaan"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Ketik nama atau kode pemeriksaan (misal: Hemoglobin atau HEM-001)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              aria-label="Cari pemeriksaan"
              aria-expanded={showDropdown && filteredTests.length > 0}
              role="combobox"
              aria-autocomplete="list"
            />
            {showDropdown && searchQuery && filteredTests.length > 0 && (
              <ul
                role="listbox"
                className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900 max-h-56 overflow-y-auto"
              >
                {filteredTests.slice(0, 20).map((test) => (
                  <li key={test.id}>
                    <button
                      onClick={() => handleSelectTest(test)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      role="option"
                    >
                      <FlaskConical className="h-4 w-4 text-brand shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-slate-900 dark:text-white">{test.name}</span>
                        {test.unit && <span className="ml-2 text-xs text-slate-400">({test.unit})</span>}
                      </div>
                      <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-500 dark:bg-slate-800">{test.code}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {showDropdown && searchQuery && filteredTests.length === 0 && !loadingTests && (
              <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-400 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                Tidak ditemukan pemeriksaan dengan kata kunci &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        )}

        {loadingTests && !selectedTest && (
          <div className="mt-2 h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        )}
      </div>

      {/* Reference Values Table */}
      {selectedTest && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              2. Nilai Rujukan untuk <span className="text-brand">{selectedTest.name}</span>
            </h2>
            <button
              onClick={handleOpenCreateForm}
              className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand/20 transition-all hover:bg-brand-dark hover:shadow-md active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              Tambah
            </button>
          </div>

          {/* Quick status */}
          {!loadingRefValues && (
            <div className="flex flex-wrap gap-2">
              {referenceValues.some((r) => r.gender === "MALE") ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                  ✓ Laki-laki
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                  ⚠ Laki-laki belum diisi
                </span>
              )}
              {referenceValues.some((r) => r.gender === "FEMALE") ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-pink-50 px-2.5 py-1 text-xs font-medium text-pink-600 dark:bg-pink-900/20 dark:text-pink-400">
                  ✓ Perempuan
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                  ⚠ Perempuan belum diisi
                </span>
              )}
              {referenceValues.some((r) => r.criticalMin != null || r.criticalMax != null) ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  ✓ Batas kritis aktif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  — Tanpa batas kritis
                </span>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Gender</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Usia</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-400">
                    <span className="text-emerald-600">Rentang Normal</span>
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-400">
                    <span className="text-red-500">Batas Kritis</span>
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loadingRefValues ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8">
                      <div className="flex flex-col gap-2">
                        {[1, 2].map((i) => (
                          <div key={i} className="h-10 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                        ))}
                      </div>
                    </td>
                  </tr>
                ) : referenceValues.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <FlaskConical className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                        <p className="text-slate-500 dark:text-slate-400">Belum ada nilai rujukan untuk pemeriksaan ini.</p>
                        <p className="text-xs text-slate-400">Klik &quot;+ Tambah&quot; untuk menambah rentang normal dan kritis.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  referenceValues.map((rv) => (
                    <tr key={rv.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 even:bg-slate-50/50 dark:even:bg-slate-900/30 even:bg-slate-50/50 dark:even:bg-slate-900/30">
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold", genderBadgeClasses(rv.gender))}>
                          {genderLabel(rv.gender)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {rv.minAge ?? 0} – {rv.maxAge ?? 150} thn
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                          {rv.minRef} – {rv.maxRef}
                        </span>
                        {selectedTest.unit && (
                          <span className="ml-1 text-xs text-slate-400">{selectedTest.unit}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {(rv.criticalMin != null || rv.criticalMax != null) ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1 text-sm font-semibold text-red-600 dark:bg-red-900/20 dark:text-red-400">
                            {rv.criticalMin != null ? `< ${rv.criticalMin}` : "—"}
                            {" / "}
                            {rv.criticalMax != null ? `> ${rv.criticalMax}` : "—"}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Tidak diatur</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* Duplicate to other gender */}
                          {rv.gender === "MALE" && !referenceValues.some((r) => r.gender === "FEMALE") && (
                            <button
                              onClick={() => handleDuplicateForFemale(rv)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-pink-50 hover:text-pink-600 dark:hover:bg-pink-900/20 dark:hover:text-pink-400"
                              title="Duplikat untuk Perempuan"
                              aria-label="Duplikat nilai rujukan untuk perempuan"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditForm(rv)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                            aria-label={`Edit nilai rujukan ${genderLabel(rv.gender)}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingId(rv.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                            aria-label={`Hapus nilai rujukan ${genderLabel(rv.gender)}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Create/Edit Modal ─────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={handleCloseForm}
            aria-hidden="true"
          />
          <div
            ref={formTrapRef}
            className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-title"
          >
            <h2
              id="form-title"
              className="text-lg font-bold text-slate-900 dark:text-white mb-1"
            >
              {formMode === "create" ? "Tambah Nilai Rujukan" : "Edit Nilai Rujukan"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Pemeriksaan: <span className="font-semibold text-brand">{selectedTest?.name}</span>
              {selectedTest?.unit && <span> ({selectedTest.unit})</span>}
            </p>

            <form onSubmit={handleSubmitForm} className="space-y-5">
              {/* Gender — big toggle buttons */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Jenis Kelamin
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, gender: "MALE" }))}
                    className={cn(
                      "rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all",
                      formData.gender === "MALE"
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300"
                        : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400"
                    )}
                  >
                    ♂ Laki-laki
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, gender: "FEMALE" }))}
                    className={cn(
                      "rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all",
                      formData.gender === "FEMALE"
                        ? "border-pink-500 bg-pink-50 text-pink-700 dark:border-pink-400 dark:bg-pink-900/30 dark:text-pink-300"
                        : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400"
                    )}
                  >
                    ♀ Perempuan
                  </button>
                </div>
              </div>

              {/* Age range */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Rentang Usia (tahun)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      min="0"
                      max="150"
                      value={formData.minAge}
                      onChange={(e) => setFormData((p) => ({ ...p, minAge: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      placeholder="0"
                    />
                    <span className="mt-1 block text-xs text-slate-400">Dari (default: 0)</span>
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      max="150"
                      value={formData.maxAge}
                      onChange={(e) => setFormData((p) => ({ ...p, maxAge: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      placeholder="150"
                    />
                    <span className="mt-1 block text-xs text-slate-400">Sampai (default: 150 = semua)</span>
                  </div>
                </div>
              </div>

              {/* Normal range */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-900/10">
                <label className="block text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-2">
                  🟢 Rentang Normal (wajib)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.minRef}
                      onChange={(e) => setFormData((p) => ({ ...p, minRef: e.target.value }))}
                      className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm dark:border-emerald-700 dark:bg-slate-800 dark:text-white"
                      placeholder="Contoh: 13.0"
                    />
                    <span className="mt-1 block text-xs text-emerald-600 dark:text-emerald-500">Batas bawah normal</span>
                  </div>
                  <div>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.maxRef}
                      onChange={(e) => setFormData((p) => ({ ...p, maxRef: e.target.value }))}
                      className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm dark:border-emerald-700 dark:bg-slate-800 dark:text-white"
                      placeholder="Contoh: 17.0"
                    />
                    <span className="mt-1 block text-xs text-emerald-600 dark:text-emerald-500">Batas atas normal</span>
                  </div>
                </div>
              </div>

              {/* Critical range */}
              <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-800 dark:bg-red-900/10">
                <label className="block text-sm font-semibold text-red-600 dark:text-red-400 mb-1">
                  🔴 Batas Kritis (opsional — untuk alert)
                </label>
                <p className="mb-3 text-xs text-red-500 dark:text-red-400/70">
                  Jika hasil melampaui batas ini, sistem akan memicu Critical Value Alert.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      step="any"
                      value={formData.criticalMin}
                      onChange={(e) => setFormData((p) => ({ ...p, criticalMin: e.target.value }))}
                      className="w-full rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm dark:border-red-700 dark:bg-slate-800 dark:text-white"
                      placeholder="Contoh: 7.0"
                    />
                    <span className="mt-1 block text-xs text-red-500">Kritis bawah (hasil &lt; ini = CRITICAL)</span>
                  </div>
                  <div>
                    <input
                      type="number"
                      step="any"
                      value={formData.criticalMax}
                      onChange={(e) => setFormData((p) => ({ ...p, criticalMax: e.target.value }))}
                      className="w-full rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm dark:border-red-700 dark:bg-slate-800 dark:text-white"
                      placeholder="Contoh: 20.0"
                    />
                    <span className="mt-1 block text-xs text-red-500">Kritis atas (hasil &gt; ini = CRITICAL)</span>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Menyimpan..."
                    : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─────────────────────────────────────── */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setDeletingId(null)}
            aria-hidden="true"
          />
          <div
            ref={deleteTrapRef}
            className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            aria-describedby="delete-description"
          >
            <h2 id="delete-title" className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Hapus Nilai Rujukan
            </h2>
            <p id="delete-description" className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Apakah Anda yakin ingin menghapus nilai rujukan ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
