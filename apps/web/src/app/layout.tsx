import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { QueryProvider } from "@/providers/query-provider";

export const metadata: Metadata = {
  title: "eLIS — Enterprise Laboratory Information System",
  description:
    "Sistem Informasi Laboratorium Enterprise untuk manajemen pasien, pemeriksaan, dan laporan klinis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
