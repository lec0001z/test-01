"use client";

import { useTransition } from "react";
import { deleteOwnProduct } from "@/actions/products";

export default function DeleteListingButton({
  productId,
  disabled,
}: {
  productId: string;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending || disabled}
      onClick={() => {
        if (!confirm("이 음반 등록을 삭제할까요?")) return;
        startTransition(() => deleteOwnProduct(productId));
      }}
      className="w-full rounded-xl border border-cream-200 py-2 text-xs text-coffee-900 transition hover:bg-cream-100 disabled:opacity-50"
    >
      {disabled ? "판매완료 (삭제 불가)" : isPending ? "삭제 중..." : "등록 삭제"}
    </button>
  );
}
