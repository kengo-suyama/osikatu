"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";

import CelebrationSettingsCard from "@/components/settings/CelebrationSettingsCard";
import OshiImageUpload from "@/components/oshi/OshiImageUpload";
import PlanStatusCard from "@/components/common/PlanStatusCard";
import PlanLimitDialog from "@/components/common/PlanLimitDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ProfileSettingsCard from "@/components/profile/ProfileSettingsCard";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_ACCENT_COLOR, hexToHslString, hslStringToHex } from "@/lib/color";
import { EVENTS } from "@/lib/events";
import { getStoredThemeId, setStoredThemeId } from "@/lib/theme/uiTheme";
import { meRepo } from "@/lib/repo/meRepo";
import { inventoryRepo } from "@/lib/repo/inventoryRepo";
import { oshiRepo } from "@/lib/repo/oshiRepo";
import { loadString, saveString } from "@/lib/storage";
import type { MeDto } from "@/lib/types";
import type { Oshi } from "@/lib/uiTypes";
import { cn } from "@/lib/utils";
import { getGachaSfxEnabled, setGachaSfxEnabled } from "@/lib/gachaSfx";
import { LOCALES, useLocale, type Locale } from "@/lib/i18n";
import {
  getVisibleThemes,
  isThemeLocked,
  type ThemeId,
} from "@/src/theme/themes";
import { getFrameById } from "@/src/ui/frames";

const OSHI_KEY = "osikatu:oshi:selected";
const COMPACT_KEY = "osikatu:home:compact";

