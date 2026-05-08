import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatKRW } from "@/lib/format";
import type { Purchase, RecipeListItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/mypage");

  const { data: purchasesData } = await supabase
    .from("purchases")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "paid")
    .order("paid_at", { ascending: false });
  const purchases = (purchasesData ?? []) as Purchase[];

  const recipeIds = purchases.map((p) => p.recipe_id);
  const recipes: Record<string, RecipeListItem> = {};
  if (recipeIds.length > 0) {
    const { data: recipesData } = await supabase
      .from("recipes")
      .select("id, title, description, category, difficulty, cooking_time, image_url, preview, price, created_at")
      .in("id", recipeIds);
    for (const r of (recipesData ?? []) as RecipeListItem[]) {
      recipes[r.id] = r;
    }
  }

  return (
    <div className="pt-12">
      <h1 className="font-display text-4xl text-olive-900">내 레시피</h1>
      <p className="mt-2 text-sm text-sage-700">
        {user.email} · 결제 완료 {purchases.length}건
      </p>

      {purchases.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-cream-200 p-10 text-center">
          <p className="text-sage-700">아직 결제한 레시피가 없어요.</p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-full bg-olive-900 px-5 py-2.5 text-sm font-medium text-cream-50 transition hover:bg-sage-700"
          >
            레시피 둘러보기
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {purchases.map((p) => {
            const r = recipes[p.recipe_id];
            if (!r) return null;
            return (
              <li key={p.id}>
                <Link
                  href={`/recipes/${r.id}`}
                  className="flex gap-4 overflow-hidden rounded-2xl border border-cream-200 bg-white/80 p-3 shadow-sm transition hover:shadow-md"
                >
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-cream-100">
                    {r.image_url ? (
                      <Image src={r.image_url} alt={r.title} fill sizes="96px" className="object-cover" />
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <p className="text-xs uppercase tracking-wider text-sage-500">{r.category}</p>
                    <p className="font-display text-lg text-olive-900">{r.title}</p>
                    <p className="mt-1 text-xs text-sage-700">
                      {p.paid_at ? new Date(p.paid_at).toLocaleDateString("ko-KR") : "-"} · {formatKRW(p.amount)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
