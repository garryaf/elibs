"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TestResult {
  testName: string;
  resultValue: string | null;
  flag: string | null;
  unit: string | null;
  referenceRange: string | null;
}

interface Addendum {
  version: number;
  content: string;
  createdAt: string;
}

interface PortalReport {
  orderNumber: string;
  patientName: string;
  clinicName: string | null;
  doctorName: string | null;
  orderDate: string;
  approvedAt: string | null;
  reportVersion: number;
  priority: string | null;
  results: TestResult[];
  addendums: Addendum[];
}

// ─── Helper Components ────────────────────────────────────────────────────────

function FlagBadge({ flag }: { flag: string | null }) {
  if (!flag || flag === "NORMAL") return null;

  const colorMap: Record<string, string> = {
    HIGH: "bg-amber-100 text-amber-800",
    LOW: "bg-blue-100 text-blue-800",
    CRITICAL: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorMap[flag] ?? "bg-muted text-muted-foreground"}`}
    >
      {flag}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-48 animate-pulse rounded bg-muted" />
      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      <Card>
        <CardContent className="space-y-3 pt-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 w-full animate-pulse rounded bg-muted" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <Card className="border-destructive/20">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-6 text-destructive"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div>
          <p className="font-medium text-foreground">Laporan Tidak Tersedia</p>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function PatientPortalPage() {
  const params = useParams();
  const token = params.token as string;

  const [report, setReport] = useState<PortalReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function fetchReport() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/v1/portal/${token}/report`);

        if (!response.ok) {
          if (response.status === 404) {
            setError("Link tidak valid atau sudah kedaluwarsa. Silakan hubungi laboratorium untuk mendapatkan link baru.");
          } else {
            setError("Terjadi kesalahan saat mengambil data laporan. Silakan coba lagi nanti.");
          }
          return;
        }

        const json = await response.json();
        // Handle potential envelope wrapping
        const data = json?.data ?? json;
        setReport(data);
      } catch {
        setError("Tidak dapat terhubung ke server. Periksa koneksi internet Anda dan coba lagi.");
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchReport();
    }
  }, [token]);

  async function handleDownloadPdf() {
    try {
      setDownloading(true);
      const response = await fetch(`/api/v1/portal/${token}/report?format=pdf`);

      if (!response.ok) {
        setError("Gagal mengunduh PDF. Silakan coba lagi.");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan-lab-${report?.orderNumber ?? "report"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError("Gagal mengunduh PDF. Silakan coba lagi.");
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!report) {
    return <ErrorState message="Data laporan tidak ditemukan." />;
  }

  return (
    <div className="space-y-6">
      {/* Patient & Order Info */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Hasil Pemeriksaan Laboratorium
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            No. Order: {report.orderNumber}
          </p>
        </div>
        <Button
          onClick={handleDownloadPdf}
          disabled={downloading}
          className="shrink-0"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
            data-icon="inline-start"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7,10 12,15 17,10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {downloading ? "Mengunduh..." : "Unduh PDF"}
        </Button>
      </div>

      {/* Patient Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informasi Pasien</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Nama Pasien</dt>
              <dd className="font-medium text-foreground">{report.patientName}</dd>
            </div>
            {report.doctorName && (
              <div>
                <dt className="text-muted-foreground">Dokter</dt>
                <dd className="font-medium text-foreground">{report.doctorName}</dd>
              </div>
            )}
            {report.clinicName && (
              <div>
                <dt className="text-muted-foreground">Klinik</dt>
                <dd className="font-medium text-foreground">{report.clinicName}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Tanggal Order</dt>
              <dd className="font-medium text-foreground">
                {new Date(report.orderDate).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </dd>
            </div>
            {report.approvedAt && (
              <div>
                <dt className="text-muted-foreground">Tanggal Persetujuan</dt>
                <dd className="font-medium text-foreground">
                  {new Date(report.approvedAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
            )}
            {report.priority && report.priority !== "ROUTINE" && (
              <div>
                <dt className="text-muted-foreground">Prioritas</dt>
                <dd className="font-medium text-foreground">{report.priority}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Test Results Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hasil Pemeriksaan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">Pemeriksaan</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">Hasil</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">Satuan</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">Nilai Rujukan</th>
                  <th className="pb-2 font-medium text-muted-foreground">Flag</th>
                </tr>
              </thead>
              <tbody>
                {report.results.map((result, index) => (
                  <tr
                    key={index}
                    className="border-b last:border-0"
                  >
                    <td className="py-2.5 pr-4 font-medium text-foreground">
                      {result.testName}
                    </td>
                    <td className="py-2.5 pr-4 text-foreground">
                      {result.resultValue ?? "-"}
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {result.unit ?? "-"}
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {result.referenceRange ?? "-"}
                    </td>
                    <td className="py-2.5">
                      <FlagBadge flag={result.flag} />
                    </td>
                  </tr>
                ))}
                {report.results.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      Belum ada hasil pemeriksaan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Addendums */}
      {report.addendums.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Catatan Tambahan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.addendums.map((addendum) => (
              <div
                key={addendum.version}
                className="rounded-lg border bg-muted/30 p-3"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Versi {addendum.version}</span>
                  <span>
                    {new Date(addendum.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-foreground">{addendum.content}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Report Version Footer */}
      <p className="text-center text-xs text-muted-foreground">
        Versi Laporan: {report.reportVersion}
      </p>
    </div>
  );
}
