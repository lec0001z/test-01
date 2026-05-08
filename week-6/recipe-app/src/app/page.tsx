import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import RecipeCard from "@/components/RecipeCard";
import type { RecipeListItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();

  const { data: recipesData, error } = await supabase
    .from("recipes")
    .select("id, title, description, category, difficulty, cooking_time, image_url, preview, price, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="pt-12">
        <h1 className="font-display text-3xl text-olive-900">레시피를 불러올 수 없어요</h1>
        <p className="mt-2 text-sm text-tomato-dark">{error.message}</p>
        <p className="mt-4 text-sm text-sage-700">
          <code>supabase/schema.sql</code> 을 먼저 실행하고 <code>.env.local</code> 의 키가 맞는지 확인해주세요.
        </p>
      </div>
    );
  }

  const recipes = (recipesData ?? []) as RecipeListItem[];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const purchasedSet = new Set<string>();
  if (user && recipes.length > 0) {
    const { data: purchases } = await supabase
      .from("purchases")
      .select("recipe_id")
      .eq("user_id", user.id)
      .eq("status", "paid");
    for (const p of purchases ?? []) purchasedSet.add(p.recipe_id as string);
  }

  return (
    <div className="pt-12">
      <section className="mb-10 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.18em] text-sage-700">RecipeBox · 한 끼 레시피</p>
        <h1 className="mt-3 font-display text-4xl leading-tight text-olive-900 sm:text-5xl">
          오늘 저녁, 뭐 만들지 고민이라면.
        </h1>
        <p className="mt-3 text-sage-700">
          앞 3줄은 무료로 둘러보고, 마음에 드는 한 그릇만 골라 결제하세요. 가벼운 가격, 진짜 손맛을 담은 레시피.
        </p>
        {!user ? (
          <div className="mt-5 flex gap-2 text-sm">
            <Link
              href="/login"
              className="rounded-full bg-olive-900 px-4 py-2 text-cream-50 transition hover:bg-sage-700"
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="rounded-full border border-cream-200 px-4 py-2 text-olive-900 transition hover:bg-white"
            >
              회원가입
            </Link>
          </div>
        ) : null}
      </section>

      {recipes.length === 0 ? (
        <p className="text-sm text-sage-700">
          아직 등록된 레시피가 없어요. <code>supabase/schema.sql</code> 의 시드 데이터를 실행해주세요.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r) => (
            <li key={r.id}>
              <RecipeCard recipe={r} purchased={purchasedSet.has(r.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
