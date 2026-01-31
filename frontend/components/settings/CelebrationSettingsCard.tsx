"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  CELEBRATION_INTENSITIES,
  CELEBRATION_INTENSITY_LABELS,
  CELEBRATION_STYLE_LABELS,
  DEFAULT_CELEBRATION_PREFS,
  getCelebrationPrefs,
  getUserBirthday,
  intensityToValue,
  saveCelebrationPrefs,
  setUserBirthday,
  valueToIntensity,
} from "@/lib/celebrations";
import { EVENTS } from "@/lib/events";
import type { CelebrationPrefs } from "@/lib/types";

const dispatchCelebrationChange = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENTS.CELEBRATION_PREFS_CHANGE));
};

export default function CelebrationSettingsCard() {
  const [prefs, setPrefs] = useState<CelebrationPrefs>(DEFAULT_CELEBRATION_PREFS);
  const [birthday, setBirthday] = useState<string>("");

  useEffect(() => {
    setPrefs(getCelebrationPrefs());
    setBirthday(getUserBirthday() ?? "");
  }, []);

  const updatePrefs = (patch: Partial<CelebrationPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    saveCelebrationPrefs(next);
    dispatchCelebrationChange();
  };

  const handleBirthdayChange = (value: string) => {
    setBirthday(value);
    setUserBirthday(value ? value : null);
    dispatchCelebrationChange();
  };

  return (
    <Card className="rounded-2xl border p-4 shadow-sm">
      <CardHeader className="p-0 pb-3">
        <CardTitle className="text-sm font-semibold text-muted-foreground">
          お祝い演出
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-0">
        <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
          <div>
            <div className="text-sm font-medium">演出を有効にする</div>
            <div className="text-xs text-muted-foreground">イベント当日に自動再生</div>
          </div>
          <Switch
            checked={prefs.enabled}
            onCheckedChange={(checked) => updatePrefs({ enabled: checked })}
          />
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">スタイル</div>
          <Select
            value={prefs.style}
            onValueChange={(value) =>
              updatePrefs({ style: value as CelebrationPrefs["style"] })
            }
            disabled={!prefs.enabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="スタイルを選ぶ" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CELEBRATION_STYLE_LABELS).map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {value.label}（{value.description}）
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">派手さ</div>
            <div className="text-xs text-muted-foreground">
              {CELEBRATION_INTENSITY_LABELS[prefs.intensity]}
            </div>
          </div>
          <Slider
            min={1}
            max={4}
            step={1}
            value={[intensityToValue(prefs.intensity)]}
            onValueChange={(values) =>
              updatePrefs({ intensity: valueToIntensity(values[0]) })
            }
            disabled={!prefs.enabled}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            {CELEBRATION_INTENSITIES.map((item) => (
              <span key={item}>{CELEBRATION_INTENSITY_LABELS[item]}</span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
          <div>
            <div className="text-sm font-medium">1日1回だけ自動表示</div>
            <div className="text-xs text-muted-foreground">以後は手動ボタンで再演出</div>
          </div>
          <Switch
            checked={prefs.muteAfterShown}
            onCheckedChange={(checked) => updatePrefs({ muteAfterShown: checked })}
          />
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">あなたの誕生日</div>
          <Input
            type="date"
            value={birthday}
            onChange={(event) => handleBirthdayChange(event.target.value)}
          />
          <div className="text-xs text-muted-foreground">
            未設定なら空欄のままでOKです
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
