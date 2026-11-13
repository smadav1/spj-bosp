import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aplikasi Administrasi & Cetak SPJ BOSP Sekolah",
  description: "Aplikasi administrasi dan cetak SPJ BOSP untuk Operator Sekolah dan Bendahara.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
