import Link from "next/link";
import { signup } from "@/app/auth/actions";

export default function SignupPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-bold">회원가입</h1>
      {searchParams.error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{searchParams.error}</p>
      )}
      <form action={signup} className="space-y-3">
        <input
          name="username"
          type="text"
          required
          minLength={3}
          maxLength={20}
          pattern="[a-zA-Z0-9_]+"
          placeholder="아이디 (영문/숫자/_, 3~20자)"
          className="w-full rounded-md border border-zinc-300 px-3 py-2"
        />
        <input
          name="password"
          type="password"
          required
          minLength={6}
          placeholder="비밀번호 (6자 이상)"
          className="w-full rounded-md border border-zinc-300 px-3 py-2"
        />
        <button
          type="submit"
          className="w-full rounded-md bg-zinc-900 py-2 font-medium text-white hover:bg-zinc-700"
        >
          가입하기
        </button>
      </form>
      <p className="mt-4 text-sm text-zinc-600">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="text-zinc-900 underline">로그인</Link>
      </p>
    </div>
  );
}
