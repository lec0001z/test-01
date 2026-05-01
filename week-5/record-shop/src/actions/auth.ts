"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 모두 입력해주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: koreanAuthError(error.message) };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 모두 입력해주세요." };
  }
  if (password.length < 6) {
    return { error: "비밀번호는 최소 6자 이상이어야 해요." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: koreanAuthError(error.message) };
  }

  // 이메일 확인이 꺼져 있으면 session 이 발급되어 바로 로그인됨
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/");
  }

  return {
    info: "확인 메일을 보냈습니다. 메일 인증 후 로그인해주세요.",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

function koreanAuthError(msg: string): string {
  if (/Invalid login credentials/i.test(msg)) return "이메일 또는 비밀번호가 올바르지 않아요.";
  if (/already registered|User already/i.test(msg)) return "이미 가입된 이메일이에요.";
  if (/email/i.test(msg) && /valid/i.test(msg)) return "올바른 이메일 형식이 아니에요.";
  if (/password/i.test(msg) && /6/.test(msg)) return "비밀번호는 최소 6자 이상이어야 해요.";
  return msg;
}
