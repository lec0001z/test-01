import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";

export async function Nav() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let username: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle<{ username: string }>();
    username = profile?.username ?? null;
  }

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-semibold">커뮤니티</Link>
        <nav className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <Link href="/posts/new" className="rounded-md bg-zinc-900 px-3 py-1.5 text-white hover:bg-zinc-700">
                글쓰기
              </Link>
              <span className="text-zinc-600">{username ?? "사용자"}</span>
              <form action={logout}>
                <button type="submit" className="text-zinc-600 hover:text-zinc-900">로그아웃</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-zinc-900 text-zinc-600">로그인</Link>
              <Link href="/signup" className="rounded-md bg-zinc-900 px-3 py-1.5 text-white hover:bg-zinc-700">
                회원가입
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
