"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { apiClient } from "@/lib/api";
import { SearchableDropdown, type DropdownOption } from "@/components/visits/SearchableDropdown";

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentMethod = "CASH" | "BPJS" | "INSURANCE" | "TRANSFER" | "EDC" | "INSURANCE_CASH_FALLBACK" | "CORPORATE_DEFERRED";

interface VisitDetail {
  id: string;
  visitNumber: string;
  status: string;
  paymentMethod: PaymentMethod;
  bpjsNumber?: string | null;
  patient: { id: string; name: string; mrn: string };
  doctor?: { id: string; name: string } | null;
  clinic?: { id: string; name: string } | null;
  insurance?: { id: string; name: string } | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditVisitPage() {
  const params = useParams();
  const router = useRouter();
  const visitId = params.id as string;

  const [visit, setVisit] = useState<VisitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Editable fields
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [bpjsNumber, setBpjsNumber] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<DropdownOption | null>(null);
  const [selectedClinic, setSelectedClinic] = useState<DropdownOption | null>(null);
  const [selectedInsurance, setSelectedInsurance] = useState<DropdownOption | null>(null);

  useEffect(() => {
    async function loadVisit() {
      setLoading(true);
      try {
        const res = await apiClient.get(`/api/v1/visits/${visitId}`) as unknown as VisitDetail;
        if (!res || !res.id) {
          setError("Visit tidak ditemukan.");
          return;
        }
        setVisit(res);
        setPaymentMethod(res.paymentMethod);
        setBpjsNumber(res.bpjsNumber || "");
        if (res.doctor) setSelectedDoctor({ id: res.doctor.id, name: res.doctor.name });
        if (res.clinic) setSelectedClinic({ id: res.clinic.id, name: res.clinic.name });
        if (res.insurance) setSelectedInsurance({ id: res.insurance.id, name: res.insurance.name });
      } catch {
        setError("Gagal memuat data visit.");
      } finally {
        setLoading(false);
      }
    }
    loadVisit();
  }, [visitId]);

  const handleSave = async () => {
    if (!visit) return;

    // Can only edit REGISTERED visits
    if (visit.status !== "REGISTERED") {
      setError("Hanya visit dengan status TERDAFTAR yang dapat diedit.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload: Record<string, unknown> = {
        paymentMethod,
      };
      if (selectedDoctor) payload.doctorId = selectedDoctor.id;
      if (selectedClinic) payload.clinicId = selectedClinic.id;
      if (paymentMethod === "BPJS" && bpjsNumber) payload.bpjsNumber = bpjsNumber;
      if ((paymentMethod === "INSURANCE" || paymentMethod === "INSURANCE_CASH_FALLBACK") && selectedInsurance) {
        payload.insuranceId = selectedInsurance.id;
      }

      await apiClient.put(`/api/v1/visits/${visitId}`, payload);
      setSuccessMsg("Visit berhasil diperbarui.");
      setTimeout(() => router.push(`/dashboard/visits/${visitId}`), 1000);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr.message || "Gagal menyimpan perubahan.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !visit) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <p className="text-red-600">{error}</p>
        <Link href="/dashboard/visits" className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Kembali ke daftar visit
        </Link>
      </div>
    );
  }

  if (!visit) return null;

  const isEditable = visit.status === "REGISTERED";

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/visits/${visitId}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Edit Visit</h1>
          <p className="text-sm text-muted-foreground">
            {visit.visitNumber} — {visit.patient.name} ({visit.patient.mrn})
          </p>
        </div>
      </div>

      {!isEditable && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          Visit ini tidak dapat diedit karena statusnya sudah bukan TERDAFTAR.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">
          {successMsg}
        </div>
      )}

      {/* Form */}
      <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
        {/* Payment Method */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Metode Pembayaran</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            disabled={!isEditable}
            className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          >
            <option value="CASH">Tunai (Cash)</option>
            <option value="BPJS">BPJS</option>
            <option value="INSURANCE">Asuransi Swasta</option>
            <option value="TRANSFER">Transfer</option>
            <option value="EDC">EDC</option>
            <option value="CORPORATE_DEFERRED">Corporate (Tagihan)</option>
          </select>
        </div>

        {/* BPJS Number */}
        {paymentMethod === "BPJS" && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Nomor BPJS</label>
            <input
              type="text"
              value={bpjsNumber}
              onChange={(e) => setBpjsNumber(e.target.value.replace(/\D/g, "").slice(0, 13))}
              disabled={!isEditable}
              placeholder="13 digit nomor BPJS"
              className="h-10 w-full rounded-xl border border-border bg-card px-3.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            />
          </div>
        )}

        {/* Insurance */}
        {(paymentMethod === "INSURANCE" || paymentMethod === "INSURANCE_CASH_FALLBACK") && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Asuransi</label>
            <SearchableDropdown
              value={selectedInsurance}
              onChange={setSelectedInsurance}
              fetchOptions={async (search) => {
                try {
                  const res = await apiClient.getInsurances({ search, limit: 20 });
                  const envelope = (res?.data ?? res) as unknown;
                  let raw: unknown[] = [];
                  if (Array.isArray(envelope)) raw = envelope;
                  else if (envelope && typeof envelope === "object" && "data" in envelope) {
                    const inner = (envelope as { data: unknown }).data;
                    raw = Array.isArray(inner) ? inner : [];
                  }
                  return (raw as Record<string, unknown>[]).map((i) => ({
                    id: i.id as string,
                    name: i.name as string,
                  }));
                } catch { return []; }
              }}
              placeholder="Cari asuransi..."
              disabled={!isEditable}
            />
          </div>
        )}

        {/* Doctor */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Dokter (opsional)</label>
          <SearchableDropdown
            value={selectedDoctor}
            onChange={setSelectedDoctor}
            fetchOptions={async (search) => {
              try {
                const res = await apiClient.getDoctors({ search, limit: 20 });
                const envelope = (res?.data ?? res) as unknown;
                let raw: unknown[] = [];
                if (Array.isArray(envelope)) raw = envelope;
                else if (envelope && typeof envelope === "object" && "data" in envelope) {
                  const inner = (envelope as { data: unknown }).data;
                  raw = Array.isArray(inner) ? inner : [];
                }
                return (raw as Record<string, unknown>[]).map((d) => ({
                  id: d.id as string,
                  name: d.name as string,
                  subtitle: (d.specialization as string) || undefined,
                }));
              } catch { return []; }
            }}
            placeholder="Cari dokter..."
            disabled={!isEditable}
          />
        </div>

        {/* Clinic */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Klinik (opsional)</label>
          <SearchableDropdown
            value={selectedClinic}
            onChange={setSelectedClinic}
            fetchOptions={async (search) => {
              try {
                const res = await apiClient.getClinics({ search, limit: 20 });
                const envelope = (res?.data ?? res) as unknown;
                let raw: unknown[] = [];
                if (Array.isArray(envelope)) raw = envelope;
                else if (envelope && typeof envelope === "object" && "data" in envelope) {
                  const inner = (envelope as { data: unknown }).data;
                  raw = Array.isArray(inner) ? inner : [];
                }
                return (raw as Record<string, unknown>[]).map((c) => ({
                  id: c.id as string,
                  name: c.name as string,
                }));
              } catch { return []; }
            }}
            placeholder="Cari klinik..."
            disabled={!isEditable}
          />
        </div>
      </div>

      {/* Actions */}
      {isEditable && (
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan Perubahan
          </button>
          <Link
            href={`/dashboard/visits/${visitId}`}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Batal
          </Link>
        </div>
      )}
    </div>
  );
}
