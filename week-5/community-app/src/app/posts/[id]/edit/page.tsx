import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updatePost } from "@/app/posts/actions";

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: post } = await supabase
    .from("posts")
    .select("id, title, content, user_id")
    .eq("id", params.id)
    .maybeSingle();

  if (!post) notFound();
  if (post.user_id !== user.id) redirect(`/posts/${params.id}`);

  const action = updatePost.bind(null, post.id);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">글 수정</h1>
      {searchParams.error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{searchParams.error}</p>
      )}
      <form action={action} className="space-y-3">
        <input
          name="title"
          required
          maxLength={200}
          defaultValue={post.title}
          className="w-full rounded-md border border-zinc-300 px-3 py-2"
        />
        <textarea
          name="content"
          required
          rows={10}
          defaultValue={post.content}
          className="w-full rounded-md border border-zinc-300 px-3 py-2"
        />
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
        >
          저장
        </button>
      </form>
    </div>
  );
}
