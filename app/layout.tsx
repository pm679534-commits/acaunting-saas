import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "HesabSənəd — Mühasibat sənədlərini avtomatik emal edin",
  description:
    "Faktura və qəbzlərinizi yükləyin, AI məlumatları çıxartsın, Excel-ə ixrac edin.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="az" className={inter.variable}>
      <body className="bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
