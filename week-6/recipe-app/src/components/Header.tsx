import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/actions/auth";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-30 border-b border-cream-200 bg-cream-50/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-olive-900 text-cream-50">
            <span className="block h-2 w-2 rounded-full bg-cream-50" />
          </span>
          <span className="font-display text-xl tracking-tight">RecipeBox</span>
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          {user ? (
            <Link
              href="/mypage"
              className="rounded-full border border-cream-200 px-4 py-2 text-olive-900 transition hover:bg-white"
            >
              내 레시피
            </Link>
          ) : null}

          {user ? (
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-full bg-olive-900 px-4 py-2 text-cream-50 transition hover:bg-sage-700"
              >
                로그아웃
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-olive-900 px-4 py-2 text-cream-50 transition hover:bg-sage-700"
            >
              로그인
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
