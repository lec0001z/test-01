"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CartRow } from "@/lib/types";

export type CheckoutInit = {
  orderId: string;
  amount: number;
  orderName: string;
  itemCount: number;
};

/**
 * /checkout 진입 시 호출. 현재 장바구니로 'pending' 주문 + order_items 스냅샷 생성.
 * Toss 결제 위젯에 넘길 orderId / amount / orderName 을 돌려준다.
 */
export async function createPendingOrderFromCart(): Promise<CheckoutInit> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("cart_items")
    .select("id, user_id, product_id, quantity, created_at, products(*)")
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as CartRow[];
  if (rows.length === 0) redirect("/cart");

  const amount = rows.reduce((s, r) => s + r.products.price * r.quantity, 0);
  const itemCount = rows.reduce((s, r) => s + r.quantity, 0);
  const orderName =
    rows.length === 1
      ? rows[0].products.title
      : `${rows[0].products.title} 외 ${rows.length - 1}건`;

  const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({ buyer_id: user.id, order_id: orderId, amount, status: "pending" })
    .select("id")
    .single();
  if (orderErr) throw new Error(orderErr.message);

  const items = rows.map((r) => ({
    order_id: order.id,
    product_id: r.products.id,
    title: r.products.title,
    artist: r.products.artist,
    format: r.products.format,
    price: r.products.price,
    quantity: r.quantity,
    image_url: r.products.image_url,
  }));
  const { error: itemsErr } = await supabase.from("order_items").insert(items);
  if (itemsErr) throw new Error(itemsErr.message);

  return { orderId, amount, orderName, itemCount };
}
