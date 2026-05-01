import Link from "next/link";
import { login } from "@/app/auth/actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; info?: string };
}) {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-bold">로그인</h1>
      {searchParams.info && (
        <p className="mb-4 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">{searchParams.info}</p>
      )}
      {searchParams.error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{searchParams.error}</p>
      )}
      <form action={login} className="space-y-3">
        <input
          name="username"
          type="text"
          required
          placeholder="아이디"
          className="w-full rounded-md border border-zinc-300 px-3 py-2"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="비밀번호"
          className="w-full rounded-md border border-zinc-300 px-3 py-2"
        />
        <button
          type="submit"
          className="w-full rounded-md bg-zinc-900 py-2 font-medium text-white hover:bg-zinc-700"
        >
          로그인
        </button>
      </form>
      <p className="mt-4 text-sm text-zinc-600">
        계정이 없으신가요?{" "}
        <Link href="/signup" className="text-zinc-900 underline">회원가입</Link>
      </p>
    </div>
  );
}
