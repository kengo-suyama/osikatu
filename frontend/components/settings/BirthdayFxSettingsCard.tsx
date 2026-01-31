"use client";

import { useEffect, useState } from "react";

import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BIRTHDAY_FX_LABELS,
  getBirthdayFxEnabled,
  getBirthdayFxTheme,
  setBirthdayFxEnabled,
  setBirthdayFxTheme,
  type BirthdayFxTheme,
} from "@/lib/birthdayFx";
import { EVENTS } from "@/lib/events";

const THEMES: BirthdayFxTheme[] = ["elegant", "idol", "cute"];

export default function BirthdayFxSettingsCard() {
  const [enabled, setEnabled] = useState(true);
  const [theme, setTheme] = useState<BirthdayFxTheme>("elegant");

  useEffect(() => {
    setEnabled(getBirthdayFxEnabled());
    setTheme(getBirthdayFxTheme());
  }, []);

  const emitChange = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENTS.BIRTHDAY_FX_CHANGE));
    }
  };

  const handleEnabledChange = (checked: boolean) => {
    setEnabled(checked);
    setBirthdayFxEnabled(checked);
    emitChange();
  };

  const handleThemeChange = (value: BirthdayFxTheme) => {
    setTheme(value);
    setBirthdayFxTheme(value);
    emitChange();
  };

  return (
    <Card className="rounded-2xl border p-4 shadow-sm">
      <CardHeader className="p-0 pb-3">
        <CardTitle className="text-sm font-semibold text-muted-foreground">
          誕生日演出
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">誕生日演出を有効化</div>
            <div className="text-xs text-muted-foreground">
              当日だけ豪華、直前は控えめに表示
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={handleEnabledChange} />
        </div>

        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">テーマ</div>
          <Select value={theme} onValueChange={(value) => handleThemeChange(value as BirthdayFxTheme)}>
            <SelectTrigger>
              <SelectValue placeholder="テーマを選ぶ" />
            </SelectTrigger>
            <SelectContent>
              {THEMES.map((item) => (
                <SelectItem key={item} value={item}>
                  {BIRTHDAY_FX_LABELS[item].label}（{BIRTHDAY_FX_LABELS[item].description}）
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
