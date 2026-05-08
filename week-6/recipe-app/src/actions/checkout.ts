"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CheckoutInit = {
  orderId: string;
  amount: number;
  orderName: string;
  recipeId: string;
};

/**
 * /checkout/[id] 진입 시 호출. 해당 레시피에 대한 'pending' purchase 한 건을 만든다.
 * - 이미 paid 면 상세로 보낸다 (중복 결제 방지)
 * - 결제 위젯에 넘길 orderId/amount/orderName 을 돌려준다.
 */
export async function createPendingPurchase(recipeId: string): Promise<CheckoutInit> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/checkout/${recipeId}`)}`);

  const { data: existing } = await supabase
    .from("purchases")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("recipe_id", recipeId)
    .eq("status", "paid")
    .maybeSingle();
  if (existing) redirect(`/recipes/${recipeId}`);

  const { data: recipe, error: recipeErr } = await supabase
    .from("recipes")
    .select("id, title, price")
    .eq("id", recipeId)
    .maybeSingle();
  if (recipeErr) throw new Error(recipeErr.message);
  if (!recipe) redirect("/");

  const orderId = `recipe_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  const { error: insertErr } = await supabase.from("purchases").insert({
    user_id: user.id,
    recipe_id: recipe.id,
    order_id: orderId,
    amount: recipe.price,
    status: "pending",
  });
  if (insertErr) throw new Error(insertErr.message);

  return {
    orderId,
    amount: recipe.price,
    orderName: recipe.title,
    recipeId: recipe.id,
  };
}
