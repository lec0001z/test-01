import Image from "next/image";
import type { Product } from "@/lib/types";
import { formatKRW } from "@/lib/format";
import AddToCartButton from "./AddToCartButton";

export default function ProductCard({
  product,
  isLoggedIn,
  isOwn,
}: {
  product: Product;
  isLoggedIn: boolean;
  isOwn?: boolean;
}) {
  const sellerLabel = product.seller_id ? "사용자 판매" : "샵 큐레이션";

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-cream-200 bg-white/70 shadow-sm transition hover:shadow-md">
      <div className="relative aspect-square overflow-hidden bg-cream-100">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={`${product.artist} - ${product.title}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full place-items-center text-sepia-500">no image</div>
        )}
        <span className="absolute right-3 top-3 rounded-full bg-coffee-900/85 px-2.5 py-1 text-xs font-medium text-cream-50">
          {product.format}
        </span>
        <span className="absolute left-3 top-3 rounded-full bg-cream-50/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-coffee-900">
          {sellerLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs uppercase tracking-wider text-sepia-500">{product.artist}</p>
        <h3 className="font-display mt-1 text-lg leading-tight text-coffee-900">
          {product.title}
        </h3>
        {product.description ? (
          <p className="mt-2 line-clamp-2 text-sm text-sepia-700">{product.description}</p>
        ) : null}
        <div className="mt-3 flex items-baseline justify-between">
          <span className="font-display text-xl text-terracotta-dark">{formatKRW(product.price)}</span>
          {product.condition ? (
            <span className="rounded-full border border-cream-200 px-2 py-0.5 text-[11px] text-sepia-700">
              상태 {product.condition}
            </span>
          ) : null}
        </div>

        <div className="mt-4">
          {isOwn ? (
            <button
              type="button"
              disabled
              className="w-full rounded-xl border border-cream-200 py-2.5 text-sm text-sepia-500"
            >
              내가 올린 음반
            </button>
          ) : (
            <AddToCartButton productId={product.id} isLoggedIn={isLoggedIn} />
          )}
        </div>
      </div>
    </article>
  );
}
