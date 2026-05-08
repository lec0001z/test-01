import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";
import ProductCard from "@/components/ProductCard";

export const revalidate = 0;

export default async function Home() {
  const supabase = await createClient();

  const [{ data: products, error }, { data: { user } }] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("sold", false)
      .order("created_at", { ascending: false }),
    supabase.auth.getUser(),
  ]);

  return (
    <div>
      <section className="flex flex-wrap items-end justify-between gap-4 pt-12 pb-10">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-sepia-500">indie · korea · resale</p>
          <h1 className="font-display mt-3 text-4xl leading-tight text-coffee-900 sm:text-5xl">
            귀로 만지는 따뜻한 한 장,
            <br />
            <span className="text-terracotta-dark">한국 인디 LP &amp; CD</span>
          </h1>
          <p className="mt-4 max-w-xl text-sepia-700">
            소장하던 음반을 다른 사람에게 넘기고, 다른 사람이 올린 음반을 사기도 하는 작은 중고 음반샵.
            한로로, 잔나비, 검정치마, 실리카겔 같은 한국 인디를 모았어요.
          </p>
        </div>
        {user ? (
          <Link
            href="/sell"
            className="rounded-full bg-coffee-900 px-5 py-2.5 text-sm font-medium text-cream-50 transition hover:bg-sepia-700"
          >
            ＋ 내 음반 판매하기
          </Link>
        ) : (
          <Link
            href="/login"
            className="rounded-full border border-coffee-900 px-5 py-2.5 text-sm font-medium text-coffee-900 transition hover:bg-coffee-900 hover:text-cream-50"
          >
            로그인하고 판매하기
          </Link>
        )}
      </section>

      {error ? (
        <div className="rounded-xl border border-terracotta/40 bg-terracotta/10 p-4 text-sm text-terracotta-dark">
          상품을 불러오지 못했어요: {error.message}
          <p className="mt-2 text-xs text-sepia-700">
            Supabase SQL Editor 에서 <code>supabase/schema.sql</code> 을 먼저 실행했는지 확인해주세요.
          </p>
        </div>
      ) : (products ?? []).length === 0 ? (
        <div className="rounded-xl border border-cream-200 bg-white/60 p-6 text-sm text-sepia-700">
          아직 등록된 음반이 없어요. <code>supabase/schema.sql</code> 을 실행해 시드 데이터를 넣어주세요.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(products as Product[]).map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              isLoggedIn={!!user}
              isOwn={!!user && p.seller_id === user.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
