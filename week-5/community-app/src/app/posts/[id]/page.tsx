import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deletePost } from "@/app/posts/actions";

type PostDetail = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: { username: string | null } | null;
};

export const dynamic = "force-dynamic";

export default async function PostDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: post } = await supabase
    .from("posts")
    .select("id, title, content, created_at, user_id, profiles(username)")
    .eq("id", params.id)
    .maybeSingle<PostDetail>();

  if (!post) notFound();

  const isOwner = user?.id === post.user_id;

  return (
    <article>
      {searchParams.error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{searchParams.error}</p>
      )}
      <h1 className="mb-2 text-2xl font-bold">{post.title}</h1>
      <p className="mb-6 text-sm text-zinc-500">
        {post.profiles?.username ?? "익명"} ·{" "}
        {new Date(post.created_at).toLocaleString("ko-KR")}
      </p>
      <div className="whitespace-pre-wrap rounded-md border border-zinc-200 bg-white p-4 leading-7">
        {post.content}
      </div>
      <div className="mt-6 flex items-center gap-2">
        <Link href="/" className="text-sm text-zinc-600 hover:underline">← 목록</Link>
        {isOwner && (
          <div className="ml-auto flex gap-2">
            <Link
              href={`/posts/${post.id}/edit`}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100"
            >
              수정
            </Link>
            <form action={deletePost.bind(null, post.id)}>
              <button
                type="submit"
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
              >
                삭제
              </button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}
