import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Groove & Vinyl — 인디 음반샵",
  description: "한국 인디 LP/CD를 큐레이션하는 작은 음반샵",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-6xl px-5 pb-20">{children}</main>
        <footer className="border-t border-cream-200 mt-16 py-8 text-center text-sm text-sepia-700">
          <p className="font-display italic">Groove &amp; Vinyl · 인디 음반을 가까이</p>
          <p className="mt-1 text-xs text-sepia-500">© 2026 record-shop demo</p>
        </footer>
      </body>
    </html>
  );
}
