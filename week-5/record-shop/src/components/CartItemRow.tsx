"use client";

import Image from "next/image";
import { useTransition } from "react";
import type { CartRow } from "@/lib/types";
import { formatKRW } from "@/lib/format";
import { updateQuantity, removeFromCart } from "@/actions/cart";

export default function CartItemRow({ row }: { row: CartRow }) {
  const [isPending, startTransition] = useTransition();
  const product = row.products;
  const lineTotal = product.price * row.quantity;

  return (
    <li className="flex gap-4 rounded-2xl border border-cream-200 bg-white/70 p-4">
      <div className="relative h-24 w-24 flex-none overflow-hidden rounded-xl bg-cream-100">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={`${product.artist} - ${product.title}`}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-sepia-500">{product.artist}</p>
            <p className="font-display text-lg text-coffee-900">{product.title}</p>
            <p className="text-xs text-sepia-700">{product.format} · {formatKRW(product.price)}</p>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => removeFromCart(row.id))}
            className="text-xs text-sepia-500 transition hover:text-terracotta-dark"
            aria-label="장바구니에서 삭제"
          >
            삭제
          </button>
        </div>

        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="inline-flex items-center rounded-full border border-cream-200 bg-cream-50">
            <button
              type="button"
              disabled={isPending}
              onClick={() => startTransition(() => updateQuantity(row.id, row.quantity - 1))}
              className="grid h-9 w-9 place-items-center text-coffee-900 transition hover:text-terracotta-dark"
              aria-label="수량 감소"
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-medium tabular-nums text-coffee-900">
              {row.quantity}
            </span>
            <button
              type="button"
              disabled={isPending}
              onClick={() => startTransition(() => updateQuantity(row.id, row.quantity + 1))}
              className="grid h-9 w-9 place-items-center text-coffee-900 transition hover:text-terracotta-dark"
              aria-label="수량 증가"
            >
              ＋
            </button>
          </div>

          <span className="font-display text-lg text-terracotta-dark tabular-nums">
            {formatKRW(lineTotal)}
          </span>
        </div>
      </div>
    </li>
  );
}
