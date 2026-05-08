import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatKRW } from "@/lib/format";
import type { Purchase, RecipeListItem } from "@/lib/types";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  orderId?: string;
  paymentKey?: string;
  amount?: string;
}>;

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { orderId, paymentKey, amount } = await searchParams;
  if (!orderId || !paymentKey || !amount) {
    return (
      <div className="pt-12">
        <h1 className="font-display text-3xl text-olive-900">잘못된 접근이에요</h1>
        <p className="mt-2 text-sm text-sage-700">
          결제 정보가 없어요. <Link href="/" className="underline">홈으로</Link>
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: purchaseRow } = await supabase
    .from("purchases")
    .select("*")
    .eq("order_id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!purchaseRow) {
    return (
      <div className="pt-12">
        <h1 className="font-display text-3xl text-olive-900">주문을 찾을 수 없어요</h1>
        <p className="mt-2 text-sm text-sage-700">
          서버에 해당 orderId 의 결제가 없어요. 관리자에게 문의해주세요.
        </p>
      </div>
    );
  }

  let purchase = purchaseRow as Purchase;
  const numericAmount = Number(amount);
  let confirmError: string | null = null;

  if (purchase.status !== "paid") {
    if (numericAmount !== purchase.amount) {
      confirmError = `결제 금액이 맞지 않아요. (서버: ${purchase.amount}, 응답: ${numericAmount})`;
      await supabase
        .from("purchases")
        .update({ status: "failed", fail_reason: confirmError, payment_key: paymentKey })
        .eq("id", purchase.id);
    } else {
      const secretKey = process.env.TOSS_SECRET_KEY;
      if (!secretKey) {
        confirmError = "TOSS_SECRET_KEY 가 서버에 설정되지 않았어요.";
      } else {
        const auth = "Basic " + Buffer.from(secretKey + ":").toString("base64");
        try {
          const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: auth },
            body: JSON.stringify({ orderId, paymentKey, amount: numericAmount }),
            cache: "no-store",
          });
          const body = (await res.json()) as { message?: string; code?: string };
          if (!res.ok) {
            confirmError = body.message ?? `결제 승인 실패 (${body.code ?? res.status})`;
            await supabase
              .from("purchases")
              .update({ status: "failed", fail_reason: confirmError, payment_key: paymentKey })
              .eq("id", purchase.id);
          } else {
            const nowIso = new Date().toISOString();
            const { data: updated } = await supabase
              .from("purchases")
              .update({ status: "paid", payment_key: paymentKey, paid_at: nowIso })
              .eq("id", purchase.id)
              .select("*")
              .single();
            if (updated) purchase = updated as Purchase;
          }
        } catch (e) {
          confirmError = e instanceof Error ? e.message : "결제 승인 중 오류";
          await supabase
            .from("purchases")
            .update({ status: "failed", fail_reason: confirmError, payment_key: paymentKey })
            .eq("id", purchase.id);
        }
      }
    }
  }

  const { data: recipeData } = await supabase
    .from("recipes")
    .select("id, title, description, category, difficulty, cooking_time, image_url, preview, price, created_at")
    .eq("id", purchase.recipe_id)
    .maybeSingle();
  const recipe = recipeData as RecipeListItem | null;

  if (confirmError) {
    return (
      <div className="pt-12">
        <h1 className="font-display text-4xl text-olive-900">결제 승인에 실패했어요</h1>
        <p className="mt-3 rounded-md bg-tomato/10 px-3 py-2 text-sm text-tomato-dark">
          {confirmError}
        </p>
        <Link
          href={recipe ? `/recipes/${recipe.id}` : "/"}
          className="mt-6 inline-block rounded-full bg-olive-900 px-5 py-2.5 text-sm font-medium text-cream-50"
        >
          {recipe ? "레시피로 돌아가기" : "홈으로"}
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-12">
      <h1 className="font-display text-4xl text-olive-900">결제가 완료됐어요 ✨</h1>
      <p className="mt-2 text-sm text-sage-700">주문번호 · {purchase.order_id}</p>

      <div className="mt-8 rounded-2xl border border-cream-200 bg-white/80 p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.16em] text-sage-700">언락된 레시피</p>
        <h2 className="mt-1 font-display text-2xl text-olive-900">
          {recipe?.title ?? "레시피"}
        </h2>
        {recipe?.description ? (
          <p className="mt-2 text-sm text-sage-700">{recipe.description}</p>
        ) : null}

        <hr className="my-4 border-cream-200" />
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-sage-700">결제 금액</span>
          <span className="font-display text-2xl text-tomato-dark tabular-nums">
            {formatKRW(purchase.amount)}
          </span>
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        {recipe ? (
          <Link
            href={`/recipes/${recipe.id}`}
            className="rounded-full bg-olive-900 px-5 py-2.5 text-sm font-medium text-cream-50 transition hover:bg-sage-700"
          >
            전체 레시피 보기
          </Link>
        ) : null}
        <Link
          href="/mypage"
          className="rounded-full border border-cream-200 px-5 py-2.5 text-sm text-olive-900 transition hover:bg-white"
        >
          내 레시피
        </Link>
      </div>
    </div>
  );
}
