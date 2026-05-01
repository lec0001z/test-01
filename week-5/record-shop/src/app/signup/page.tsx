"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { signUp } from "@/actions/auth";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mx-auto mt-16 max-w-md">
      <div className="rounded-2xl border border-cream-200 bg-white/80 p-8 shadow-sm backdrop-blur">
        <h1 className="font-display text-3xl text-coffee-900">처음 오셨군요</h1>
        <p className="mt-2 text-sm text-sepia-700">이메일과 비밀번호로 계정을 만들 수 있어요.</p>

        <form
          className="mt-8 space-y-4"
          action={(formData) => {
            setError(null);
            setInfo(null);
            startTransition(async () => {
              const res = await signUp(formData);
              if (res?.error) setError(res.error);
              if (res?.info) setInfo(res.info);
            });
          }}
        >
          <Field name="email" label="이메일" type="email" autoComplete="email" required />
          <Field name="password" label="비밀번호 (6자 이상)" type="password" autoComplete="new-password" required />

          {error ? (
            <p className="rounded-md bg-terracotta/10 px-3 py-2 text-sm text-terracotta-dark">
              {error}
            </p>
          ) : null}
          {info ? (
            <p className="rounded-md bg-sepia-300/20 px-3 py-2 text-sm text-sepia-700">{info}</p>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 w-full rounded-xl bg-coffee-900 py-3 font-medium text-cream-50 transition hover:bg-sepia-700 disabled:opacity-60"
          >
            {isPending ? "가입 중..." : "회원가입"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-sepia-700">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-medium text-terracotta-dark underline-offset-4 hover:underline">
            로그인
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
