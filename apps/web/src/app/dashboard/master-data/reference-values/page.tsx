"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Plus, X, FlaskConical } from "lucide-react";
import { apiClient } from "@/lib/api";

interface TestItem {
  id: string;
  name: string;
  code: string;
}

interface ReferenceValue {
  id: string;
  gender: "MALE" | "FEMALE";
  minAge: number | null;
  maxAge: number | null;
  minValue: number | null;
  maxValue: number | null;
  criticalMin: number | null;
  criticalMax: number | null;
}

export default function ReferenceValuesPage() {
  const [tests, setTests] = useState<TestItem[]>([]);
  const [selectedTest, setSelectedTest] = useState<TestItem | null>(null);
  const [referenceValues, setReferenceValues] = useState<ReferenceValue[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTests, setLoadingTests] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    gender: "MALE" as "MALE" | "FEMALE",
    minAge: "",
    maxAge: "",
    minValue: "",
    maxValue: "",
    criticalMin: "",
    criticalMax: "",
  });

  // Load tests list
  useEffect(() => {
    const loadTests = async () => {
      setLoadingTests(true);
      try {
        const res = await apiClient.getTests({ limit: 200 });
        const envelope = (res?.data ?? res) as any;
        const raw = Array.isArray(envelope) ? envelope : envelope?.data ?? [];
        setTests(raw as TestItem[]);
      } catch {
        setTests([]);
      } finally {
        setLoadingTests(false);
      }
    };
    loadTests();
  }, []);

  // Load reference values when test selected
  const loadReferenceValues = useCallback(async (testId: string) => {
    setLoading(true);
    try {
      const res = await apiClient.get<any>(`/api/v1/master/tests/${testId}`);
      const testData = res?.data ?? res;
      setReferenceValues(testData?.referenceValues ?? []);
    } catch {
      setReferenceValues([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTest) {
      loadReferenceValues(selectedTest.id);
    }
  }, [selectedTest, loadReferenceValues]);

  const filteredTests = tests.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectTest = (test: TestItem) => {
    setSelectedTest(test);
    setSearchQuery("");
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    // API belum tersedia — tampilkan alert
    alert("API untuk menambah nilai rujukan belum tersedia. Data tidak disimpan.");
    setShowForm(false);
    setFormData({
      gender: "MALE",
      minAge: "",
      maxAge: "",
      minValue: "",
      maxValue: "",
      criticalMin: "",
      criticalMax: "",
    });
  };

  const genderLabel = (gender: string) => {
    return gender === "MALE" ? "Laki-laki" : "Perempuan";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Nilai Rujukan Pemeriksaan
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Kelola nilai referensi normal untuk setiap pemeriksaan berdasarkan jenis kelamin dan usia.
        </p>
      </div>

      {/* Test Selection */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Pilih Pemeriksaan
        </label>
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama atau kode pemeriksaan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          {searchQuery && filteredTests.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900 max-h-48 overflow-y-auto">
              {filteredTests.map((test) => (
                <button
                  key={test.id}
                  onClick={() => handleSelectTest(test)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <FlaskConical className="h-4 w-4 text-brand" />
                  <span className="text-slate-900 dark:text-white">{test.name}</span>
                  <span className="ml-auto text-xs text-slate-400">{test.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedTest && (
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-sm font-medium text-brand">
              <FlaskConical className="h-3.5 w-3.5" />
              {selectedTest.name} ({selectedTest.code})
            </span>
            <button
              onClick={() => {
                setSelectedTest(null);
                setReferenceValues([]);
              }}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {loadingTests && (
          <p className="mt-2 text-xs text-slate-400">Memuat daftar pemeriksaan...</p>
        )}
      </div>

      {/* Reference Values Table */}
      {selectedTest && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              Nilai Rujukan
            </h2>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand/20 transition-all hover:bg-brand-dark hover:shadow-md active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              Tambah Nilai Rujukan
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Gender</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Min Age</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Max Age</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Min Ref</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Max Ref</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Critical Min</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Critical Max</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Memuat...
                    </td>
                  </tr>
                ) : referenceValues.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Belum ada nilai rujukan untuk pemeriksaan ini
                    </td>
                  </tr>
                ) : (
                  referenceValues.map((rv) => (
                    <tr key={rv.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-medium ${
                          rv.gender === "MALE"
                            ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                            : "bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400"
                        }`}>
                          {genderLabel(rv.gender)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {rv.minAge ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {rv.maxAge ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {rv.minValue ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {rv.maxValue ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {rv.criticalMin != null ? (
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            {rv.criticalMin}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {rv.criticalMax != null ? (
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            {rv.criticalMax}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Note about API */}
          <p className="text-xs text-amber-600 dark:text-amber-400">
            ⚠️ API untuk membuat/mengubah nilai rujukan belum tersedia. Saat ini hanya menampilkan data yang sudah ada.
          </p>
        </div>
      )}

      {/* Add Reference Value Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Tambah Nilai Rujukan
            </h2>
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">
              ⚠️ API belum tersedia — form ini bersifat demonstrasi.
            </p>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Gender *
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, gender: e.target.value as "MALE" | "FEMALE" }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="MALE">Laki-laki</option>
                  <option value="FEMALE">Perempuan</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Min Age
                  </label>
                  <input
                    type="number"
                    value={formData.minAge}
                    onChange={(e) => setFormData((p) => ({ ...p, minAge: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Max Age
                  </label>
                  <input
                    type="number"
                    value={formData.maxAge}
                    onChange={(e) => setFormData((p) => ({ ...p, maxAge: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    placeholder="120"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Min Ref Value
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.minValue}
                    onChange={(e) => setFormData((p) => ({ ...p, minValue: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Max Ref Value
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.maxValue}
                    onChange={(e) => setFormData((p) => ({ ...p, maxValue: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Critical Min
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.criticalMin}
                    onChange={(e) => setFormData((p) => ({ ...p, criticalMin: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Critical Max
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.criticalMax}
                    onChange={(e) => setFormData((p) => ({ ...p, criticalMax: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
