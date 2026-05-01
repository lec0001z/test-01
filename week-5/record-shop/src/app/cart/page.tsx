import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CartRow } from "@/lib/types";
import CartItemRow from "@/components/CartItemRow";
import { formatKRW } from "@/lib/format";

export const revalidate = 0;

export default async function CartPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("cart_items")
    .select("id, user_id, product_id, quantity, created_at, products(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as unknown as CartRow[];
  const total = rows.reduce((sum, r) => sum + r.products.price * r.quantity, 0);
  const totalCount = rows.reduce((sum, r) => sum + r.quantity, 0);

  return (
    <div className="pt-12">
      <h1 className="font-display text-4xl text-coffee-900">내 장바구니</h1>
      <p className="mt-2 text-sm text-sepia-700">
        {user.email} 님이 담아둔 음반이에요.
      </p>

      {error ? (
        <div className="mt-8 rounded-xl border border-terracotta/40 bg-terracotta/10 p-4 text-sm text-terracotta-dark">
          장바구니를 불러오지 못했어요: {error.message}
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-cream-200 bg-white/50 p-10 text-center">
          <p className="font-display text-2xl text-coffee-900">아직 비어 있어요</p>
          <p className="mt-2 text-sm text-sepia-700">마음에 드는 음반을 담아 보세요.</p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-full bg-coffee-900 px-5 py-2.5 text-sm font-medium text-cream-50 transition hover:bg-sepia-700"
          >
            음반 둘러보기
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <ul className="space-y-3">
            {rows.map((row) => (
              <CartItemRow key={row.id} row={row} />
            ))}
          </ul>

          <aside className="h-fit rounded-2xl border border-cream-200 bg-white/80 p-6 shadow-sm lg:sticky lg:top-24">
            <h2 className="font-display text-xl text-coffee-900">주문 요약</h2>

            <dl className="mt-4 space-y-2 text-sm text-sepia-700">
              <div className="flex justify-between">
                <dt>상품 종류</dt>
                <dd className="tabular-nums text-coffee-900">{rows.length}종</dd>
              </div>
              <div className="flex justify-between">
                <dt>총 수량</dt>
                <dd className="tabular-nums text-coffee-900">{totalCount}개</dd>
              </div>
            </dl>

            <hr className="my-4 border-cream-200" />

            <div className="flex items-baseline justify-between">
              <span className="text-sm text-sepia-700">합계</span>
              <span className="font-display text-2xl text-terracotta-dark tabular-nums">
                {formatKRW(total)}
              </span>
            </div>

            <button
              type="button"
              disabled
              title="이번 과제 범위에는 결제 기능이 포함되지 않아요"
              className="mt-6 w-full rounded-xl bg-coffee-900/40 py-3 text-sm font-medium text-cream-50 disabled:cursor-not-allowed"
            >
              결제하기 (비활성)
            </button>
            <p className="mt-2 text-center text-xs text-sepia-500">
              과제 범위: 결제 기능은 포함되지 않습니다.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
