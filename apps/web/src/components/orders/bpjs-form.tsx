"use client";

import { useState } from "react";
import { useOrderBpjs, useCreateBpjsDetail, useUpdateBpjsDetail, useVerifyBpjs } from "@/services/orders";
import { Loader2, CheckCircle2, AlertCircle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function BpjsForm({ orderId }: { orderId: string }) {
  const { data: bpjsDataRaw, isLoading } = useOrderBpjs(orderId);
  
  // Extract data from API response if wrapped
  const raw = bpjsDataRaw as any;
  const bpjsData = raw?.data ? raw.data : raw;

  const createMutation = useCreateBpjsDetail();
  const updateMutation = useUpdateBpjsDetail();
  const verifyMutation = useVerifyBpjs();

  const [formData, setFormData] = useState({
    sepNumber: "",
    referringFacilityCode: "",
    referringFacilityName: "",
    classLevel: "1",
    diagnosisCode: "",
    diagnosisName: "",
    procedureCode: "",
    guaranteeLetterNo: "",
    notes: "",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Sync formData with fetched BPJS detail if available and not editing
  if (bpjsData && !isEditing && formData.sepNumber !== bpjsData.sepNumber) {
    setFormData({
      sepNumber: bpjsData.sepNumber || "",
      referringFacilityCode: bpjsData.referringFacilityCode || "",
      referringFacilityName: bpjsData.referringFacilityName || "",
      classLevel: bpjsData.classLevel || "1",
      diagnosisCode: bpjsData.diagnosisCode || "",
      diagnosisName: bpjsData.diagnosisName || "",
      procedureCode: bpjsData.procedureCode || "",
      guaranteeLetterNo: bpjsData.guaranteeLetterNo || "",
      notes: bpjsData.notes || "",
    });
  }

  const handleSave = async () => {
    setFormError(null);
    try {
      if (bpjsData?.id) {
        await updateMutation.mutateAsync({ id: orderId, data: formData });
      } else {
        await createMutation.mutateAsync({ id: orderId, data: formData });
      }
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      setFormError("Gagal menyimpan data BPJS");
    }
  };

  const handleVerify = async () => {
    setFormError(null);
    try {
      await verifyMutation.mutateAsync({ id: orderId, data: { notes: "Verified manually" } });
    } catch (e) {
      console.error(e);
      setFormError("Gagal memverifikasi BPJS");
    }
  };

  if (isLoading) {
    return (
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="h-4 w-4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const isVerified = bpjsData?.verificationStatus === "VERIFIED";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 mt-4 overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-3 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-brand" />
          <span className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
            Detail BPJS
          </span>
        </div>
        {bpjsData && (
          <div className="flex gap-2">
            {!isVerified && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs font-semibold text-brand hover:underline"
              >
                Edit
              </button>
            )}
            {isVerified ? (
              <span className="flex items-center gap-1 text-xs font-bold text-green-600">
                <CheckCircle2 className="h-4 w-4" /> Terverifikasi
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
                <AlertCircle className="h-4 w-4" /> Menunggu Verifikasi
              </span>
            )}
          </div>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Error Banner */}
        {formError && (
          <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="flex-1">{formError}</span>
            <button onClick={() => setFormError(null)} className="text-xs font-semibold opacity-70 hover:opacity-100">Tutup</button>
          </div>
        )}

        {(!bpjsData || isEditing) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">No. SEP</label>
              <input
                type="text"
                value={formData.sepNumber}
                onChange={(e) => setFormData({ ...formData, sepNumber: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-slate-700 dark:text-white"
                placeholder="Misal: 1234567890"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Kelas</label>
              <select
                value={formData.classLevel}
                onChange={(e) => setFormData({ ...formData, classLevel: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-slate-700 dark:text-white"
              >
                <option value="1">Kelas 1</option>
                <option value="2">Kelas 2</option>
                <option value="3">Kelas 3</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Kode Faskes Perujuk</label>
              <input
                type="text"
                value={formData.referringFacilityCode}
                onChange={(e) => setFormData({ ...formData, referringFacilityCode: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-slate-700 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Nama Faskes Perujuk</label>
              <input
                type="text"
                value={formData.referringFacilityName}
                onChange={(e) => setFormData({ ...formData, referringFacilityName: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-slate-700 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Kode Diagnosa (ICD-10)</label>
              <input
                type="text"
                value={formData.diagnosisCode}
                onChange={(e) => setFormData({ ...formData, diagnosisCode: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-slate-700 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Surat Jaminan (SKDP)</label>
              <input
                type="text"
                value={formData.guaranteeLetterNo}
                onChange={(e) => setFormData({ ...formData, guaranteeLetterNo: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-slate-700 dark:text-white"
              />
            </div>
            
            <div className="sm:col-span-2 pt-2 flex justify-end gap-2">
              {isEditing && (
                <button
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50 flex items-center gap-2"
              >
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan BPJS
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-500">No. SEP</p>
                <p className="font-semibold text-slate-900 dark:text-white">{bpjsData.sepNumber || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Kelas</p>
                <p className="font-semibold text-slate-900 dark:text-white">Kelas {bpjsData.classLevel || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Faskes Perujuk</p>
                <p className="font-semibold text-slate-900 dark:text-white">{bpjsData.referringFacilityName || "—"} ({bpjsData.referringFacilityCode || "—"})</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Diagnosa</p>
                <p className="font-semibold text-slate-900 dark:text-white">{bpjsData.diagnosisCode || "—"}</p>
              </div>
            </div>
            
            {!isVerified && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={handleVerify}
                  disabled={verifyMutation.isPending}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  {verifyMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Verifikasi BPJS Sekarang
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
