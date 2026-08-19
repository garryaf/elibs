"use client";

import { useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Shield,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { SearchableDropdown, type DropdownOption } from "@/components/visits/SearchableDropdown";
import {
  usePatientInsurances,
  useAddPatientInsurance,
  useUpdatePatientInsurance,
  useRemovePatientInsurance,
  type PatientInsurance,
  type InsuranceType,
  type AddPatientInsuranceData,
  type UpdatePatientInsuranceData,
} from "@/services/patient-insurance";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_ROLES = ["ADMIN", "CS", "SUPER_ADMIN"];

const INSURANCE_TYPE_LABELS: Record<InsuranceType, string> = {
  BPJS: "BPJS",
  SWASTA: "Swasta",
  CORPORATE: "Korporat",
};

const COVERAGE_LABELS: Record<number, string> = {
  1: "Primer",
  2: "Sekunder",
  3: "Tersier",
  4: "Kuarter",
  5: "Lainnya",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PatientInsurancePage() {
  const { id: patientId } = useParams<{ id: string }>();

  const { data: rawData, isLoading, error, refetch } = usePatientInsurances(patientId);
  const addMutation = useAddPatientInsurance();
  const updateMutation = useUpdatePatientInsurance();
  const removeMutation = useRemovePatientInsurance();

  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PatientInsurance | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<PatientInsurance | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // ─── Parse insurance records from API response ──────────────────────────
  const records = useMemo((): PatientInsurance[] => {
    if (!rawData) return [];
    const envelope = rawData as unknown;
    if (Array.isArray(envelope)) return envelope as PatientInsurance[];
    if (envelope && typeof envelope === "object") {
      const env = envelope as Record<string, unknown>;
      if (Array.isArray(env.data)) return env.data as PatientInsurance[];
      // If the response itself is an array wrapped differently
      const inner = env.data;
      if (inner && typeof inner === "object" && Array.isArray((inner as Record<string, unknown>).data)) {
        return (inner as Record<string, unknown>).data as PatientInsurance[];
      }
    }
    return [];
  }, [rawData]);

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleAdd = () => {
    setEditingRecord(null);
    setFormError(null);
    setShowForm(true);
  };

  const handleEdit = (record: PatientInsurance) => {
    setEditingRecord(record);
    setFormError(null);
    setShowForm(true);
  };

  const handleDelete = (record: PatientInsurance) => {
    setDeletingRecord(record);
  };

  const confirmDelete = async () => {
    if (!deletingRecord) return;
    try {
      await removeMutation.mutateAsync({
        patientId,
        insuranceRecordId: deletingRecord.id,
      });
      setDeletingRecord(null);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setFormError(apiErr?.message || "Gagal menghapus data asuransi.");
      setDeletingRecord(null);
    }
  };

  const handleFormSubmit = async (data: AddPatientInsuranceData | UpdatePatientInsuranceData) => {
    setFormError(null);
    try {
      if (editingRecord) {
        await updateMutation.mutateAsync({
          patientId,
          insuranceRecordId: editingRecord.id,
          data: data as UpdatePatientInsuranceData,
        });
      } else {
        await addMutation.mutateAsync({
          patientId,
          data: data as AddPatientInsuranceData,
        });
      }
      setShowForm(false);
      setEditingRecord(null);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setFormError(apiErr?.message || "Gagal menyimpan data asuransi.");
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingRecord(null);
    setFormError(null);
  };

  // ─── Loading state ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <RoleGuard allowedRoles={ALLOWED_ROLES}>
        <div className="space-y-6">
          <PageHeader patientId={patientId} />
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div className="h-5 w-40 animate-pulse rounded bg-muted" />
              <div className="h-9 w-32 animate-pulse rounded-xl bg-muted" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-36 animate-pulse rounded bg-muted" />
                  <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
                </div>
                <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                <div className="h-3 w-32 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </RoleGuard>
    );
  }

  // ─── Error state ────────────────────────────────────────────────────────
  if (error) {
    return (
      <RoleGuard allowedRoles={ALLOWED_ROLES}>
        <div className="space-y-6">
          <PageHeader patientId={patientId} />
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="font-medium text-red-700 dark:text-red-300">
              Gagal memuat data asuransi.
            </p>
            <button
              onClick={() => refetch()}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={ALLOWED_ROLES}>
      <div className="space-y-6">
        <PageHeader patientId={patientId} />

        {/* Error Toast */}
        {formError && (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="flex-1">{formError}</span>
            <button
              onClick={() => setFormError(null)}
              className="ml-2 shrink-0 rounded-lg p-1 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-800/50"
              aria-label="Tutup pesan error"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {records.length} asuransi terdaftar
          </p>
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand/20 transition-all hover:bg-brand-dark hover:shadow-md active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Tambah Asuransi
          </button>
        </div>

        {/* Insurance Records List */}
        {records.length === 0 ? (
          <EmptyState onAdd={handleAdd} />
        ) : (
          <div className="space-y-3">
            {records
              .sort((a, b) => a.priority - b.priority)
              .map((record) => (
                <InsuranceRecordCard
                  key={record.id}
                  record={record}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
          </div>
        )}

        {/* Add/Edit Form Modal */}
        {showForm && (
          <InsuranceFormModal
            editingRecord={editingRecord}
            onSubmit={handleFormSubmit}
            onClose={handleCloseForm}
            isSubmitting={addMutation.isPending || updateMutation.isPending}
            error={formError}
          />
        )}

        {/* Delete Confirmation Dialog */}
        {deletingRecord && (
          <DeleteConfirmDialog
            record={deletingRecord}
            onConfirm={confirmDelete}
            onCancel={() => setDeletingRecord(null)}
            isDeleting={removeMutation.isPending}
          />
        )}
      </div>
    </RoleGuard>
  );
}

// ─── Page Header ──────────────────────────────────────────────────────────────

function PageHeader({ patientId }: { patientId: string }) {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/dashboard/patients"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-brand/10 hover:text-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
        aria-label="Kembali ke daftar pasien"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Asuransi Pasien
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Kelola data asuransi dan penjaminan pasien
        </p>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-950">
      <Shield className="h-12 w-12 text-slate-300 dark:text-slate-600" />
      <p className="font-medium text-slate-600 dark:text-slate-400">
        Belum ada data asuransi
      </p>
      <p className="text-sm text-slate-400 dark:text-slate-500">
        Tambahkan asuransi untuk pasien ini.
      </p>
      <button
        onClick={onAdd}
        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        <Plus className="h-4 w-4" />
        Tambah Asuransi
      </button>
    </div>
  );
}

// ─── Insurance Record Card ────────────────────────────────────────────────────

function InsuranceRecordCard({
  record,
  onEdit,
  onDelete,
}: {
  record: PatientInsurance;
  onEdit: (record: PatientInsurance) => void;
  onDelete: (record: PatientInsurance) => void;
}) {
  const insuranceName = record.insurance?.name ?? "Asuransi tidak ditemukan";
  const insuranceCode = record.insurance?.code ?? "";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700">
      <div className="flex items-start justify-between gap-4">
        {/* Left: Insurance Info */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10">
            <Shield className="h-5 w-5 text-brand" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {insuranceName}
              </h3>
              {!record.isActive && (
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  Nonaktif
                </span>
              )}
            </div>
            {insuranceCode && (
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {insuranceCode}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <CoverageBadge priority={record.priority} />
              {record.type && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Tipe: {INSURANCE_TYPE_LABELS[record.type] ?? record.type}
                </span>
              )}
              {record.memberNumber && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  No. Anggota: <span className="font-mono">{record.memberNumber}</span>
                </span>
              )}
              {record.policyNumber && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  No. Polis: <span className="font-mono">{record.policyNumber}</span>
                </span>
              )}
              {record.bpjsClassLevel && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Kelas BPJS: {record.bpjsClassLevel}
                </span>
              )}
            </div>
            {(record.validFrom || record.validUntil) && (
              <p className="text-xs text-slate-400 dark:text-slate-500 pt-0.5">
                Berlaku:{" "}
                {record.validFrom
                  ? new Date(record.validFrom).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}{" "}
                s/d{" "}
                {record.validUntil
                  ? new Date(record.validUntil).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </p>
            )}
            {record.notes && (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic pt-0.5">
                {record.notes}
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(record)}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label={`Edit asuransi ${insuranceName}`}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(record)}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            aria-label={`Hapus asuransi ${insuranceName}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Coverage Badge ───────────────────────────────────────────────────────────

function CoverageBadge({ priority }: { priority: number }) {
  const colorMap: Record<number, string> = {
    1: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    2: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  };
  const color = colorMap[priority] ?? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  const label = COVERAGE_LABELS[priority] ?? `Prioritas ${priority}`;

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${color}`}>
      {label}
    </span>
  );
}

// ─── Insurance Form Modal ─────────────────────────────────────────────────────

function InsuranceFormModal({
  editingRecord,
  onSubmit,
  onClose,
  isSubmitting,
  error,
}: {
  editingRecord: PatientInsurance | null;
  onSubmit: (data: AddPatientInsuranceData | UpdatePatientInsuranceData) => void;
  onClose: () => void;
  isSubmitting: boolean;
  error: string | null;
}) {
  const isEditing = !!editingRecord;

  const [selectedInsurance, setSelectedInsurance] = useState<DropdownOption | null>(
    editingRecord?.insurance
      ? { id: editingRecord.insurance.id, name: editingRecord.insurance.name }
      : null
  );
  const [memberNumber, setMemberNumber] = useState(editingRecord?.memberNumber ?? "");
  const [policyNumber, setPolicyNumber] = useState(editingRecord?.policyNumber ?? "");
  const [priority, setPriority] = useState(editingRecord?.priority ?? 1);
  const [insuranceType, setInsuranceType] = useState<InsuranceType | "">(editingRecord?.type ?? "");
  const [bpjsClassLevel, setBpjsClassLevel] = useState<number | "">(editingRecord?.bpjsClassLevel ?? "");
  const [validFrom, setValidFrom] = useState(editingRecord?.validFrom?.split("T")[0] ?? "");
  const [validUntil, setValidUntil] = useState(editingRecord?.validUntil?.split("T")[0] ?? "");
  const [isActive, setIsActive] = useState(editingRecord?.isActive ?? true);
  const [notes, setNotes] = useState(editingRecord?.notes ?? "");

  const fetchInsurances = useCallback(async (search: string): Promise<DropdownOption[]> => {
    try {
      const res = await apiClient.getInsurances({ search, limit: 20 });
      const envelope = (res?.data ?? res) as unknown;
      let raw: unknown[] = [];
      if (Array.isArray(envelope)) {
        raw = envelope;
      } else if (envelope && typeof envelope === "object") {
        const inner = (envelope as Record<string, unknown>).data;
        raw = Array.isArray(inner) ? inner : [];
      }
      return (raw as Record<string, unknown>[]).map((item) => ({
        id: item.id as string,
        name: item.name as string,
        subtitle: item.code as string | undefined,
      }));
    } catch {
      return [];
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing) {
      const data: UpdatePatientInsuranceData = {};
      if (memberNumber) data.memberNumber = memberNumber;
      if (policyNumber) data.policyNumber = policyNumber;
      if (priority) data.priority = priority;
      if (insuranceType) data.type = insuranceType as InsuranceType;
      if (bpjsClassLevel) data.bpjsClassLevel = Number(bpjsClassLevel);
      if (validFrom) data.validFrom = validFrom;
      if (validUntil) data.validUntil = validUntil;
      data.isActive = isActive;
      if (notes) data.notes = notes;
      onSubmit(data);
    } else {
      if (!selectedInsurance) return;
      const data: AddPatientInsuranceData = {
        insuranceId: selectedInsurance.id,
        priority,
      };
      if (memberNumber) data.memberNumber = memberNumber;
      if (policyNumber) data.policyNumber = policyNumber;
      if (insuranceType) data.type = insuranceType as InsuranceType;
      if (bpjsClassLevel) data.bpjsClassLevel = Number(bpjsClassLevel);
      if (validFrom) data.validFrom = validFrom;
      if (validUntil) data.validUntil = validUntil;
      if (notes) data.notes = notes;
      onSubmit(data);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="insurance-form-title"
        className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <h2
            id="insurance-form-title"
            className="text-lg font-bold text-slate-900 dark:text-white"
          >
            {isEditing ? "Edit Asuransi" : "Tambah Asuransi"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Insurance Provider Select */}
          {!isEditing && (
            <SearchableDropdown
              label="Penyedia Asuransi"
              placeholder="Pilih penyedia asuransi..."
              value={selectedInsurance}
              onChange={setSelectedInsurance}
              fetchOptions={fetchInsurances}
              required
            />
          )}

          {isEditing && editingRecord?.insurance && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Penyedia Asuransi
              </label>
              <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {editingRecord.insurance.name}
              </div>
            </div>
          )}

          {/* Member Number */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              No. Anggota
            </label>
            <input
              type="text"
              value={memberNumber}
              onChange={(e) => setMemberNumber(e.target.value)}
              maxLength={50}
              placeholder="Masukkan nomor anggota"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Policy Number */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              No. Polis
            </label>
            <input
              type="text"
              value={policyNumber}
              onChange={(e) => setPolicyNumber(e.target.value)}
              maxLength={50}
              placeholder="Masukkan nomor polis"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Priority (Coverage Type) */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Prioritas Cakupan <span className="text-red-500">*</span>
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value={1}>1 — Primer</option>
              <option value={2}>2 — Sekunder</option>
              <option value={3}>3 — Tersier</option>
              <option value={4}>4 — Kuarter</option>
              <option value={5}>5 — Lainnya</option>
            </select>
          </div>

          {/* Insurance Type */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Tipe Asuransi
            </label>
            <select
              value={insuranceType}
              onChange={(e) => setInsuranceType(e.target.value as InsuranceType | "")}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">— Pilih tipe —</option>
              <option value="BPJS">BPJS</option>
              <option value="SWASTA">Swasta</option>
              <option value="CORPORATE">Korporat</option>
            </select>
          </div>

          {/* BPJS Class Level (shown only when type is BPJS) */}
          {insuranceType === "BPJS" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Kelas BPJS
              </label>
              <select
                value={bpjsClassLevel}
                onChange={(e) => setBpjsClassLevel(e.target.value ? Number(e.target.value) : "")}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="">— Pilih kelas —</option>
                <option value={1}>Kelas 1</option>
                <option value={2}>Kelas 2</option>
                <option value={3}>Kelas 3</option>
              </select>
            </div>
          )}

          {/* Validity Period */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Berlaku Dari
              </label>
              <input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Berlaku Sampai
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Active toggle (only for edit) */}
          {isEditing && (
            <div className="flex items-center gap-3">
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-brand/20 dark:bg-slate-700" />
              </label>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {isActive ? "Aktif" : "Nonaktif"}
              </span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Catatan
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan tambahan (opsional)"
              rows={2}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 resize-none"
            />
          </div>

          {/* Form Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!isEditing && !selectedInsurance)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? "Simpan Perubahan" : "Tambah Asuransi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirmation Dialog ───────────────────────────────────────────────

function DeleteConfirmDialog({
  record,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  record: PatientInsurance;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  const insuranceName = record.insurance?.name ?? "Asuransi";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={() => !isDeleting && onCancel()}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Hapus Asuransi?
        </h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Data asuransi{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {insuranceName}
          </span>{" "}
          ({COVERAGE_LABELS[record.priority] ?? `Prioritas ${record.priority}`}) akan dihapus dari pasien ini.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Ya, Hapus
          </button>
        </div>
      </div>
    </div>
  );
}
