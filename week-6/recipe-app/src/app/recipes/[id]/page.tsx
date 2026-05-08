import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatKRW, previewLines } from "@/lib/format";
import type { Recipe } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function RecipeDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();
  const recipe = data as Recipe;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let purchased = false;
  if (user) {
    const { data: p } = await supabase
      .from("purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("recipe_id", recipe.id)
      .eq("status", "paid")
      .maybeSingle();
    purchased = !!p;
  }

  const previewSteps = previewLines(recipe.preview, 3);
  const fullSteps = previewLines(recipe.full_content, 99);

  return (
    <div className="pt-12">
      <Link href="/" className="text-sm text-sage-700 hover:underline">
        ← 모든 레시피
      </Link>

      <div className="mt-4 grid gap-10 lg:grid-cols-[1fr_360px]">
        <article>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-sage-100 px-2.5 py-0.5 text-sage-700">
              {recipe.category}
            </span>
            <span className="text-sage-500">·</span>
            <span className="text-sage-700">
              {recipe.cooking_time}분 · {recipe.difficulty}
            </span>
          </div>
          <h1 className="mt-2 font-display text-4xl leading-tight text-olive-900">
            {recipe.title}
          </h1>
          <p className="mt-3 text-sage-700">{recipe.description}</p>

          {recipe.image_url ? (
            <div className="relative mt-6 aspect-[16/10] w-full overflow-hidden rounded-2xl border border-cream-200 bg-cream-100">
              <Image
                src={recipe.image_url}
                alt={recipe.title}
                fill
                sizes="(min-width: 1024px) 720px, 100vw"
                className="object-cover"
                priority
              />
            </div>
          ) : null}

          <section className="mt-10">
            <h2 className="font-display text-2xl text-olive-900">조리법</h2>

            {purchased ? (
              <ol className="mt-5 space-y-4">
                {fullSteps.map((line, i) => (
                  <li key={i} className="flex gap-4 rounded-xl border border-cream-200 bg-white/70 p-4">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-olive-900 font-display text-sm text-cream-50">
                      {i + 1}
                    </span>
                    <p className="text-olive-900">{line.replace(/^\d+\.\s*/, "")}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <>
                <ol className="mt-5 space-y-4">
                  {previewSteps.map((line, i) => (
                    <li key={i} className="flex gap-4 rounded-xl border border-cream-200 bg-white/70 p-4">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-olive-900 font-display text-sm text-cream-50">
                        {i + 1}
                      </span>
                      <p className="text-olive-900">{line.replace(/^\d+\.\s*/, "")}</p>
                    </li>
                  ))}
                </ol>

                <LockedSection recipe={recipe} loggedIn={!!user} />
              </>
            )}
          </section>
        </article>

        <aside className="h-fit rounded-2xl border border-cream-200 bg-white/80 p-6 shadow-sm lg:sticky lg:top-24">
          <p className="text-xs uppercase tracking-[0.16em] text-sage-700">전체 레시피</p>
          <p className="mt-2 font-display text-3xl text-tomato-dark tabular-nums">
            {formatKRW(recipe.price)}
          </p>
          <p className="mt-3 text-sm text-sage-700">
            결제하면 모든 단계 · 정확한 분량 · 마무리 팁까지 평생 열람할 수 있어요.
          </p>

          {purchased ? (
            <div className="mt-5 rounded-xl bg-sage-100 px-4 py-3 text-sm text-sage-700">
              ✓ 이미 결제하신 레시피예요. 본문에서 전체 단계를 확인하세요.
            </div>
          ) : !user ? (
            <Link
              href={`/login?next=${encodeURIComponent(`/recipes/${recipe.id}`)}`}
              className="mt-5 block rounded-xl bg-olive-900 py-3 text-center font-medium text-cream-50 transition hover:bg-sage-700"
            >
              로그인하고 결제하기
            </Link>
          ) : (
            <Link
              href={`/checkout/${recipe.id}`}
              className="mt-5 block rounded-xl bg-olive-900 py-3 text-center font-medium text-cream-50 transition hover:bg-sage-700"
            >
              {formatKRW(recipe.price)} 결제하기
            </Link>
          )}

          <p className="mt-3 text-xs text-sage-500">
            테스트 결제이므로 실제로 청구되지 않아요.
          </p>
        </aside>
      </div>
    </div>
  );
}

function LockedSection({ recipe, loggedIn }: { recipe: Recipe; loggedIn: boolean }) {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-dashed border-tomato/40 bg-tomato/5">
      <div className="px-6 py-8 text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-tomato-dark">잠긴 단계</p>
        <p className="mt-2 font-display text-2xl text-olive-900">
          나머지 단계와 정확한 분량은 결제 후 공개돼요
        </p>
        <p className="mt-2 text-sm text-sage-700">
          앞 3단계는 미리보기, 진짜 손맛은 그 뒤부터예요.
        </p>

        {loggedIn ? (
          <Link
            href={`/checkout/${recipe.id}`}
            className="mt-5 inline-block rounded-full bg-olive-900 px-6 py-3 text-sm font-medium text-cream-50 transition hover:bg-sage-700"
          >
            {formatKRW(recipe.price)} 결제하고 전체 보기
          </Link>
        ) : (
          <Link
            href={`/login?next=${encodeURIComponent(`/recipes/${recipe.id}`)}`}
            className="mt-5 inline-block rounded-full bg-olive-900 px-6 py-3 text-sm font-medium text-cream-50 transition hover:bg-sage-700"
          >
            로그인하고 결제하기
          </Link>
        )}
      </div>
    </div>
  );
}
