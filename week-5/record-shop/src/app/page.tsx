import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";
import ProductCard from "@/components/ProductCard";

export const revalidate = 0;

export default async function Home() {
  const supabase = await createClient();

  const [{ data: products, error }, { data: { user } }] = await Promise.all([
    supabase.from("products").select("*").order("created_at", { ascending: true }),
    supabase.auth.getUser(),
  ]);

  return (
    <div>
      <section className="pt-12 pb-10">
        <p className="text-sm uppercase tracking-[0.2em] text-sepia-500">indie · korea</p>
        <h1 className="font-display mt-3 text-4xl leading-tight text-coffee-900 sm:text-5xl">
          귀로 만지는 따뜻한 한 장,
          <br />
          <span className="text-terracotta-dark">한국 인디 LP &amp; CD</span>
        </h1>
        <p className="mt-4 max-w-xl text-sepia-700">
          작은 음반샵 Groove &amp; Vinyl 에서 큐레이션한 한국 인디 음반. 검정치마부터 한로로, 실리카겔까지.
        </p>
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
            <ProductCard key={p.id} product={p} isLoggedIn={!!user} />
          ))}
        </div>
      )}
    </div>
  );
}
