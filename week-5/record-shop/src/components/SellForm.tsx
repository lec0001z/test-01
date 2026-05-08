"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { createListing } from "@/actions/products";

export default function SellForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(f);
    setPreview(url);
  }

  return (
    <form
      className="grid gap-6 rounded-2xl border border-cream-200 bg-white/80 p-6 shadow-sm md:grid-cols-[280px_1fr]"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const res = await createListing(formData);
          if (!res.ok) {
            setError(res.error);
            return;
          }
          router.push("/mypage?tab=listings");
          router.refresh();
        });
      }}
    >
      <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-cream-200 bg-cream-50/60 p-3 text-center text-sm text-sepia-700 hover:bg-cream-50 cursor-pointer">
        {preview ? (
          <span className="relative block aspect-square w-full overflow-hidden rounded-lg">
            <Image src={preview} alt="미리보기" fill sizes="280px" className="object-cover" />
          </span>
        ) : (
          <span className="flex aspect-square w-full flex-col items-center justify-center rounded-lg text-sepia-500">
            <span className="text-3xl">＋</span>
            <span className="mt-2">앨범 커버 사진</span>
            <span className="mt-1 text-xs text-sepia-500">최대 5MB · jpg/png/webp</span>
          </span>
        )}
        <input
          ref={fileRef}
          type="file"
          name="image"
          accept="image/*"
          className="sr-only"
          onChange={onPickFile}
        />
      </label>

      <div className="grid gap-4">
        <Field name="title" label="앨범 제목" placeholder="예: 이상비행" required />
        <Field name="artist" label="아티스트" placeholder="예: 한로로" required />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-coffee-900">형식</span>
            <select
              name="format"
              defaultValue="LP"
              className="mt-1 block w-full rounded-xl border border-cream-200 bg-cream-50 px-4 py-3 text-coffee-900 outline-none ring-sepia-300 transition focus:ring-2"
            >
              <option value="LP">LP</option>
              <option value="CD">CD</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-coffee-900">상태</span>
            <select
              name="condition"
              defaultValue="A"
              className="mt-1 block w-full rounded-xl border border-cream-200 bg-cream-50 px-4 py-3 text-coffee-900 outline-none ring-sepia-300 transition focus:ring-2"
            >
              <option value="미개봉">미개봉</option>
              <option value="A">A · 거의 새것</option>
              <option value="B">B · 사용감 약간</option>
              <option value="C">C · 사용감 있음</option>
            </select>
          </label>
        </div>

        <Field
          name="price"
          label="가격 (원)"
          type="number"
          inputMode="numeric"
          placeholder="예: 35000"
          required
        />

        <label className="block">
          <span className="text-sm font-medium text-coffee-900">설명 (선택)</span>
          <textarea
            name="description"
            rows={4}
            placeholder="구매 시기, 보관 상태, 한정반 여부 등을 적어주세요."
            className="mt-1 block w-full resize-y rounded-xl border border-cream-200 bg-cream-50 px-4 py-3 text-coffee-900 outline-none ring-sepia-300 transition focus:ring-2"
          />
        </label>

        {error ? (
          <p className="rounded-md bg-terracotta/10 px-3 py-2 text-sm text-terracotta-dark">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="mt-2 w-full rounded-xl bg-coffee-900 py-3 font-medium text-cream-50 transition hover:bg-sepia-700 disabled:opacity-60"
        >
          {isPending ? "등록 중..." : "판매 등록"}
        </button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  inputMode,
  placeholder,
  required,
}: {
  name: string;
  label: string;
  type?: string;
  inputMode?: "numeric" | "text";
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-coffee-900">{label}</span>
      <input
        name={name}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        required={required}
        className="mt-1 block w-full rounded-xl border border-cream-200 bg-cream-50 px-4 py-3 text-coffee-900 outline-none ring-sepia-300 transition focus:ring-2"
      />
    </label>
  );
}
