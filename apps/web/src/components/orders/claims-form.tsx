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
import { Loader2, ShieldPlus, AlertCircle, FileText, CheckCircle2, XCircle } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ClaimsForm({ orderId, orderTotal }: { orderId: string, orderTotal: number }) {
  const { data: claimsDataRaw, isLoading: loadingClaims } = useOrderClaims(orderId);
  const { data: insurancesDataRaw, isLoading: loadingInsurances } = useOrderInsurances(orderId);

  const claimsRaw = claimsDataRaw as any;
  const claims = claimsRaw?.data || claimsRaw || [];

  const insurancesRaw = insurancesDataRaw as any;
  const insurances = insurancesRaw?.data || insurancesRaw || [];

  const submitMutation = useSubmitClaim();
  const reviewMutation = useReviewClaim();
  const approveMutation = useApproveClaim();
  const partiallyApproveMutation = usePartiallyApproveClaim();
  const rejectMutation = useRejectClaim();
  const paidMutation = useMarkClaimPaid();

  const [selectedInsurance, setSelectedInsurance] = useState("");
  const [claimReference, setClaimReference] = useState("");
  
  // For approval modal
  const [activeClaimId, setActiveClaimId] = useState<string | null>(null);
  const [approvalType, setApprovalType] = useState<"APPROVE" | "PARTIAL" | "REJECT" | null>(null);
  const [coveredAmount, setCoveredAmount] = useState<string>(orderTotal.toString());
  const [copayAmount, setCopayAmount] = useState<string>("0");
  const [notes, setNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const handleSubmitClaim = async () => {
    if (!selectedInsurance) return;
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
    } catch (e) {
      alert("Failed to submit claim");
    }
  };

  const handleReview = async (claimId: string) => {
    try {
      await reviewMutation.mutateAsync({ claimId, orderId });
    } catch (e) {
      alert("Failed to mark claim as under review");
    }
  };

  const handleMarkPaid = async (claimId: string) => {
    try {
      await paidMutation.mutateAsync({ claimId, orderId });
    } catch (e) {
      alert("Failed to mark claim as paid");
    }
  };

  const handleProcessDecision = async () => {
    if (!activeClaimId || !approvalType) return;
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
    } catch (e) {
      alert(`Failed to process claim decision`);
    }
  };

  if (loadingClaims || loadingInsurances) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
      case "SUBMITTED":
        return <span className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">SUBMITTED</span>;
      case "UNDER_REVIEW":
        return <span className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">UNDER REVIEW</span>;
      case "APPROVED":
        return <span className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">APPROVED</span>;
      case "PARTIALLY_APPROVED":
        return <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">PARTIAL</span>;
      case "REJECTED":
        return <span className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">REJECTED</span>;
      case "PAID":
        return <span className="rounded bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-700">PAID</span>;
      default:
        return <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{status}</span>;
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
        {/* List of Claims */}
        {claims.length > 0 ? (
          <div className="space-y-3">
            {claims.map((claim: any) => (
              <div key={claim.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold text-sm">{claim.insuranceProvider?.name || 'Asuransi'}</div>
                    <div className="text-xs text-slate-500">Ref: {claim.claimReference || '-'}</div>
                  </div>
                  <div>{getStatusBadge(claim.status)}</div>
                </div>
                
                {claim.coveredAmount !== null && (
                  <div className="mt-2 text-sm grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded dark:bg-slate-900">
                    <div>
                      <span className="block text-xs text-slate-500">Dicover</span>
                      <span className="font-semibold text-green-600">{formatRupiah(claim.coveredAmount)}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-500">Co-Pay</span>
                      <span className="font-semibold text-amber-600">{formatRupiah(claim.copayAmount || 0)}</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-3 flex gap-2 flex-wrap">
                  {(claim.status === "PENDING" || claim.status === "SUBMITTED") && (
                    <button onClick={() => handleReview(claim.id)} className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 font-semibold">
                      Proses (Review)
                    </button>
                  )}
                  {claim.status === "UNDER_REVIEW" && (
                    <>
                      <button onClick={() => { setActiveClaimId(claim.id); setApprovalType("APPROVE"); }} className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 font-semibold">
                        Approve Full
                      </button>
                      <button onClick={() => { setActiveClaimId(claim.id); setApprovalType("PARTIAL"); }} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-semibold">
                        Approve Sebagian
                      </button>
                      <button onClick={() => { setActiveClaimId(claim.id); setApprovalType("REJECT"); }} className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-semibold">
                        Tolak (Reject)
                      </button>
                    </>
                  )}
                  {(claim.status === "APPROVED" || claim.status === "PARTIALLY_APPROVED") && (
                    <button onClick={() => handleMarkPaid(claim.id)} className="text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-semibold">
                      Tandai Lunas
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-500 italic">Belum ada klaim diajukan.</div>
        )}

        {/* Submit new claim */}
        {insurances.length > 0 && !claims.some((c: any) => c.status !== "REJECTED") && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold mb-2">Ajukan Klaim Baru</p>
            <div className="flex gap-2 items-center">
              <select
                value={selectedInsurance}
                onChange={(e) => setSelectedInsurance(e.target.value)}
                className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm focus:border-brand focus:outline-none flex-1"
              >
                <option value="">Pilih Asuransi...</option>
                {insurances.map((ins: any) => (
                  <option key={ins.id} value={ins.id}>
                    {ins.insurance?.name || 'Asuransi'} ({ins.policyNumber})
                  </option>
                ))}
              </select>
              <input 
                type="text" 
                placeholder="No Referensi" 
                value={claimReference}
                onChange={(e) => setClaimReference(e.target.value)}
                className="w-1/3 rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm focus:border-brand focus:outline-none" 
              />
              <button
                onClick={handleSubmitClaim}
                disabled={!selectedInsurance || submitMutation.isPending}
                className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
              >
                Ajukan
              </button>
            </div>
          </div>
        )}

        {/* Modal for Approval/Rejection */}
        {activeClaimId && approvalType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
              <h3 className="text-lg font-bold mb-4">
                {approvalType === "APPROVE" ? "Approve Klaim Full" : approvalType === "PARTIAL" ? "Approve Sebagian" : "Tolak Klaim"}
              </h3>
              
              <div className="space-y-3">
                {approvalType !== "REJECT" ? (
                  <>
                    <div>
                      <label className="text-xs font-medium text-slate-500">Nilai Dicover</label>
                      <input type="number" value={coveredAmount} onChange={(e) => setCoveredAmount(e.target.value)} className="w-full mt-1 rounded-xl border px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500">Co-Pay Pasien</label>
                      <input type="number" value={copayAmount} onChange={(e) => setCopayAmount(e.target.value)} className="w-full mt-1 rounded-xl border px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500">Catatan Tambahan</label>
                      <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full mt-1 rounded-xl border px-3 py-2 text-sm" />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="text-xs font-medium text-slate-500">Alasan Penolakan</label>
                    <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="w-full mt-1 rounded-xl border px-3 py-2 text-sm" rows={3}></textarea>
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-3 justify-end">
                <button onClick={() => { setActiveClaimId(null); setApprovalType(null); }} className="px-4 py-2 text-sm font-semibold rounded-xl hover:bg-slate-100">Batal</button>
                <button onClick={handleProcessDecision} className="px-4 py-2 text-sm font-semibold rounded-xl bg-brand text-white hover:bg-brand-dark">Konfirmasi</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
