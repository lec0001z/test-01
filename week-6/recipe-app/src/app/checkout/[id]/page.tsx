import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createPendingPurchase } from "@/actions/checkout";
import { formatKRW } from "@/lib/format";
import CheckoutWidget from "@/components/CheckoutWidget";
import type { RecipeListItem } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function CheckoutPage({ params }: { params: Params }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/checkout/${id}`)}`);

  const { data: recipeData } = await supabase
    .from("recipes")
    .select("id, title, description, category, difficulty, cooking_time, image_url, preview, price, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!recipeData) notFound();
  const recipe = recipeData as RecipeListItem;

  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  if (!clientKey) {
    return (
      <div className="pt-12">
        <h1 className="font-display text-3xl text-olive-900">결제 키가 설정되지 않았어요</h1>
        <p className="mt-2 text-sm text-sage-700">
          <code>.env.local</code> 에 <code>NEXT_PUBLIC_TOSS_CLIENT_KEY</code> 와{" "}
          <code>TOSS_SECRET_KEY</code> 를 추가해주세요. (테스트 키는 README 참고)
        </p>
      </div>
    );
  }

  const init = await createPendingPurchase(recipe.id);

  return (
    <div className="pt-12">
      <h1 className="font-display text-4xl text-olive-900">결제</h1>
      <p className="mt-2 text-sm text-sage-700">
        {user.email} · {recipe.title}
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <CheckoutWidget
            clientKey={clientKey}
            customerKey={user.id}
            customerEmail={user.email ?? ""}
            orderId={init.orderId}
            orderName={init.orderName}
            amount={init.amount}
          />
        </div>

        <aside className="h-fit rounded-2xl border border-cream-200 bg-white/80 p-6 shadow-sm lg:sticky lg:top-24">
          <h2 className="font-display text-xl text-olive-900">주문 요약</h2>

          {recipe.image_url ? (
            <div className="relative mt-4 aspect-[4/3] w-full overflow-hidden rounded-xl bg-cream-100">
              <Image
                src={recipe.image_url}
                alt={recipe.title}
                fill
                sizes="360px"
                className="object-cover"
              />
            </div>
          ) : null}

          <dl className="mt-4 space-y-2 text-sm text-sage-700">
            <div className="flex justify-between">
              <dt>레시피</dt>
              <dd className="text-olive-900">{recipe.title}</dd>
            </div>
            <div className="flex justify-between">
              <dt>카테고리</dt>
              <dd className="text-olive-900">{recipe.category}</dd>
            </div>
            <div className="flex justify-between">
              <dt>조리시간</dt>
              <dd className="text-olive-900">{recipe.cooking_time}분</dd>
            </div>
          </dl>
          <hr className="my-4 border-cream-200" />
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-sage-700">합계</span>
            <span className="font-display text-2xl text-tomato-dark tabular-nums">
              {formatKRW(init.amount)}
            </span>
          </div>
          <p className="mt-3 text-xs text-sage-500">
            테스트 결제이므로 실제로 청구되지 않아요. 카드 번호는 토스페이먼츠 안내 카드를 사용해주세요.
          </p>
        </aside>
      </div>
    </div>
  );
}
