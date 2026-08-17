"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ClipboardPlus, Eye, FlaskConical, Loader2 } from "lucide-react";
import type { PatientOption } from "@/types/visit";
import { WorkflowStepIndicator } from "@/components/registration/WorkflowStepIndicator";
import { PatientSearchStep } from "@/components/registration/PatientSearchStep";
import { PatientRegistrationStep } from "@/components/registration/PatientRegistrationStep";
import { VisitCreationStep } from "@/components/registration/VisitCreationStep";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { apiClient } from "@/lib/api";

interface WorkflowState {
  currentStep: "search" | "register" | "visit-creation";
  searchQuery: string;
  searchResults: PatientOption[];
  searchExecuted: boolean;
  selectedPatient: PatientOption | null;
  createdVisit: { id: string; visitNumber: string } | null;
  isSubmitting: boolean;
  error: string | null;
}

const initialState: WorkflowState = {
  currentStep: "search",
  searchQuery: "",
  searchResults: [],
  searchExecuted: false,
  selectedPatient: null,
  createdVisit: null,
  isSubmitting: false,
  error: null,
};

// ─── Inner component (reads useSearchParams — must be inside <Suspense>) ──────
function RegistrationWorkflow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId");

  const [state, setState] = useState<WorkflowState>(initialState);
  const [loadingPreselect, setLoadingPreselect] = useState(false);

  // If patientId is in the URL, fetch patient data and skip to visit-creation step
  useEffect(() => {
    if (!patientId) return;

    let cancelled = false;
    setLoadingPreselect(true);

    (async () => {
      try {
        const res = await apiClient.getPatient(patientId);
        if (cancelled) return;

        const data = (res?.data ?? res) as Record<string, unknown> | undefined;
        if (!data || !data.id) {
          // Patient not found — fall back to normal search flow
          setLoadingPreselect(false);
          return;
        }

        const patient: PatientOption = {
          id: data.id as string,
          name: data.name as string,
          mrn: data.mrn as string,
          nik: (data.nik as string) || "",
          dateOfBirth: (data.dateOfBirth as string) || "",
          gender: (data.gender as "MALE" | "FEMALE") || "MALE",
        };

        setState((prev) => ({
          ...prev,
          selectedPatient: patient,
          currentStep: "visit-creation",
          error: null,
        }));
      } catch {
        // On error fall back gracefully — user can search manually
      } finally {
        if (!cancelled) setLoadingPreselect(false);
      }
    })();

    return () => { cancelled = true; };
  }, [patientId]);

  // Compute completed steps for the indicator
  const completedSteps: ("search" | "register")[] = [];
  if (state.currentStep === "register" || state.currentStep === "visit-creation") {
    completedSteps.push("search");
  }
  if (state.currentStep === "visit-creation" && state.selectedPatient) {
    completedSteps.push("register");
  }

  // --- State transition handlers ---

  const handlePatientSelected = (patient: PatientOption) => {
    setState((prev) => ({
      ...prev,
      selectedPatient: patient,
      currentStep: "visit-creation",
      error: null,
    }));
  };

  const handleRegisterNew = () => {
    setState((prev) => ({
      ...prev,
      currentStep: "register",
      error: null,
    }));
  };

  const handlePatientRegistered = (patient: PatientOption) => {
    setState((prev) => ({
      ...prev,
      selectedPatient: patient,
      currentStep: "visit-creation",
      error: null,
    }));
  };

  const handleVisitCreated = (visit: { id: string; visitNumber: string }) => {
    setState((prev) => ({
      ...prev,
      createdVisit: visit,
      isSubmitting: false,
      error: null,
    }));
  };

  const handleBack = () => {
    setState((prev) => ({
      ...prev,
      currentStep: "search",
      selectedPatient: null,
      createdVisit: null,
      isSubmitting: false,
      error: null,
    }));
  };

  const handleRegisterAnother = () => {
    setState({ ...initialState });
  };

  // --- Loading state while pre-fetching patient from query param ---
  if (loadingPreselect) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Pendaftaran Pasien
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Alur pendaftaran pasien dan kunjungan terpadu
          </p>
        </div>
        <div className="space-y-4 py-6">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="h-5 w-36 animate-pulse rounded bg-muted" />
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-9 w-full animate-pulse rounded-xl bg-muted" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Success confirmation view ---
  if (state.createdVisit) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Pendaftaran Pasien
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Alur pendaftaran pasien dan kunjungan terpadu
          </p>
        </div>

        {/* Step Indicator */}
        <WorkflowStepIndicator
          currentStep="visit-creation"
          completedSteps={["search", "register"]}
        />

        {/* Success Card */}
        <div className="mx-auto max-w-lg">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
              <CheckCircle2 className="h-8 w-8 text-brand" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Kunjungan Berhasil Didaftarkan
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Nomor kunjungan telah dibuat
            </p>
            <div className="mt-4 inline-block rounded-xl bg-slate-100 px-6 py-3 dark:bg-slate-800">
              <p className="font-mono text-xl font-bold text-brand">
                {state.createdVisit.visitNumber}
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() =>
                  router.push(
                    `/dashboard/orders/new?visitId=${state.createdVisit!.id}`
                  )
                }
                className="flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand/20 transition-all hover:bg-brand-dark hover:shadow-md"
              >
                <FlaskConical className="h-4 w-4" />
                Buat Order
              </button>
              <button
                onClick={handleRegisterAnother}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ClipboardPlus className="h-4 w-4" />
                Daftar Pasien Lain
              </button>
              <button
                onClick={() =>
                  router.push(`/dashboard/visits/${state.createdVisit!.id}`)
                }
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Eye className="h-4 w-4" />
                Lihat Detail
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Main workflow view ---
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Pendaftaran Pasien
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Alur pendaftaran pasien dan kunjungan terpadu
        </p>
      </div>

      {/* Step Indicator */}
      <WorkflowStepIndicator
        currentStep={state.currentStep}
        completedSteps={completedSteps}
      />

      {/* Error Banner */}
      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {state.error}
          <button
            onClick={() => setState((prev) => ({ ...prev, error: null }))}
            className="ml-3 font-medium underline hover:no-underline"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Active Step Content */}
      {state.currentStep === "search" && (
        <PatientSearchStep
          onPatientSelected={handlePatientSelected}
          onRegisterNew={handleRegisterNew}
        />
      )}

      {state.currentStep === "register" && (
        <PatientRegistrationStep
          onPatientRegistered={handlePatientRegistered}
          onBack={handleBack}
        />
      )}

      {state.currentStep === "visit-creation" && state.selectedPatient && (
        <VisitCreationStep
          patient={state.selectedPatient}
          onVisitCreated={handleVisitCreated}
          onBack={handleBack}
        />
      )}
    </div>
  );
}

// ─── Page export — wraps inner component in Suspense (required by Next.js for
//     components that call useSearchParams during SSR / static generation) ─────
export default function RegistrationWorkflowPage() {
  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN", "CS", "SAMPLING"]}>
      <Suspense
        fallback={
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Pendaftaran Pasien
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Alur pendaftaran pasien dan kunjungan terpadu
              </p>
            </div>
            <div className="space-y-4 py-6">
              <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <div className="h-5 w-36 animate-pulse rounded bg-muted" />
                <div className="grid gap-4 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                      <div className="h-9 w-full animate-pulse rounded-xl bg-muted" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        }
      >
        <RegistrationWorkflow />
      </Suspense>
    </RoleGuard>
  );
}
