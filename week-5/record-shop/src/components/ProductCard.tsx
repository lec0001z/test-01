import Image from "next/image";
import type { Product } from "@/lib/types";
import { formatKRW } from "@/lib/format";
import AddToCartButton from "./AddToCartButton";

export default function ProductCard({
  product,
  isLoggedIn,
}: {
  product: Product;
  isLoggedIn: boolean;
}) {
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
        </div>

        <div className="mt-4">
          <AddToCartButton productId={product.id} isLoggedIn={isLoggedIn} />
        </div>
      </div>
    </article>
  );
}
