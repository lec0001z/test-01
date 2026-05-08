import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatKRW } from "@/lib/format";
import type { Order, OrderItem, Product } from "@/lib/types";
import DeleteListingButton from "@/components/DeleteListingButton";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ tab?: string }>;
type OrderWithItems = Order & { order_items: OrderItem[] };

export default async function MyPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { tab } = await searchParams;
  const activeTab = tab === "orders" ? "orders" : "listings";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: listingsData }, { data: ordersData }] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const listings = (listingsData ?? []) as Product[];
  const orders = (ordersData ?? []) as OrderWithItems[];

  return (
    <div className="pt-12">
      <h1 className="font-display text-4xl text-coffee-900">마이페이지</h1>
      <p className="mt-2 text-sm text-sepia-700">{user.email}</p>

      <div className="mt-6 inline-flex rounded-full border border-cream-200 bg-white/70 p-1 text-sm">
        <Tab href="/mypage?tab=listings" active={activeTab === "listings"}>
          내가 올린 음반 · {listings.length}
        </Tab>
        <Tab href="/mypage?tab=orders" active={activeTab === "orders"}>
          구매 내역 · {orders.filter((o) => o.status === "paid").length}
        </Tab>
      </div>

      <div className="mt-8">
        {activeTab === "listings" ? (
          <ListingsPanel listings={listings} />
        ) : (
          <OrdersPanel orders={orders} />
        )}
      </div>
    </div>
  );
}

function Tab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        "rounded-full px-4 py-2 transition " +
        (active ? "bg-coffee-900 text-cream-50" : "text-coffee-900 hover:bg-cream-100")
      }
    >
      {children}
    </Link>
  );
}

function ListingsPanel({ listings }: { listings: Product[] }) {
  if (listings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-cream-200 bg-white/50 p-10 text-center">
        <p className="font-display text-2xl text-coffee-900">아직 등록한 음반이 없어요</p>
        <p className="mt-2 text-sm text-sepia-700">소장하고 있던 LP / CD 를 다른 사람에게 넘겨보세요.</p>
        <Link
          href="/sell"
          className="mt-6 inline-block rounded-full bg-coffee-900 px-5 py-2.5 text-sm font-medium text-cream-50 transition hover:bg-sepia-700"
        >
          판매 등록하기
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((p) => (
        <li
          key={p.id}
          className="overflow-hidden rounded-2xl border border-cream-200 bg-white/70 shadow-sm"
        >
          <div className="relative aspect-square bg-cream-100">
            {p.image_url ? (
              <Image
                src={p.image_url}
                alt={`${p.artist} - ${p.title}`}
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-cover"
              />
            ) : null}
            <span className="absolute right-3 top-3 rounded-full bg-coffee-900/85 px-2.5 py-1 text-xs font-medium text-cream-50">
              {p.format}
            </span>
            {p.sold ? (
              <span className="absolute left-3 top-3 rounded-full bg-terracotta px-2.5 py-1 text-xs font-medium text-cream-50">
                판매완료
              </span>
            ) : null}
          </div>
          <div className="p-4">
            <p className="text-xs uppercase tracking-wider text-sepia-500">{p.artist}</p>
            <h3 className="font-display text-lg text-coffee-900">{p.title}</h3>
            <p className="mt-1 text-xs text-sepia-700">
              {p.condition ? `${p.condition} · ` : ""}
              {formatKRW(p.price)}
            </p>
            <div className="mt-3">
              <DeleteListingButton productId={p.id} disabled={p.sold} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function OrdersPanel({ orders }: { orders: OrderWithItems[] }) {
  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-cream-200 bg-white/50 p-10 text-center">
        <p className="font-display text-2xl text-coffee-900">아직 구매 내역이 없어요</p>
        <p className="mt-2 text-sm text-sepia-700">마음에 드는 음반을 골라보세요.</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-coffee-900 px-5 py-2.5 text-sm font-medium text-cream-50 transition hover:bg-sepia-700"
        >
          음반 둘러보기
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {orders.map((o) => (
        <li
          key={o.id}
          className="rounded-2xl border border-cream-200 bg-white/80 p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-sepia-500">
                {new Date(o.created_at).toLocaleString("ko-KR")}
              </p>
              <p className="font-mono text-xs text-sepia-700">{o.order_id}</p>
            </div>
            <StatusBadge status={o.status} />
          </div>

          <ul className="mt-4 divide-y divide-cream-200">
            {o.order_items.map((it) => (
              <li key={it.id} className="flex items-center gap-4 py-3">
                <div className="relative h-14 w-14 flex-none overflow-hidden rounded-lg bg-cream-100">
                  {it.image_url ? (
                    <Image
                      src={it.image_url}
                      alt={`${it.artist} - ${it.title}`}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wider text-sepia-500">{it.artist}</p>
                  <p className="font-display text-base text-coffee-900">{it.title}</p>
                  <p className="text-xs text-sepia-700">
                    {it.format} · {formatKRW(it.price)} × {it.quantity}
                  </p>
                </div>
                <span className="font-display text-base text-terracotta-dark tabular-nums">
                  {formatKRW(it.price * it.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-baseline justify-between border-t border-cream-200 pt-3">
            <span className="text-sm text-sepia-700">합계</span>
            <span className="font-display text-xl text-terracotta-dark tabular-nums">
              {formatKRW(o.amount)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function StatusBadge({ status }: { status: Order["status"] }) {
  if (status === "paid")
    return (
      <span className="rounded-full bg-coffee-900 px-3 py-1 text-xs font-medium text-cream-50">
        결제완료
      </span>
    );
  if (status === "failed")
    return (
      <span className="rounded-full bg-terracotta px-3 py-1 text-xs font-medium text-cream-50">
        결제실패
      </span>
    );
  return (
    <span className="rounded-full bg-cream-200 px-3 py-1 text-xs font-medium text-coffee-900">
      결제대기
    </span>
  );
}
