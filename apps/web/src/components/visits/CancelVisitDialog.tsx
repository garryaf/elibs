"use client";

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { apiClient } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Visit {
  id: string;
  visitNumber: string;
  status: string;
  patient?: { id: string; name: string; mrn: string };
}

interface CancelVisitDialogProps {
  visit: Visit;
  isOpen: boolean;
  onClose: () => void;
  onCancelSuccess: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_REASON_LENGTH = 10;

// ─── Component ────────────────────────────────────────────────────────────────

export function CancelVisitDialog({
  visit,
  isOpen,
  onClose,
  onCancelSuccess,
}: CancelVisitDialogProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReasonValid = reason.trim().length >= MIN_REASON_LENGTH;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isReasonValid) return;

    setSubmitting(true);
    setError(null);

    try {
      await apiClient.cancelVisit(visit.id, reason.trim());
      setReason("");
      onClose();
      onCancelSuccess();
    } catch (err: unknown) {
      const apiErr = err as { message?: string; errors?: Array<{ message: string }> };
      const message =
        apiErr?.errors?.[0]?.message ||
        apiErr?.message ||
        "Gagal membatalkan kunjungan. Silakan coba lagi.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-visit-dialog-title"
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <h3
              id="cancel-visit-dialog-title"
              className="text-lg font-semibold text-slate-900 dark:text-white"
            >
              Batalkan Kunjungan
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            aria-label="Tutup dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Confirmation Context */}
        <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Anda akan membatalkan kunjungan:
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
            {visit.visitNumber}
          </p>
          {visit.patient && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Pasien: <span className="font-medium text-slate-800 dark:text-slate-200">{visit.patient.name}</span>
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Reason Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="cancel-reason"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Alasan Pembatalan <span className="text-red-500">*</span>
            </label>
            <textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Masukkan alasan pembatalan (minimal 10 karakter)..."
              rows={3}
              disabled={submitting}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#6B8E6B] focus:ring-2 focus:ring-[#6B8E6B]/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {reason.trim().length}/{MIN_REASON_LENGTH} karakter minimum
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || !isReasonValid}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Membatalkan...</span>
                </>
              ) : (
                <span>Konfirmasi Pembatalan</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
