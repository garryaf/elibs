"use client";

import { useState } from "react";
import { 
  useOrderClaims, 
  useOrderInsurances, 
  useSubmitClaim, 
  useReviewClaim, 
  useApproveClaim, 
  usePartiallyApproveClaim, 
  useRejectClaim, 
  useMarkClaimPaid 
} from "@/services/orders";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { Loader2, ShieldPlus, AlertCircle } from "lucide-react";
import { formatRupiah } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

type ClaimStatus = "PENDING" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "PARTIALLY_APPROVED" | "REJECTED" | "PAID";

interface ClaimItem {
  id: string;
  status: ClaimStatus;
  claimReference?: string | null;
  coveredAmount?: number | null;
  copayAmount?: number | null;
  insuranceProvider?: { name: string } | null;
}

interface OrderInsuranceItem {
  id: string;
  policyNumber?: string | null;
  insurance?: { name: string } | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ClaimsForm({ orderId, orderTotal }: { orderId: string; orderTotal: number }) {
  const { data: claimsDataRaw, isLoading: loadingClaims } = useOrderClaims(orderId);
  const { data: insurancesDataRaw, isLoading: loadingInsurances } = useOrderInsurances(orderId);

  // Safely extract data arrays from API response envelopes
  const claimsEnvelope = claimsDataRaw as { data?: ClaimItem[] } | ClaimItem[] | undefined;
  const claims: ClaimItem[] = Array.isArray(claimsEnvelope)
    ? claimsEnvelope
    : Array.isArray((claimsEnvelope as { data?: ClaimItem[] })?.data)
      ? (claimsEnvelope as { data: ClaimItem[] }).data
      : [];

  const insurancesEnvelope = insurancesDataRaw as { data?: OrderInsuranceItem[] } | OrderInsuranceItem[] | undefined;
  const insurances: OrderInsuranceItem[] = Array.isArray(insurancesEnvelope)
    ? insurancesEnvelope
    : Array.isArray((insurancesEnvelope as { data?: OrderInsuranceItem[] })?.data)
      ? (insurancesEnvelope as { data: OrderInsuranceItem[] }).data
      : [];

  const submitMutation = useSubmitClaim();
  const reviewMutation = useReviewClaim();
  const approveMutation = useApproveClaim();
  const partiallyApproveMutation = usePartiallyApproveClaim();
  const rejectMutation = useRejectClaim();
  const paidMutation = useMarkClaimPaid();

  const [selectedInsurance, setSelectedInsurance] = useState("");
  const [claimReference, setClaimReference] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  
  // For approval modal
  const [activeClaimId, setActiveClaimId] = useState<string | null>(null);
  const [approvalType, setApprovalType] = useState<"APPROVE" | "PARTIAL" | "REJECT" | null>(null);
  const [coveredAmount, setCoveredAmount] = useState<string>(orderTotal.toString());
  const [copayAmount, setCopayAmount] = useState<string>("0");
  const [notes, setNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  // Focus trap for approval modal
  const closeModal = () => { setActiveClaimId(null); setApprovalType(null); };
  const modalRef = useFocusTrap(!!activeClaimId, closeModal);

  const handleSubmitClaim = async () => {
    if (!selectedInsurance) return;
    setFormError(null);
    try {
      await submitMutation.mutateAsync({
        orderId,
        data: {
          orderInsuranceId: selectedInsurance,
          claimReference: claimReference || undefined,
        }
      });
      setSelectedInsurance("");
      setClaimReference("");
    } catch {
      setFormError("Gagal mengajukan klaim");
    }
  };

  const handleReview = async (claimId: string) => {
    setFormError(null);
    try {
      await reviewMutation.mutateAsync({ claimId, orderId });
    } catch {
      setFormError("Gagal memproses klaim ke status review");
    }
  };

  const handleMarkPaid = async (claimId: string) => {
    setFormError(null);
    try {
      await paidMutation.mutateAsync({ claimId, orderId });
    } catch {
      setFormError("Gagal menandai klaim sebagai lunas");
    }
  };

  const handleProcessDecision = async () => {
    if (!activeClaimId || !approvalType) return;
    setFormError(null);
    try {
      if (approvalType === "APPROVE") {
        await approveMutation.mutateAsync({
          claimId: activeClaimId,
          orderId,
          data: {
            coveredAmount: parseInt(coveredAmount, 10),
            copayAmount: parseInt(copayAmount, 10) || 0,
            notes,
          }
        });
      } else if (approvalType === "PARTIAL") {
        await partiallyApproveMutation.mutateAsync({
          claimId: activeClaimId,
          orderId,
          data: {
            coveredAmount: parseInt(coveredAmount, 10),
            copayAmount: parseInt(copayAmount, 10) || 0,
            notes,
          }
        });
      } else if (approvalType === "REJECT") {
        await rejectMutation.mutateAsync({
          claimId: activeClaimId,
          orderId,
          data: { rejectionReason }
        });
      }
      setActiveClaimId(null);
      setApprovalType(null);
    } catch {
      setFormError("Gagal memproses keputusan klaim");
    }
  };

  if (loadingClaims || loadingInsurances) {
    return (
      <div className="space-y-3 p-4">
        <div className="h-4 w-36 animate-pulse rounded bg-muted" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3 rounded-xl border border-border p-3">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  const getStatusBadge = (status: ClaimStatus | string) => {
    switch (status) {
      case "PENDING":
      case "SUBMITTED":
        return <span className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">SUBMITTED</span>;
      case "UNDER_REVIEW":
        return <span className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">UNDER REVIEW</span>;
      case "APPROVED":
        return <span className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">APPROVED</span>;
      case "PARTIALLY_APPROVED":
        return <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">PARTIAL</span>;
      case "REJECTED":
        return <span className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">REJECTED</span>;
      case "PAID":
        return <span className="rounded bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">PAID</span>;
      default:
        return <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 mt-4 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-5 py-3 dark:border-slate-800 dark:bg-slate-900/50">
        <ShieldPlus className="h-4 w-4 text-brand" />
        <span className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
          Klaim Asuransi
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Error Banner */}
        {formError && (
          <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="flex-1">{formError}</span>
            <button onClick={() => setFormError(null)} className="text-xs font-semibold opacity-70 hover:opacity-100" aria-label="Tutup pesan error">Tutup</button>
          </div>
        )}

        {/* List of Claims */}
        {claims.length > 0 ? (
          <div className="space-y-3" role="list" aria-label="Daftar klaim asuransi">
            {claims.map((claim) => (
              <div key={claim.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800" role="listitem">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold text-sm text-slate-900 dark:text-white">{claim.insuranceProvider?.name || "Asuransi"}</div>
                    <div className="text-xs text-slate-500">Ref: {claim.claimReference || "-"}</div>
                  </div>
                  <div>{getStatusBadge(claim.status)}</div>
                </div>
                
                {claim.coveredAmount != null && (
                  <div className="mt-2 text-sm grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded dark:bg-slate-900">
                    <div>
                      <span className="block text-xs text-slate-500">Dicover</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">{formatRupiah(Number(claim.coveredAmount))}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-500">Co-Pay</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">{formatRupiah(Number(claim.copayAmount || 0))}</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-3 flex gap-2 flex-wrap">
                  {(claim.status === "PENDING" || claim.status === "SUBMITTED") && (
                    <button
                      id={`claim-review-${claim.id}`}
                      onClick={() => handleReview(claim.id)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 font-semibold dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700"
                    >
                      Proses (Review)
                    </button>
                  )}
                  {claim.status === "UNDER_REVIEW" && (
                    <>
                      <button
                        id={`claim-approve-${claim.id}`}
                        onClick={() => { setActiveClaimId(claim.id); setApprovalType("APPROVE"); }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 font-semibold dark:bg-green-900/20 dark:text-green-300 dark:border-green-700"
                      >
                        Approve Full
                      </button>
                      <button
                        id={`claim-partial-${claim.id}`}
                        onClick={() => { setActiveClaimId(claim.id); setApprovalType("PARTIAL"); }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-semibold dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700"
                      >
                        Approve Sebagian
                      </button>
                      <button
                        id={`claim-reject-${claim.id}`}
                        onClick={() => { setActiveClaimId(claim.id); setApprovalType("REJECT"); }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-semibold dark:bg-red-900/20 dark:text-red-300 dark:border-red-700"
                      >
                        Tolak (Reject)
                      </button>
                    </>
                  )}
                  {(claim.status === "APPROVED" || claim.status === "PARTIALLY_APPROVED") && (
                    <button
                      id={`claim-paid-${claim.id}`}
                      onClick={() => handleMarkPaid(claim.id)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-semibold dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-700"
                    >
                      Tandai Lunas
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-500 italic dark:text-slate-400">Belum ada klaim diajukan.</div>
        )}

        {/* Submit new claim */}
        {insurances.length > 0 && !claims.some((c) => c.status !== "REJECTED") && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold mb-2 text-slate-700 dark:text-slate-300">Ajukan Klaim Baru</p>
            <div className="flex gap-2 items-center flex-wrap">
              <select
                id="claim-insurance-select"
                aria-label="Pilih asuransi untuk klaim"
                value={selectedInsurance}
                onChange={(e) => setSelectedInsurance(e.target.value)}
                className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm focus:border-brand focus:outline-none flex-1 min-w-[180px] dark:border-slate-700 dark:text-slate-200"
              >
                <option value="">Pilih Asuransi...</option>
                {insurances.map((ins) => (
                  <option key={ins.id} value={ins.id}>
                    {ins.insurance?.name || "Asuransi"} ({ins.policyNumber || "-"})
                  </option>
                ))}
              </select>
              <input
                id="claim-reference-input"
                type="text"
                aria-label="Nomor referensi klaim"
                placeholder="No Referensi"
                value={claimReference}
                onChange={(e) => setClaimReference(e.target.value)}
                className="w-1/3 min-w-[120px] rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-slate-700 dark:text-slate-200"
              />
              <button
                id="claim-submit-btn"
                onClick={handleSubmitClaim}
                disabled={!selectedInsurance || submitMutation.isPending}
                className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ajukan"}
              </button>
            </div>
          </div>
        )}

        {/* Modal for Approval/Rejection */}
        {activeClaimId && approvalType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="claim-decision-title"
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 dark:border dark:border-slate-700"
            >
              <h3 id="claim-decision-title" className="text-lg font-bold mb-4 text-slate-900 dark:text-white">
                {approvalType === "APPROVE" ? "Approve Klaim Full" : approvalType === "PARTIAL" ? "Approve Sebagian" : "Tolak Klaim"}
              </h3>
              
              <div className="space-y-3">
                {approvalType !== "REJECT" ? (
                  <>
                    <div>
                      <label htmlFor="claim-covered-amount" className="text-xs font-medium text-slate-500 dark:text-slate-400">Nilai Dicover (Rp)</label>
                      <input
                        id="claim-covered-amount"
                        type="number"
                        value={coveredAmount}
                        onChange={(e) => setCoveredAmount(e.target.value)}
                        className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="claim-copay-amount" className="text-xs font-medium text-slate-500 dark:text-slate-400">Co-Pay Pasien (Rp)</label>
                      <input
                        id="claim-copay-amount"
                        type="number"
                        value={copayAmount}
                        onChange={(e) => setCopayAmount(e.target.value)}
                        className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="claim-approval-notes" className="text-xs font-medium text-slate-500 dark:text-slate-400">Catatan Tambahan</label>
                      <input
                        id="claim-approval-notes"
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Opsional"
                        className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label htmlFor="claim-rejection-reason" className="text-xs font-medium text-slate-500 dark:text-slate-400">Alasan Penolakan</label>
                    <textarea
                      id="claim-rejection-reason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Jelaskan alasan penolakan klaim..."
                      className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      rows={3}
                    />
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-3 justify-end">
                <button
                  id="claim-decision-cancel"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-semibold rounded-xl hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  id="claim-decision-confirm"
                  onClick={handleProcessDecision}
                  className="px-4 py-2 text-sm font-semibold rounded-xl bg-brand text-white hover:bg-brand-dark"
                >
                  Konfirmasi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
