"use client";

import { Check } from "lucide-react";

type StepId = "search" | "register" | "visit-creation";

interface WorkflowStepIndicatorProps {
  currentStep: StepId;
  completedSteps: ("search" | "register")[];
}

const steps: { id: StepId; label: string }[] = [
  { id: "search", label: "Cari Pasien" },
  { id: "register", label: "Daftar Pasien" },
  { id: "visit-creation", label: "Buat Kunjungan" },
];

export function WorkflowStepIndicator({
  currentStep,
  completedSteps,
}: WorkflowStepIndicatorProps) {
  return (
    <nav aria-label="Langkah pendaftaran" className="w-full">
      <ol className="flex items-center justify-between gap-2">
        {steps.map((step, index) => {
          const isCurrent = step.id === currentStep;
          const isCompleted = completedSteps.includes(step.id as "search" | "register");

          return (
            <li
              key={step.id}
              className="flex flex-1 items-center"
              aria-current={isCurrent ? "step" : undefined}
            >
              <div className="flex w-full flex-col items-center gap-2">
                {/* Step circle and connector */}
                <div className="flex w-full items-center">
                  {/* Left connector */}
                  {index > 0 && (
                    <div
                      className={`h-0.5 flex-1 transition-colors ${
                        isCompleted || isCurrent
                          ? "bg-brand"
                          : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    />
                  )}

                  {/* Step circle */}
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                      isCurrent
                        ? "bg-brand text-white ring-4 ring-brand/20"
                        : isCompleted
                          ? "bg-brand text-white"
                          : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>

                  {/* Right connector */}
                  {index < steps.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 transition-colors ${
                        isCompleted
                          ? "bg-brand"
                          : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    />
                  )}
                </div>

                {/* Step label */}
                <span
                  className={`text-xs font-medium transition-colors ${
                    isCurrent
                      ? "text-brand"
                      : isCompleted
                        ? "text-slate-700 dark:text-slate-300"
                        : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
