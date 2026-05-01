"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const SYNTHETIC_DOMAIN = "id.community.local";

function usernameToEmail(username: string) {
  return `${username.toLowerCase()}@${SYNTHETIC_DOMAIN}`;
}

export async function login(formData: FormData) {
  const supabase = createClient();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!USERNAME_RE.test(username)) {
    redirect(`/login?error=${encodeURIComponent("아이디 형식이 올바르지 않습니다")}`);
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });
  if (error) {
    redirect(`/login?error=${encodeURIComponent("아이디 또는 비밀번호가 올바르지 않습니다")}`);
  }
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signup(formData: FormData) {
  const supabase = createClient();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!USERNAME_RE.test(username)) {
    redirect(
      `/signup?error=${encodeURIComponent("아이디는 영문/숫자/_ 3~20자")}`
    );
  }
  if (password.length < 6) {
    redirect(`/signup?error=${encodeURIComponent("비밀번호는 6자 이상")}`);
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .maybeSingle();
  if (existing) {
    redirect(`/signup?error=${encodeURIComponent("이미 사용 중인 아이디입니다")}`);
  }

  const { data, error } = await supabase.auth.signUp({
    email: usernameToEmail(username),
    password,
    options: { data: { username } },
  });
  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }
  if (!data.session) {
    redirect(
      "/login?info=" +
        encodeURIComponent("회원가입 완료. 로그인해주세요")
    );
  }
  revalidatePath("/", "layout");
  redirect("/");
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
