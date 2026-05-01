import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createPost } from "@/app/posts/actions";

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">새 글 작성</h1>
      {searchParams.error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{searchParams.error}</p>
      )}
      <form action={createPost} className="space-y-3">
        <input
          name="title"
          required
          maxLength={200}
          placeholder="제목"
          className="w-full rounded-md border border-zinc-300 px-3 py-2"
        />
        <textarea
          name="content"
          required
          rows={10}
          placeholder="내용을 입력하세요"
          className="w-full rounded-md border border-zinc-300 px-3 py-2"
        />
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
        >
          작성
        </button>
      </form>
    </div>
  );
}
