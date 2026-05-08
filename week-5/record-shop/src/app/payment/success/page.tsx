import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatKRW } from "@/lib/format";
import type { Order, OrderItem } from "@/lib/types";

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
        <h1 className="font-display text-3xl text-coffee-900">잘못된 접근이에요</h1>
        <p className="mt-2 text-sm text-sepia-700">
          결제 정보가 없어요. <Link href="/cart" className="underline">장바구니로 돌아가기</Link>
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: orderRow } = await supabase
    .from("orders")
    .select("*")
    .eq("order_id", orderId)
    .eq("buyer_id", user.id)
    .maybeSingle();

  if (!orderRow) {
    return (
      <div className="pt-12">
        <h1 className="font-display text-3xl text-coffee-900">주문을 찾을 수 없어요</h1>
        <p className="mt-2 text-sm text-sepia-700">
          서버에 해당 orderId 의 주문이 없어요. 관리자에게 문의해주세요.
        </p>
      </div>
    );
  }

  let order = orderRow as Order;
  const numericAmount = Number(amount);
  let confirmError: string | null = null;

  if (order.status !== "paid") {
    if (numericAmount !== order.amount) {
      confirmError = `결제 금액이 맞지 않아요. (서버: ${order.amount}, 응답: ${numericAmount})`;
      await supabase
        .from("orders")
        .update({ status: "failed", fail_reason: confirmError, payment_key: paymentKey })
        .eq("id", order.id);
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
              .from("orders")
              .update({ status: "failed", fail_reason: confirmError, payment_key: paymentKey })
              .eq("id", order.id);
          } else {
            const nowIso = new Date().toISOString();
            const { data: updated } = await supabase
              .from("orders")
              .update({ status: "paid", payment_key: paymentKey, paid_at: nowIso })
              .eq("id", order.id)
              .select("*")
              .single();
            if (updated) order = updated as Order;

            await supabase.rpc("mark_products_sold_for_order", { p_order_id: order.id });
            await supabase.from("cart_items").delete().eq("user_id", user.id);
          }
        } catch (e) {
          confirmError = e instanceof Error ? e.message : "결제 승인 중 오류";
          await supabase
            .from("orders")
            .update({ status: "failed", fail_reason: confirmError, payment_key: paymentKey })
            .eq("id", order.id);
        }
      }
    }
  }

  const { data: itemsData } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", order.id);
  const items = (itemsData ?? []) as OrderItem[];

  if (confirmError) {
    return (
      <div className="pt-12">
        <h1 className="font-display text-4xl text-coffee-900">결제 승인에 실패했어요</h1>
        <p className="mt-3 rounded-md bg-terracotta/10 px-3 py-2 text-sm text-terracotta-dark">
          {confirmError}
        </p>
        <Link
          href="/cart"
          className="mt-6 inline-block rounded-full bg-coffee-900 px-5 py-2.5 text-sm font-medium text-cream-50"
        >
          장바구니로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-12">
      <h1 className="font-display text-4xl text-coffee-900">결제가 완료됐어요 ☕</h1>
      <p className="mt-2 text-sm text-sepia-700">주문번호 · {order.order_id}</p>

      <div className="mt-8 rounded-2xl border border-cream-200 bg-white/80 p-6 shadow-sm">
        <h2 className="font-display text-xl text-coffee-900">구매하신 음반</h2>
        <ul className="mt-4 divide-y divide-cream-200">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-4 py-3 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wider text-sepia-500">{it.artist}</p>
                <p className="font-display text-base text-coffee-900">{it.title}</p>
                <p className="text-xs text-sepia-700">
                  {it.format} · {formatKRW(it.price)} × {it.quantity}
                </p>
              </div>
              <span className="font-display text-base text-terracotta-dark tabular-nums">
                {formatKRW(it.price * it.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <hr className="my-4 border-cream-200" />
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-sepia-700">결제 금액</span>
          <span className="font-display text-2xl text-terracotta-dark tabular-nums">
            {formatKRW(order.amount)}
          </span>
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <Link
          href="/mypage?tab=orders"
          className="rounded-full bg-coffee-900 px-5 py-2.5 text-sm font-medium text-cream-50 transition hover:bg-sepia-700"
        >
          구매내역 보기
        </Link>
        <Link
          href="/"
          className="rounded-full border border-cream-200 px-5 py-2.5 text-sm text-coffee-900 transition hover:bg-white"
        >
          더 둘러보기
        </Link>
      </div>
    </div>
  );
}
