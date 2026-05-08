"use client";

import { useEffect, useRef, useState } from "react";
import { loadTossPayments, type TossPaymentsWidgets } from "@tosspayments/tosspayments-sdk";
import { formatKRW } from "@/lib/format";

type Props = {
  clientKey: string;
  customerKey: string;
  customerEmail: string;
  orderId: string;
  orderName: string;
  amount: number;
};

export default function CheckoutWidget({
  clientKey,
  customerKey,
  customerEmail,
  orderId,
  orderName,
  amount,
}: Props) {
  const [widgets, setWidgets] = useState<TossPaymentsWidgets | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const renderedRef = useRef(false);

  useEffect(() => {
    if (renderedRef.current) return;
    renderedRef.current = true;

    let cancelled = false;
    (async () => {
      try {
        const tp = await loadTossPayments(clientKey);
        if (cancelled) return;
        const w = tp.widgets({ customerKey });
        await w.setAmount({ currency: "KRW", value: amount });
        if (cancelled) return;
        await Promise.all([
          w.renderPaymentMethods({ selector: "#payment-methods", variantKey: "DEFAULT" }),
          w.renderAgreement({ selector: "#payment-agreement", variantKey: "AGREEMENT" }),
        ]);
        if (cancelled) return;
        setWidgets(w);
        setReady(true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "결제 위젯 로딩에 실패했어요";
        setError(msg);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientKey, customerKey, amount]);

  async function pay() {
    if (!widgets) return;
    setError(null);
    try {
      await widgets.requestPayment({
        orderId,
        orderName,
        customerEmail: customerEmail || undefined,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "결제 요청에 실패했어요";
      setError(msg);
    }
  }

  return (
    <div className="space-y-4">
      <div
        id="payment-methods"
        className="rounded-2xl border border-cream-200 bg-white/80 p-2 shadow-sm"
      />
      <div
        id="payment-agreement"
        className="rounded-2xl border border-cream-200 bg-white/80 p-2 shadow-sm"
      />

      {error ? (
        <p className="rounded-md bg-tomato/10 px-3 py-2 text-sm text-tomato-dark">{error}</p>
      ) : null}

      <button
        type="button"
        disabled={!ready}
        onClick={pay}
        className="w-full rounded-xl bg-olive-900 py-3 font-medium text-cream-50 transition hover:bg-sage-700 disabled:opacity-50"
      >
        {ready ? `${formatKRW(amount)} 결제하기` : "결제 위젯 준비 중..."}
      </button>
    </div>
  );
}
