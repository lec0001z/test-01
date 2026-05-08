import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "RecipeBox — 한 끼 레시피",
  description: "3줄 미리보기로 보고, 마음에 들면 결제하고 전체 레시피를 받아가는 작은 레시피 상점",
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
        <footer className="mt-16 border-t border-cream-200 py-8 text-center text-sm text-sage-700">
          <p className="font-display italic">RecipeBox · 손맛을 담은 한 그릇</p>
          <p className="mt-1 text-xs text-sage-500">© 2026 recipe-app demo</p>
        </footer>
      </body>
    </html>
  );
}
