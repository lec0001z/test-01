"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function getUserOrRedirect() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function addToCart(productId: string) {
  const { supabase, user } = await getUserOrRedirect();

  const { data: existing } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("cart_items")
      .update({ quantity: existing.quantity + 1 })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("cart_items")
      .insert({ user_id: user.id, product_id: productId, quantity: 1 });
  }

  revalidatePath("/cart");
  revalidatePath("/", "layout");
}

export async function updateQuantity(itemId: string, nextQty: number) {
  const { supabase } = await getUserOrRedirect();

  if (nextQty <= 0) {
    await supabase.from("cart_items").delete().eq("id", itemId);
  } else {
    await supabase.from("cart_items").update({ quantity: nextQty }).eq("id", itemId);
  }

  revalidatePath("/cart");
  revalidatePath("/", "layout");
}

export async function removeFromCart(itemId: string) {
  const { supabase } = await getUserOrRedirect();
  await supabase.from("cart_items").delete().eq("id", itemId);

  revalidatePath("/cart");
  revalidatePath("/", "layout");
}
