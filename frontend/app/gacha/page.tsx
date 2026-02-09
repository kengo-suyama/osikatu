"use client";

import { useEffect, useState } from "react";

import { SealRevealModal } from "@/components/gacha/SealRevealModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return (
    <div className="space-y-4" data-testid="gacha-page">
      {hydrated ? <span data-testid="gacha-hydrated" /> : null}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">封印札ガチャ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            神社モチーフの封印札を開封する演出（v1）。
          </p>
          <Button
            type="button"
            onClick={() => setOpen(true)}
            data-testid="gacha-open-seal"
          >
            封印札を開く
          </Button>
        </CardContent>
      </Card>

      <SealRevealModal open={open} onOpenChange={setOpen} />
    </div>
  );
}
