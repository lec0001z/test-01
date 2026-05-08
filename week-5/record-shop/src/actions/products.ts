"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ListingResult =
  | { ok: true; productId: string }
  | { ok: false; error: string };

export async function createListing(formData: FormData): Promise<ListingResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };

  const title = String(formData.get("title") ?? "").trim();
  const artist = String(formData.get("artist") ?? "").trim();
  const format = String(formData.get("format") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "").trim();
  const condition = String(formData.get("condition") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const image = formData.get("image");

  if (!title || !artist) return { ok: false, error: "제목과 아티스트는 필수예요." };
  if (format !== "LP" && format !== "CD") return { ok: false, error: "형식은 LP 또는 CD 중에서 선택해주세요." };
  const price = Number(priceRaw.replace(/[^0-9]/g, ""));
  if (!Number.isFinite(price) || price < 0) return { ok: false, error: "가격을 숫자로 입력해주세요." };

  let imageUrl: string | null = null;
  if (image instanceof File && image.size > 0) {
    if (image.size > 5 * 1024 * 1024) {
      return { ok: false, error: "이미지는 5MB 이하만 업로드할 수 있어요." };
    }
    const ext = image.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("product-images")
      .upload(path, image, { contentType: image.type || undefined, upsert: false });
    if (upErr) return { ok: false, error: `이미지 업로드 실패: ${upErr.message}` };
    const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
    imageUrl = pub.publicUrl;
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      title,
      artist,
      format,
      price,
      image_url: imageUrl,
      description,
      condition,
      seller_id: user.id,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: `등록 실패: ${error.message}` };

  revalidatePath("/");
  revalidatePath("/mypage");
  return { ok: true, productId: data.id };
}

export async function deleteOwnProduct(productId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("products").delete().eq("id", productId).eq("seller_id", user.id);
  revalidatePath("/");
  revalidatePath("/mypage");
}
