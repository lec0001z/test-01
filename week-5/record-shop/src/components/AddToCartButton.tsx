"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addToCart } from "@/actions/cart";

export default function AddToCartButton({
  productId,
  isLoggedIn,
}: {
  productId: string;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!isLoggedIn) {
          router.push("/login");
          return;
        }
        startTransition(async () => {
          await addToCart(productId);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
      className="w-full rounded-xl border border-coffee-900 bg-coffee-900 py-2.5 text-sm font-medium text-cream-50 transition hover:bg-sepia-700 disabled:opacity-60"
    >
      {!isLoggedIn ? "로그인하고 담기" : isPending ? "담는 중..." : done ? "✓ 장바구니에 담았어요" : "장바구니 담기"}
    </button>
  );
}
