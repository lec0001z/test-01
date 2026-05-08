import Image from "next/image";
import Link from "next/link";
import type { RecipeListItem } from "@/lib/types";
import { formatKRW, previewLines } from "@/lib/format";

export default function RecipeCard({
  recipe,
  purchased,
}: {
  recipe: RecipeListItem;
  purchased: boolean;
}) {
  const lines = previewLines(recipe.preview, 3);

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-cream-200 bg-white/70 shadow-sm transition hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-cream-100">
        {recipe.image_url ? (
          <Image
            src={recipe.image_url}
            alt={recipe.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-sage-500">no image</div>
        )}
        <div className="absolute left-3 top-3 flex gap-1.5">
          <span className="rounded-full bg-cream-50/90 px-2.5 py-0.5 text-xs text-olive-900 backdrop-blur">
            {recipe.category}
          </span>
          <span className="rounded-full bg-cream-50/90 px-2.5 py-0.5 text-xs text-sage-700 backdrop-blur">
            {recipe.cooking_time}분 · {recipe.difficulty}
          </span>
        </div>
        {purchased ? (
          <span className="absolute right-3 top-3 rounded-full bg-sage-500 px-2.5 py-0.5 text-xs font-medium text-cream-50">
            구매완료
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="font-display text-lg leading-tight text-olive-900">{recipe.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-sage-700">{recipe.description}</p>
        </div>

        <ol className="space-y-1 text-xs text-olive-900/80">
          {lines.map((line, i) => (
            <li key={i} className="line-clamp-1">
              <span className="mr-1 font-display text-tomato-dark">{i + 1}.</span>
              {line.replace(/^\d+\.\s*/, "")}
            </li>
          ))}
          <li className="text-sage-500">…</li>
        </ol>

        <div className="mt-auto flex items-baseline justify-between pt-2">
          <span className="text-xs text-sage-500">
            {purchased ? "전체 레시피 보기" : "잠금 해제"}
          </span>
          <span className="font-display text-lg text-tomato-dark tabular-nums">
            {purchased ? "✓" : formatKRW(recipe.price)}
          </span>
        </div>
      </div>
    </Link>
  );
}
