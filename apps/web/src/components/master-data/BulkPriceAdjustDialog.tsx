"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";

interface BulkAdjustPreview {
  testId: string;
  testCode: string;
  testName: string;
  currentPrice: number;
  newPrice: number;
  difference: number;
  percentChange: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkPriceAdjustDialog({ isOpen, onClose, onSuccess }: Props) {
  const [adjustmentType, setAdjustmentType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [adjustmentValue, setAdjustmentValue] = useState<number>(10);
  const [reason, setReason] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [preview, setPreview] = useState<BulkAdjustPreview[] | null>(null);
  const [applied, setApplied] = useState(false);
  const [approvalId, setApprovalId] = useState<string | null>(null);

  // Fetch categories for filter
  const { data: categoriesData } = useQuery({
    queryKey: ["master", "test-categories"],
    queryFn: () => apiClient.get("/api/v1/master/test-categories"),
    enabled: isOpen,
  });

  const categories = (() => {
    const raw = categoriesData as unknown as Record<string, unknown>;
    const inner = (raw?.data ?? raw) as Record<string, unknown>;
    return (Array.isArray(inner) ? inner : (inner?.data as unknown[])) ?? [];
  })() as Array<{ id: string; name: string }>;

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: (data: unknown) => apiClient.post("/api/v1/master/pricing/bulk-adjust/preview", data),
    onSuccess: (result) => {
      const raw = result as unknown as Record<string, unknown>;
      const items = (raw?.data ?? raw) as BulkAdjustPreview[];
      setPreview(Array.isArray(items) ? items : []);
    },
  });

  // Execute mutation
  const executeMutation = useMutation({
    mutationFn: (data: unknown) => apiClient.post("/api/v1/master/pricing/bulk-adjust", data),
    onSuccess: (result) => {
      const raw = result as unknown as Record<string, unknown>;
      const data = (raw?.data ?? raw) as Record<string, unknown>;
      if (data?.approvalRequired) {
        setApprovalId(data.approvalId as string);
      }
      setApplied(true);
      onSuccess();
    },
  });

  const handlePreview = () => {
    const payload: Record<string, unknown> = {
      adjustmentType,
      adjustmentValue,
      reason,
    };
    if (categoryId) payload.categoryId = categoryId;
    previewMutation.mutate(payload);
  };

  const handleExecute = () => {
    const payload: Record<string, unknown> = {
      adjustmentType,
      adjustmentValue,
      reason,
      requiresApproval,
    };
    if (categoryId) payload.categoryId = categoryId;
    executeMutation.mutate(payload);
  };

  const handleClose = () => {
    setPreview(null);
    setApplied(false);
    setApprovalId(null);
    setReason("");
    onClose();
  };

  if (!isOpen) return null;

  const totalIncrease = preview?.reduce((sum, p) => sum + p.difference, 0) ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Penyesuaian Harga Massal</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Naikkan atau turunkan harga semua pemeriksaan sekaligus
        </p>

        {applied ? (
          <div className="mt-6 flex flex-col items-center gap-3 py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {approvalId ? "Proposal Terkirim" : "Berhasil Diterapkan"}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-sm">
              {approvalId
                ? "Perubahan harga memerlukan persetujuan Manager/Owner sebelum diterapkan."
                : `${preview?.length ?? 0} pemeriksaan berhasil diperbarui harganya.`}
            </p>
            <button onClick={handleClose} className="mt-4 rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
              Tutup
            </button>
          </div>
        ) : (
          <>
            {/* Configuration */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Jenis Penyesuaian</label>
                <div className="mt-1.5 flex gap-2">
                  <button
                    onClick={() => setAdjustmentType("PERCENTAGE")}
                    className={cn("flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition", adjustmentType === "PERCENTAGE" ? "border-brand bg-brand/10 text-brand" : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300")}
                  >
                    Persentase (%)
                  </button>
                  <button
                    onClick={() => setAdjustmentType("FIXED")}
                    className={cn("flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition", adjustmentType === "FIXED" ? "border-brand bg-brand/10 text-brand" : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300")}
                  >
                    Nominal (Rp)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Nilai {adjustmentType === "PERCENTAGE" ? "(misal: 10 = +10%, -5 = -5%)" : "(misal: 5000 = +5rb, -2000 = -2rb)"}
                </label>
                <input
                  type="number"
                  value={adjustmentValue}
                  onChange={(e) => setAdjustmentValue(Number(e.target.value))}
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Filter Kategori (Opsional)</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Semua Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Alasan Perubahan</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Misal: Penyesuaian tarif tahunan 2026"
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-brand focus:ring-1 focus:ring-brand/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* Approval checkbox */}
            <label className="mt-4 flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={requiresApproval}
                onChange={(e) => setRequiresApproval(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/50"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Memerlukan persetujuan Manager/Owner sebelum diterapkan
              </span>
            </label>

            {/* Preview button */}
            <div className="mt-5 flex gap-3">
              <button
                onClick={handlePreview}
                disabled={!reason.trim() || previewMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl border border-brand bg-brand/5 px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand/10 disabled:opacity-50"
              >
                {previewMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Preview Perubahan
              </button>
            </div>

            {/* Preview results */}
            {preview && preview.length > 0 && (
              <div className="mt-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Preview: {preview.length} pemeriksaan terpengaruh
                  </h4>
                  <span className={cn("text-sm font-bold", totalIncrease >= 0 ? "text-green-600" : "text-red-600")}>
                    {totalIncrease >= 0 ? <TrendingUp className="inline h-4 w-4 mr-1" /> : <TrendingDown className="inline h-4 w-4 mr-1" />}
                    Total: {totalIncrease >= 0 ? "+" : ""}Rp {totalIncrease.toLocaleString("id-ID")}
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Kode</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Nama</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Harga Lama</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Harga Baru</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((item) => (
                        <tr key={item.testId} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="px-3 py-2 font-mono text-xs text-brand">{item.testCode}</td>
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{item.testName}</td>
                          <td className="px-3 py-2 text-right text-slate-500">Rp {item.currentPrice.toLocaleString("id-ID")}</td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-white">Rp {item.newPrice.toLocaleString("id-ID")}</td>
                          <td className={cn("px-3 py-2 text-right text-xs font-bold", item.difference >= 0 ? "text-green-600" : "text-red-600")}>
                            {item.difference >= 0 ? "+" : ""}{item.percentChange}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Warning */}
                {!requiresApproval && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Perubahan akan <strong>langsung diterapkan</strong> tanpa persetujuan. Pastikan nilai sudah benar.
                    </p>
                  </div>
                )}

                {/* Execute button */}
                <div className="mt-4 flex gap-3">
                  <button onClick={handleClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">
                    Batal
                  </button>
                  <button
                    onClick={handleExecute}
                    disabled={executeMutation.isPending}
                    className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-50"
                  >
                    {executeMutation.isPending ? "Memproses..." : requiresApproval ? "Kirim untuk Persetujuan" : `Terapkan ke ${preview.length} Pemeriksaan`}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
