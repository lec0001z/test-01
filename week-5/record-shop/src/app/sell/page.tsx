import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SellForm from "@/components/SellForm";

export const revalidate = 0;

export default async function SellPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="pt-12">
      <h1 className="font-display text-4xl text-coffee-900">내 음반 판매하기</h1>
      <p className="mt-2 text-sm text-sepia-700">
        보관 중인 LP / CD 를 다른 음반 친구에게 넘겨보세요. 사진은 한 장 올릴 수 있어요.
      </p>

      <div className="mt-8">
        <SellForm />
      </div>
    </div>
  );
}
