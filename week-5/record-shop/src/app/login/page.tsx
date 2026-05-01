"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { signIn } from "@/actions/auth";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mx-auto mt-16 max-w-md">
      <div className="rounded-2xl border border-cream-200 bg-white/80 p-8 shadow-sm backdrop-blur">
        <h1 className="font-display text-3xl text-coffee-900">다시 오신 걸 환영해요</h1>
        <p className="mt-2 text-sm text-sepia-700">장바구니를 사용하려면 로그인이 필요해요.</p>

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
          <Field name="email" label="이메일" type="email" autoComplete="email" required />
          <Field name="password" label="비밀번호" type="password" autoComplete="current-password" required />

          {error ? (
            <p className="rounded-md bg-terracotta/10 px-3 py-2 text-sm text-terracotta-dark">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 w-full rounded-xl bg-coffee-900 py-3 font-medium text-cream-50 transition hover:bg-sepia-700 disabled:opacity-60"
          >
            {isPending ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-sepia-700">
          아직 회원이 아니신가요?{" "}
          <Link href="/signup" className="font-medium text-terracotta-dark underline-offset-4 hover:underline">
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
      <span className="text-sm font-medium text-coffee-900">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        className="mt-1 block w-full rounded-xl border border-cream-200 bg-cream-50 px-4 py-3 text-coffee-900 outline-none ring-sepia-300 transition focus:ring-2"
      />
    </label>
  );
}
