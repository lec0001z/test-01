"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { signIn } from "@/actions/auth";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [next, setNext] = useState("/");

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const n = sp.get("next");
    if (n) setNext(n);
  }, []);

  return (
    <div className="mx-auto mt-16 max-w-md">
      <div className="rounded-2xl border border-cream-200 bg-white/80 p-8 shadow-sm backdrop-blur">
        <h1 className="font-display text-3xl text-olive-900">다시 오신 걸 환영해요</h1>
        <p className="mt-2 text-sm text-sage-700">레시피 전체를 보려면 로그인이 필요해요.</p>

        <form
          className="mt-8 space-y-4"
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const res = await signIn(formData);
              if (res?.error) setError(res.error);
            });
          }}
        >
          <input type="hidden" name="next" value={next} />
          <Field name="email" label="이메일" type="email" autoComplete="email" required />
          <Field name="password" label="비밀번호" type="password" autoComplete="current-password" required />

          {error ? (
            <p className="rounded-md bg-tomato/10 px-3 py-2 text-sm text-tomato-dark">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 w-full rounded-xl bg-olive-900 py-3 font-medium text-cream-50 transition hover:bg-sage-700 disabled:opacity-60"
          >
            {isPending ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-sage-700">
          아직 회원이 아니신가요?{" "}
          <Link
            href={next !== "/" ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
            className="font-medium text-tomato-dark underline-offset-4 hover:underline"
          >
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type,
  autoComplete,
  required,
}: {
  name: string;
  label: string;
  type: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-olive-900">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        className="mt-1 block w-full rounded-xl border border-cream-200 bg-cream-50 px-4 py-3 text-olive-900 outline-none ring-sage-300 transition focus:ring-2"
      />
    </label>
  );
}