export default function SettingsScreen() {
  const [oshis, setOshis] = useState<Oshi[]>([]);
  const [selectedOshi, setSelectedOshi] = useState<Oshi | null>(null);
  const [accentHex, setAccentHex] = useState(() =>
    hslStringToHex(DEFAULT_ACCENT_COLOR, "#f472b6")
  );
  const [compactHome, setCompactHome] = useState(true);
  const [me, setMe] = useState<MeDto | null>(null);
  const { locale, setLocale } = useLocale();
  const [themeId, setThemeId] = useState<ThemeId>(() => getStoredThemeId());
  const [themeLimitOpen, setThemeLimitOpen] = useState(false);
  const [gachaSfxEnabled, setGachaSfxEnabledState] = useState(true);
  const [inventory, setInventory] = useState<
    { balance: number; items: { id: number; itemType: string; itemKey: string; rarity: string }[] } | null
  >(null);
  const [inventoryApplying, setInventoryApplying] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const load = async () => {
      try {
        const list = await oshiRepo.getOshis();
        setOshis(list);
        const storedOshi = loadString(OSHI_KEY);
        const resolved =
          list.find((oshi) => String(oshi.id) === String(storedOshi)) ?? list[0] ?? null;
        setSelectedOshi(resolved);
        if (resolved) {
          setAccentHex(hslStringToHex(resolved.profile.accent_color, "#f472b6"));
        }
      } catch {
        setOshis([]);
        setSelectedOshi(null);
      }
    };

    load();

    meRepo
      .getMe()
      .then((data) => {
        setMe(data);
        if (data.ui?.themeId) {
          setThemeId(data.ui.themeId as ThemeId);
        }
      })
      .catch(() => setMe(null));

    const storedCompact = loadString(COMPACT_KEY);
    if (storedCompact) setCompactHome(storedCompact === "true");

    setGachaSfxEnabledState(getGachaSfxEnabled());

    inventoryRepo.getMeInventory().then((data) => {
      if (!data) return;
      setInventory({ balance: data.balance, items: data.items });
    });

    const handleOshiChange = async (event: Event) => {
      const next = (event as CustomEvent<string>).detail;
      try {
        const refreshed = await oshiRepo.getOshi(next);
        if (!refreshed) {
          setSelectedOshi(null);
          return;
        }
        setSelectedOshi(refreshed);
        setAccentHex(hslStringToHex(refreshed.profile.accent_color, "#f472b6"));
        setOshis((prev) => {
          const exists = prev.some((item) => String(item.id) === String(refreshed.id));
          if (!exists) return [...prev, refreshed];
          return prev.map((item) =>
            String(item.id) === String(refreshed.id) ? refreshed : item
          );
        });
      } catch {
        return;
      }
    };

    const handleProfileChange = async (event: Event) => {
      const detail = (event as CustomEvent<{ oshiId: string | number }>).detail;
      try {
        const refreshed = await oshiRepo.getOshi(detail.oshiId);
        if (!refreshed) return;
        setOshis((prev) =>
          prev.map((item) => (String(item.id) === String(detail.oshiId) ? refreshed : item))
        );
        setSelectedOshi((prev) => {
          if (prev && String(prev.id) === String(detail.oshiId)) {
            setAccentHex(hslStringToHex(refreshed.profile.accent_color, "#f472b6"));
            return refreshed;
          }
          return prev;
        });
      } catch {
        return;
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener(EVENTS.OSHI_CHANGE, handleOshiChange);
      window.addEventListener(EVENTS.OSHI_PROFILE_CHANGE, handleProfileChange);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(EVENTS.OSHI_CHANGE, handleOshiChange);
        window.removeEventListener(EVENTS.OSHI_PROFILE_CHANGE, handleProfileChange);
      }
    };
  }, []);

  const selectedId = selectedOshi ? String(selectedOshi.id) : "";
  const planForThemes = useMemo(
    () => me?.effectivePlan ?? me?.plan ?? "free",
    [me?.effectivePlan, me?.plan]
  );
  const visibleThemes = useMemo(() => getVisibleThemes(planForThemes), [planForThemes]);

  const unlockedThemes = useMemo(() => {
    const list = inventory?.items?.filter((i) => i.itemType === "theme") ?? [];
    return list;
  }, [inventory?.items]);

  const unlockedFrames = useMemo(() => {
    const list = inventory?.items?.filter((i) => i.itemType === "frame") ?? [];
    return list;
  }, [inventory?.items]);

  const applyInventoryItem = async (itemType: "theme" | "frame", itemKey: string) => {
    setInventoryApplying(`${itemType}:${itemKey}`);
    try {
      const res = await inventoryRepo.apply({ itemType, itemKey });
      if (!res) return;
      if (itemType === "theme" && typeof res.applied.themeId === "string") {
        const next = res.applied.themeId as ThemeId;
        setThemeId(next);
        setStoredThemeId(next);
        // Keep server state consistent for other clients (best-effort).
        void meRepo.updateUiSettings({ themeId: next });
        setMe(await meRepo.refreshMe().catch(() => null));
      }
      if (itemType === "frame" && typeof res.applied.oshiId === "number") {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(EVENTS.OSHI_PROFILE_CHANGE, { detail: { oshiId: res.applied.oshiId } })
          );
        }
        // Refresh local list for immediate reflect in Settings.
        const list = await oshiRepo.getOshis().catch(() => [] as Oshi[]);
        setOshis(list);
      }
    } finally {
      setInventoryApplying(null);
    }
  };

  const handleOshiSelect = (value: string) => {
    saveString(OSHI_KEY, value);
    const resolved =
      oshis.find((oshi) => String(oshi.id) === String(value)) ?? oshis[0] ?? null;
    setSelectedOshi(resolved);
    if (resolved) {
      setAccentHex(hslStringToHex(resolved.profile.accent_color, "#f472b6"));
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENTS.OSHI_CHANGE, { detail: value }));
    }
  };

  const handleAccentChange = async (value: string) => {
    setAccentHex(value);
    if (!selectedOshi) return;
    try {
      const updated = await oshiRepo.updateProfile(selectedOshi.id, {
        accent_color: hexToHslString(value, DEFAULT_ACCENT_COLOR),
      });
      if (updated) {
        setSelectedOshi(updated);
        setOshis((prev) =>
          prev.map((item) => (String(item.id) === String(updated.id) ? updated : item))
        );
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(EVENTS.OSHI_PROFILE_CHANGE, { detail: { oshiId: updated.id } })
          );
        }
      }
    } catch {
      return;
    }
  };

  const handleCompactHomeChange = (checked: boolean) => {
    setCompactHome(checked);
    saveString(COMPACT_KEY, String(checked));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENTS.HOME_COMPACT_CHANGE, { detail: checked }));
    }
  };

  const handleThemeSelect = (next: ThemeId) => {
    if (isThemeLocked(next, planForThemes)) {
      setThemeLimitOpen(true);
      return;
    }
    setThemeId(next);
    setStoredThemeId(next);
    void meRepo.updateUiSettings({ themeId: next });
  };

  const handleGachaSfxChange = (checked: boolean) => {
    setGachaSfxEnabledState(checked);
    setGachaSfxEnabled(checked);
  };

  return (
    <div className="space-y-4" data-testid="settings-page">
      {hydrated ? <span data-testid="settings-hydrated" /> : null}
      {me ? <PlanStatusCard me={me} /> : null}

      <Card className="rounded-2xl border p-4 shadow-sm">
        <CardHeader className="p-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">課金</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-0">
          <div className="text-xs text-muted-foreground">
            プラン変更や解約はこちらから行えます。
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link href="/settings/billing">課金設定へ</Link>
          </Button>
        </CardContent>
      </Card>

      <ProfileSettingsCard />

      <Card className="rounded-2xl border p-4 shadow-sm">
        <CardHeader className="p-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">推し管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-0">
          <Select value={selectedId} onValueChange={handleOshiSelect}>
            <SelectTrigger>
              <SelectValue placeholder="推しを選ぶ" />
            </SelectTrigger>
            <SelectContent>
              {oshis.map((oshi) => (
                <SelectItem key={oshi.id} value={String(oshi.id)}>
                  {oshi.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
            <div>
              <div className="text-sm font-medium">推しカラー</div>
              <div className="text-xs text-muted-foreground">カードのアクセントに反映</div>
            </div>
            <input
              type="color"
              value={accentHex}
              onChange={(event) => handleAccentChange(event.target.value)}
              className="h-8 w-12 cursor-pointer rounded-md border border-border bg-transparent"
              disabled={!selectedOshi}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
            <div>
              <div className="text-sm font-medium">推し画像</div>
              <div className="text-xs text-muted-foreground">ヒーローカードに反映</div>
            </div>
            {selectedOshi ? <OshiImageUpload oshiId={selectedOshi.id} label="変更" /> : null}
          </div>
        </CardContent>
      </Card>

      <CelebrationSettingsCard />

      <Card className="rounded-2xl border p-4 shadow-sm" data-testid="inventory-card">
        <CardHeader className="p-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            カスタマイズ（獲得一覧）
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-0">
          <div className="text-xs text-muted-foreground">
            ガチャなどで獲得したテーマやフレームを適用できます。
          </div>
          <div className="rounded-xl border border-border/60 p-3 text-xs">
            <div className="text-muted-foreground">現在のポイント</div>
            <div className="mt-1 text-base font-semibold" data-testid="inventory-balance">
              {typeof inventory?.balance === "number" ? inventory.balance : "—"}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">獲得テーマ</div>
            {unlockedThemes.length === 0 ? (
              <div className="rounded-xl border border-border/60 p-3 text-xs text-muted-foreground">
                まだありません。
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {unlockedThemes.map((item) => {
                  const active = themeId === (item.itemKey as ThemeId);
                  const applying = inventoryApplying === `theme:${item.itemKey}`;
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center justify-between rounded-xl border px-3 py-2",
                        active ? "border-primary bg-primary/10" : "border-border/60"
                      )}
                      data-testid="inventory-item"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{item.itemKey}</div>
                        <div className="text-[11px] text-muted-foreground">
                          rarity: {item.rarity}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={active ? "secondary" : "default"}
                        onClick={() => applyInventoryItem("theme", item.itemKey)}
                        disabled={applying}
                        data-testid="inventory-apply"
                      >
                        {active ? "適用中" : applying ? "適用中..." : "適用"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">獲得フレーム</div>
            {unlockedFrames.length === 0 ? (
              <div className="rounded-xl border border-border/60 p-3 text-xs text-muted-foreground">
                まだありません。
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {unlockedFrames.map((item) => {
                  const applying = inventoryApplying === `frame:${item.itemKey}`;
                  const frame = getFrameById(item.itemKey);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2"
                      data-testid="inventory-item"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {frame.id === "none" ? item.itemKey : frame.label}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          id: {item.itemKey} / rarity: {item.rarity}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => applyInventoryItem("frame", item.itemKey)}
                        disabled={applying}
                        data-testid="inventory-apply"
                      >
                        {applying ? "適用中..." : "適用"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border p-4 shadow-sm">
        <CardHeader className="p-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            ガチャSE
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between p-0">
          <div>
            <div className="text-sm font-medium">鈴 / 紙破れの効果音</div>
            <div className="text-xs text-muted-foreground" data-testid="gacha-sfx-state">
              {gachaSfxEnabled ? "ON" : "OFF"}
            </div>
          </div>
          <Switch
            data-testid="settings-gacha-sfx"
            checked={gachaSfxEnabled}
            onCheckedChange={handleGachaSfxChange}
          />
        </CardContent>
      </Card>

      <Card className="rounded-2xl border p-4 shadow-sm">
        <CardHeader className="p-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">テーマ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-0">
          <div className="text-xs text-muted-foreground">
            Freeは5テーマまで。Premium/Plusは10テーマから選べます。
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {visibleThemes.map((theme) => {
              const locked = isThemeLocked(theme.id, planForThemes);
              const active = themeId === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => handleThemeSelect(theme.id)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm",
                    active ? "border-primary bg-primary/10" : "border-border/60",
                    locked && "opacity-70"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      data-theme={theme.id}
                      className="h-3 w-3 rounded-full border border-white/80"
                      style={{ background: "hsl(var(--primary))" }}
                    />
                    <span className="font-medium">{theme.label}</span>
                  </div>
                  {locked ? (
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : active ? (
                    <span className="text-[10px] text-primary">適用中</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border p-4 shadow-sm">
        <CardHeader className="p-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">表示設定</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between p-0">
          <div>
            <div className="text-sm font-medium">ホームをコンパクト表示</div>
            <div className="text-xs text-muted-foreground">1画面で見やすく表示</div>
          </div>
          <Switch checked={compactHome} onCheckedChange={handleCompactHomeChange} />
        </CardContent>
      </Card>

      <Card className="rounded-2xl border p-4 shadow-sm" data-testid="settings-locale-card">
        <CardHeader className="p-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">言語</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-0">
          <div className="text-xs text-muted-foreground">表示言語を切り替えます</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {LOCALES.map((loc) => (
              <button
                key={loc.id}
                type="button"
                onClick={() => setLocale(loc.id as Locale)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-left text-sm",
                  locale === loc.id
                    ? "border-primary bg-primary/10"
                    : "border-border/60"
                )}
                data-testid={"settings-locale-" + loc.id}
              >
                <div className="font-medium">{loc.nativeName}</div>
                {locale === loc.id ? (
                  <span className="text-[10px] text-primary">適用中</span>
                ) : null}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <PlanLimitDialog
        open={themeLimitOpen}
        onOpenChange={setThemeLimitOpen}
        title="プレミアム以上のテーマです"
        description="このテーマはPremium/Plusで選べます。いまはシンプル〜サンセットの5つが使えます。"
        onPlanCompare={() => setThemeLimitOpen(false)}
        onContinue={() => setThemeLimitOpen(false)}
        continueLabel="閉じる"
        isTrialAvailable={me?.plan === "free" && !me?.trialEndsAt}
        isTrialActive={Boolean(me?.trialActive)}
      />
    </div>
  );
}
