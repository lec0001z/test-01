import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/actions/auth";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let cartCount = 0;
  if (user) {
    const { data } = await supabase
      .from("cart_items")
      .select("quantity")
      .eq("user_id", user.id);
    cartCount = (data ?? []).reduce((sum, row) => sum + (row.quantity ?? 0), 0);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-cream-200 bg-cream-50/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-coffee-900 text-cream-50">
            <span className="block h-2 w-2 rounded-full bg-cream-50" />
          </span>
          <span className="font-display text-xl tracking-tight">Groove &amp; Vinyl</span>
        </Link>

        <nav className="flex items-center gap-3 text-sm">
          <Link
            href="/cart"
            className="relative rounded-full border border-cream-200 px-4 py-2 text-coffee-900 transition hover:bg-white"
          >
            장바구니
            {cartCount > 0 ? (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-terracotta px-1.5 text-xs font-semibold text-cream-50">
                {cartCount}
              </span>
            ) : null}
          </Link>

          {user ? (
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-full bg-coffee-900 px-4 py-2 text-cream-50 transition hover:bg-sepia-700"
              >
                로그아웃
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-coffee-900 px-4 py-2 text-cream-50 transition hover:bg-sepia-700"
            >
              로그인
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
