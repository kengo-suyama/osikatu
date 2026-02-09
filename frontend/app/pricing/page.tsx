"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { meRepo } from "@/lib/repo/meRepo";
import { billingRepo } from "@/lib/repo/billingRepo";
import type { MeDto } from "@/lib/types";

const plans = [
  {
    id: "free" as const,
    name: "Free",
    price: "\u00A50",
    features: ["\u63A8\u3057\u767B\u9332 10\u4EF6", "\u30B9\u30B1\u30B8\u30E5\u30FC\u30EB 10\u4EF6", "\u30C1\u30E3\u30C3\u30C8 30\u901A/\u6708", "\u30C6\u30FC\u30DE 5\u7A2E"],
  },
  {
    id: "premium" as const,
    name: "Premium",
    price: "\u00A5480/\u6708",
    features: ["\u63A8\u3057\u767B\u9332 \u7121\u5236\u9650", "\u30B9\u30B1\u30B8\u30E5\u30FC\u30EB \u7121\u5236\u9650", "\u30C1\u30E3\u30C3\u30C8 \u7121\u5236\u9650", "\u30C6\u30FC\u30DE 10\u7A2E", "\u52D5\u753B\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9", "\u5E83\u544A\u306A\u3057"],
  },
  {
    id: "plus" as const,
    name: "Plus",
    price: "\u00A5980/\u6708",
    features: [
      "Premium\u306E\u5168\u6A5F\u80FD",
      "Pins \u62E1\u5F35 (10\u4EF6)",
      "Settlement \u53CE\u652F\u7BA1\u7406",
      "\u30AA\u30FC\u30CA\u30FC\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9",
      "\u4E88\u5B9A\u63D0\u6848\u627F\u8A8D",
      "\u64CD\u4F5C\u30ED\u30B0\u95B2\u89A7",
    ],
  },
];

export default function PricingPage() {
  const [me, setMe] = useState<MeDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"checkout" | "portal" | null>(null);
  const searchParams = useSearchParams();
  const billingStatus = searchParams.get("billing");

  useEffect(() => {
    meRepo.getMe().then(setMe).catch(() => {});
  }, []);

  const currentPlan = me?.effectivePlan ?? me?.plan ?? "free";

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6" data-testid="pricing-page">
      <div>
        <div className="text-lg font-semibold">\u30D7\u30E9\u30F3</div>
        <div className="mt-1 text-xs text-muted-foreground">
          \u3042\u306A\u305F\u306B\u5408\u3063\u305F\u30D7\u30E9\u30F3\u3092\u9078\u3073\u307E\u3057\u3087\u3046
        </div>
      </div>

      {billingStatus === "cancel" && (
        <Card className="rounded-2xl border p-4 shadow-sm" data-testid="pricing-billing-cancel">
          <div className="text-sm font-semibold">キャンセルされました</div>
          <div className="mt-1 text-xs text-muted-foreground">
            お支払いはキャンセルされました。必要ならもう一度アップグレードできます。
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`rounded-2xl border p-4 shadow-sm ${
              plan.id === currentPlan ? "border-primary ring-1 ring-primary" : ""
            }`}
            data-testid={`pricing-plan-${plan.id}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{plan.name}</div>
                <div className="text-xs text-muted-foreground">{plan.price}</div>
              </div>
              {plan.id === currentPlan ? (
                <div className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  \u73FE\u5728\u306E\u30D7\u30E9\u30F3
                </div>
              ) : plan.id === "plus" ? (
                <Button
                  size="sm"
                  variant="secondary"
                  data-testid="pricing-upgrade"
                  onClick={() => {
                    setError(null);
                    setBusy("checkout");
                    billingRepo
                      .createCheckoutUrl()
                      .then((url) => {
                        window.location.href = url;
                      })
                      .catch(() => setError("\u30A2\u30C3\u30D7\u30B0\u30EC\u30FC\u30C9\u306B\u5931\u6557\u3057\u307E\u3057\u305F"))
                      .finally(() => setBusy(null));
                  }}
                  disabled={busy !== null}
                >
                  {busy === "checkout" ? "\u51E6\u7406\u4E2D..." : "\u30A2\u30C3\u30D7\u30B0\u30EC\u30FC\u30C9"}
                </Button>
              ) : null}
            </div>
            <ul className="mt-2 space-y-1">
              {plan.features.map((f) => (
                <li key={f} className="text-xs text-muted-foreground">
                  \u2713 {f}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      {currentPlan !== "free" && (
        <div className="pt-2">
          <Button
            variant="link"
            className="h-auto p-0 text-xs text-muted-foreground underline"
            data-testid="billing-portal-link"
            disabled={busy !== null}
            onClick={() => {
              setError(null);
              setBusy("portal");
              billingRepo
                .createPortalUrl()
                .then((url) => {
                  window.location.href = url;
                })
                .catch(() => setError("\u8ACB\u6C42\u7BA1\u7406\u30DD\u30FC\u30BF\u30EB\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F"))
                .finally(() => setBusy(null));
            }}
          >
            {busy === "portal" ? "\u51E6\u7406\u4E2D..." : "\u8ACB\u6C42\u7BA1\u7406\u30DD\u30FC\u30BF\u30EB\u3078"}
          </Button>
        </div>
      )}

      {error ? <div className="text-xs text-red-500">{error}</div> : null}

      <div>
        <Link href="/home" className="text-sm underline">
          \u30DB\u30FC\u30E0\u3078\u623B\u308B
        </Link>
      </div>
    </div>
  );
}
