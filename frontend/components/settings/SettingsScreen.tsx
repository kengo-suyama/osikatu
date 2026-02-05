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
import { oshiRepo } from "@/lib/repo/oshiRepo";
import { loadString, saveString } from "@/lib/storage";
import type { MeDto } from "@/lib/types";
import type { Oshi } from "@/lib/uiTypes";
import { cn } from "@/lib/utils";
import {
  getVisibleThemes,
  isThemeLocked,
  type ThemeId,
} from "@/src/theme/themes";

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
  const [themeId, setThemeId] = useState<ThemeId>(() => getStoredThemeId());
  const [themeLimitOpen, setThemeLimitOpen] = useState(false);

  useEffect(() => {
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

  return (
    <div className="space-y-4">
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
