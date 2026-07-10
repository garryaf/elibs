"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FormField {
  name: string;
  label: string;
  type: "text" | "number" | "email" | "textarea" | "select";
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
}

interface MasterDataFormModalProps {
  fields: FormField[];
  initialData?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  isLoading?: boolean;
}

export function MasterDataFormModal({
  fields,
  initialData,
  onSubmit,
  isOpen,
  onClose,
  title,
  isLoading = false,
}: MasterDataFormModalProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    if (initialData) {
      return { ...initialData };
    }
    const empty: Record<string, unknown> = {};
    for (const field of fields) {
      empty[field.name] = "";
    }
    return empty;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null);

  const isEditMode = !!initialData;

  // Reset form when initialData or fields change (switching between create/edit)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
    } else {
      const empty: Record<string, unknown> = {};
      for (const field of fields) {
        empty[field.name] = "";
      }
      setFormData(empty);
    }
    setErrors({});
  }, [initialData, fields]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Focus trap and Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    // Focus first input on open
    const timer = setTimeout(() => {
      firstInputRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Focus trap
      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable?.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable?.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleChange = useCallback((name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (prev[name]) {
        const rest = { ...prev };
        delete rest[name];
        return rest;
      }
      return prev;
    });
  }, []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    for (const field of fields) {
      if (field.required) {
        const value = formData[field.name];
        if (value === undefined || value === null || String(value).trim() === "") {
          newErrors[field.name] = `${field.label} wajib diisi`;
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalTitle = title ?? (isEditMode ? "Edit Data" : "Tambah Data");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="master-data-modal-title"
      onClick={handleOverlayClick}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" aria-hidden="true" />

      {/* Modal Content */}
      <div
        ref={modalRef}
        className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 backdrop-blur-sm px-6 py-4 dark:border-slate-800 dark:bg-slate-900/95">
          <h2
            id="master-data-modal-title"
            className="text-lg font-bold text-slate-900 dark:text-white"
          >
            {modalTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="p-6 space-y-4">
            {fields.map((field, index) => (
              <div key={field.name}>
                <label
                  htmlFor={`master-field-${field.name}`}
                  className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  {field.label}
                  {field.required && <span className="ml-1 text-red-500">*</span>}
                </label>

                {field.type === "textarea" ? (
                  <textarea
                    id={`master-field-${field.name}`}
                    ref={index === 0 ? (el) => { firstInputRef.current = el; } : undefined}
                    rows={3}
                    placeholder={field.placeholder}
                    value={String(formData[field.name] ?? "")}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    aria-invalid={!!errors[field.name]}
                    aria-describedby={errors[field.name] ? `error-${field.name}` : undefined}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#6B8E6B] focus:ring-2 focus:ring-[#6B8E6B]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-[#6B8E6B]"
                  />
                ) : field.type === "select" ? (
                  <select
                    id={`master-field-${field.name}`}
                    ref={index === 0 ? (el) => { firstInputRef.current = el; } : undefined}
                    value={String(formData[field.name] ?? "")}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    aria-invalid={!!errors[field.name]}
                    aria-describedby={errors[field.name] ? `error-${field.name}` : undefined}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition-all focus:border-[#6B8E6B] focus:ring-2 focus:ring-[#6B8E6B]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-[#6B8E6B]"
                  >
                    <option value="">— Pilih —</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={`master-field-${field.name}`}
                    ref={index === 0 ? (el: HTMLInputElement | null) => { firstInputRef.current = el; } : undefined}
                    type={field.type}
                    placeholder={field.placeholder}
                    value={String(formData[field.name] ?? "")}
                    onChange={(e) => handleChange(field.name, field.type === "number" ? e.target.valueAsNumber || "" : e.target.value)}
                    aria-invalid={!!errors[field.name]}
                    aria-describedby={errors[field.name] ? `error-${field.name}` : undefined}
                    className="h-10 rounded-xl border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#6B8E6B] focus:ring-2 focus:ring-[#6B8E6B]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-[#6B8E6B]"
                  />
                )}

                {errors[field.name] && (
                  <p id={`error-${field.name}`} className="mt-1 text-xs text-red-500" role="alert">
                    {errors[field.name]}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-100 bg-white/95 backdrop-blur-sm px-6 py-4 dark:border-slate-800 dark:bg-slate-900/95">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl px-5 py-2.5"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="rounded-xl bg-[#6B8E6B] px-5 py-2.5 text-white shadow-sm shadow-[#6B8E6B]/20 hover:bg-[#5A7D5A] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Menyimpan...
                </span>
              ) : (
                isEditMode ? "Simpan" : "Tambah"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
