"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RotateCcw,
  Clock,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------- Types ----------

interface ImportError {
  row: number;
  field: string;
  message: string;
}

interface BatchImportResult {
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: ImportError[];
}

interface ImportHistoryItem {
  id: string;
  timestamp: string;
  userId: string;
  newValues: {
    fileName?: string;
    totalRows?: number;
    successCount?: number;
    errorCount?: number;
  } | null;
}

// ---------- API Helpers ----------

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("elis_token");
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

async function uploadCsvFile(file: File): Promise<BatchImportResult> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/v1/analyzer/import`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    // Unwrap nested envelope if present
    const message =
      data?.data?.message ?? data?.message ?? "Gagal mengimpor file.";
    throw new Error(message);
  }

  // Unwrap TransformInterceptor envelope: { success, data: {...} }
  const inner = data?.data ?? data;
  return inner as BatchImportResult;
}

async function fetchImportHistory(
  page = 1,
  limit = 10
): Promise<{ data: ImportHistoryItem[]; total: number }> {
  const token = getToken();
  const qs = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const response = await fetch(
    `${API_BASE_URL}/api/v1/analyzer/import-history?${qs}`,
    {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message ?? "Gagal memuat riwayat impor.");
  }

  // Unwrap envelope
  const inner = data?.data ?? data;
  return {
    data: inner?.data ?? [],
    total: inner?.total ?? 0,
  };
}

// ---------- Component ----------

export default function AnalyzerImportPage() {
  // Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<BatchImportResult | null>(
    null
  );
  const [uploadError, setUploadError] = useState<string | null>(null);

  // History state
  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Error detail visibility
  const [showErrors, setShowErrors] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch import history
  const loadHistory = useCallback(async (page = 1) => {
    setIsLoadingHistory(true);
    try {
      const result = await fetchImportHistory(page, 10);
      setHistory(result.data);
      setHistoryTotal(result.total);
      setHistoryPage(page);
    } catch {
      // silently fail — history is supplementary
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadHistory(1);
  }, [loadHistory]);

  // Drag handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (isValidCsvFile(file)) {
        setSelectedFile(file);
        setUploadResult(null);
        setUploadError(null);
      } else {
        setUploadError("Hanya file CSV yang diperbolehkan.");
      }
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (isValidCsvFile(file)) {
          setSelectedFile(file);
          setUploadResult(null);
          setUploadError(null);
        } else {
          setUploadError("Hanya file CSV yang diperbolehkan.");
        }
      }
    },
    []
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      const result = await uploadCsvFile(selectedFile);
      setUploadResult(result);
      setShowErrors(result.errorCount > 0);
      // Refresh history after successful import
      loadHistory(1);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Terjadi kesalahan saat impor.";
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, loadHistory]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setUploadResult(null);
    setUploadError(null);
    setShowErrors(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground">
          Import Hasil Analyzer
        </h2>
        <p className="text-sm text-muted-foreground">
          Unggah file CSV hasil analyzer untuk impor batch ke sistem.
        </p>
      </div>

      {/* Upload Section */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          Unggah File CSV
        </h3>

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/50",
            selectedFile && "border-primary/30 bg-primary/5"
          )}
          role="button"
          aria-label="Upload CSV file"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              fileInputRef.current?.click();
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,application/csv"
            className="hidden"
            onChange={handleFileSelect}
            aria-hidden="true"
          />

          {selectedFile ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <FileSpreadsheet className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  {isDragging
                    ? "Lepas file di sini..."
                    : "Seret & lepas file CSV, atau klik untuk memilih"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Format: CSV dengan kolom orderNumber, testCode, resultValue.
                  Maks 10MB.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all shadow-sm",
              selectedFile && !isUploading
                ? "bg-primary text-white hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Mengimpor...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Impor Hasil
              </>
            )}
          </button>

          {selectedFile && (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-all"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          )}
        </div>

        {/* Upload Error */}
        {uploadError && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/50">
            <XCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                Gagal Mengimpor
              </p>
              <p className="mt-0.5 text-xs text-red-700 dark:text-red-300">
                {uploadError}
              </p>
            </div>
          </div>
        )}

        {/* Upload Result Summary */}
        {uploadResult && (
          <div className="mt-4 space-y-4">
            {/* Summary Stats */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Baris</p>
                  <p className="text-lg font-bold text-foreground">
                    {uploadResult.totalRows}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/50">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    Berhasil
                  </p>
                  <p className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
                    {uploadResult.successCount}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/50">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <div>
                  <p className="text-xs text-red-700 dark:text-red-300">
                    Gagal
                  </p>
                  <p className="text-lg font-bold text-red-800 dark:text-red-200">
                    {uploadResult.errorCount}
                  </p>
                </div>
              </div>
            </div>

            {/* Row-Level Validation Errors */}
            {uploadResult.errors.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/50">
                <button
                  onClick={() => setShowErrors(!showErrors)}
                  className="flex w-full items-center justify-between p-4 text-left"
                  aria-expanded={showErrors}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                      {uploadResult.errors.length} Error Validasi
                    </span>
                  </div>
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                    {showErrors ? "Sembunyikan" : "Tampilkan Detail"}
                  </span>
                </button>

                {showErrors && (
                  <div className="border-t border-amber-200 dark:border-amber-800">
                    <div className="max-h-64 overflow-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-amber-100 dark:bg-amber-900/50">
                          <tr>
                            <th className="px-4 py-2 font-semibold text-amber-800 dark:text-amber-200">
                              Baris
                            </th>
                            <th className="px-4 py-2 font-semibold text-amber-800 dark:text-amber-200">
                              Kolom
                            </th>
                            <th className="px-4 py-2 font-semibold text-amber-800 dark:text-amber-200">
                              Pesan Error
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-200 dark:divide-amber-800">
                          {uploadResult.errors.map((error, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-2 font-mono text-amber-900 dark:text-amber-100">
                                {error.row}
                              </td>
                              <td className="px-4 py-2 font-mono text-amber-900 dark:text-amber-100">
                                {error.field}
                              </td>
                              <td className="px-4 py-2 text-amber-800 dark:text-amber-200">
                                {error.message}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Import History Section */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Riwayat Impor
          </h3>
          <button
            onClick={() => loadHistory(historyPage)}
            disabled={isLoadingHistory}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-all"
            aria-label="Refresh import history"
          >
            <RotateCcw
              className={cn(
                "h-3.5 w-3.5",
                isLoadingHistory && "animate-spin"
              )}
            />
            Refresh
          </button>
        </div>

        {isLoadingHistory && history.length === 0 ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4 rounded-xl border border-border p-4">
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">
              Belum ada riwayat impor
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Riwayat impor akan muncul di sini setelah Anda melakukan impor
              pertama.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-foreground">
                      Tanggal
                    </th>
                    <th className="px-4 py-3 font-semibold text-foreground">
                      Nama File
                    </th>
                    <th className="px-4 py-3 font-semibold text-foreground text-center">
                      Total Baris
                    </th>
                    <th className="px-4 py-3 font-semibold text-foreground text-center">
                      Berhasil
                    </th>
                    <th className="px-4 py-3 font-semibold text-foreground text-center">
                      Gagal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.map((item) => {
                    const stats = item.newValues;
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(item.timestamp)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm text-foreground truncate max-w-[200px]">
                              {stats?.fileName ?? "-"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-medium text-foreground">
                          {stats?.totalRows ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {stats?.successCount ?? "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-sm font-medium",
                              (stats?.errorCount ?? 0) > 0
                                ? "text-red-700 dark:text-red-400"
                                : "text-muted-foreground"
                            )}
                          >
                            {(stats?.errorCount ?? 0) > 0 && (
                              <XCircle className="h-3.5 w-3.5" />
                            )}
                            {stats?.errorCount ?? 0}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {historyTotal > 10 && (
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Menampilkan {(historyPage - 1) * 10 + 1}–
                  {Math.min(historyPage * 10, historyTotal)} dari {historyTotal}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadHistory(historyPage - 1)}
                    disabled={historyPage <= 1 || isLoadingHistory}
                    className="rounded-lg border border-border px-3 py-1.5 font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Sebelumnya
                  </button>
                  <button
                    onClick={() => loadHistory(historyPage + 1)}
                    disabled={
                      historyPage * 10 >= historyTotal || isLoadingHistory
                    }
                    className="rounded-lg border border-border px-3 py-1.5 font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Berikutnya
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

// ---------- Utility Functions ----------

function isValidCsvFile(file: File): boolean {
  const validTypes = [
    "text/csv",
    "application/csv",
    "text/plain",
    "application/vnd.ms-excel",
  ];
  const hasValidExtension = file.name.toLowerCase().endsWith(".csv");
  return validTypes.includes(file.type) || hasValidExtension;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
