import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type PostRow = {
  id: string;
  title: string;
  created_at: string;
  profiles: { username: string | null } | null;
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, title, created_at, profiles(username)")
    .order("created_at", { ascending: false })
    .returns<PostRow[]>();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">게시글 목록</h1>
      {!user && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          로그인하면 글을 작성할 수 있어요.
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          불러오기 실패: {error.message}
        </p>
      )}
      {posts && posts.length === 0 && (
        <p className="text-zinc-500">아직 게시글이 없습니다.</p>
      )}
      <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white">
        {posts?.map((p) => (
          <li key={p.id}>
            <Link
              href={`/posts/${p.id}`}
              className="flex items-baseline justify-between gap-3 px-4 py-3 hover:bg-zinc-50"
            >
              <span className="truncate font-medium">{p.title}</span>
              <span className="shrink-0 text-xs text-zinc-500">
                {p.profiles?.username ?? "익명"} ·{" "}
                {new Date(p.created_at).toLocaleString("ko-KR")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
