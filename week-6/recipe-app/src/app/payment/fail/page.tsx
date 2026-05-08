import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  code?: string;
  message?: string;
  orderId?: string;
}>;

export default async function PaymentFailPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { code, message, orderId } = await searchParams;

  if (orderId) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("purchases")
        .update({ status: "failed", fail_reason: message ?? code ?? "user-cancel" })
        .eq("order_id", orderId)
        .eq("user_id", user.id);
    }
  }

  return (
    <div className="pt-12">
      <h1 className="font-display text-4xl text-olive-900">결제가 완료되지 않았어요</h1>
      <p className="mt-2 text-sm text-sage-700">
        {message ?? "결제가 중단됐거나 거절되었어요."}{code ? ` (${code})` : ""}
      </p>

      <div className="mt-8 flex gap-3">
        <Link
          href="/"
          className="rounded-full bg-olive-900 px-5 py-2.5 text-sm font-medium text-cream-50 transition hover:bg-sage-700"
        >
          레시피 더 보기
        </Link>
      </div>
    </div>
  );
}
