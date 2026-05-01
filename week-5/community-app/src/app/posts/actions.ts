"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createPost(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!title || !content) {
    redirect(`/posts/new?error=${encodeURIComponent("제목과 내용을 모두 입력하세요")}`);
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({ title, content, user_id: user.id })
    .select("id")
    .single();

  if (error) {
    redirect(`/posts/new?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/");
  redirect(`/posts/${data.id}`);
}

export async function updatePost(id: string, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!title || !content) {
    redirect(`/posts/${id}/edit?error=${encodeURIComponent("제목과 내용을 모두 입력하세요")}`);
  }

  const { error } = await supabase
    .from("posts")
    .update({ title, content, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    redirect(`/posts/${id}/edit?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/posts/${id}`);
  revalidatePath("/");
  redirect(`/posts/${id}`);
}

export async function deletePost(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) {
    redirect(`/posts/${id}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/");
  redirect("/");
}
