"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { ImageUp, Save } from "lucide-react";

import AnniversaryListEditor from "@/components/oshi/AnniversaryListEditor";
import CustomFieldsEditor from "@/components/oshi/CustomFieldsEditor";
import LinksEditor from "@/components/oshi/LinksEditor";
import TagInput from "@/components/ui/tag-input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EVENTS } from "@/lib/events";
import { formatBirthdayCountdown, getDaysUntilNextBirthday } from "@/lib/birthday";
import { DEFAULT_ACCENT_COLOR, hexToHslString, hslStringToHex } from "@/lib/color";
import { oshiRepo } from "@/lib/repo/oshiRepo";
import type { Oshi, OshiProfile } from "@/lib/uiTypes";

const normalizeAccentColor = (value?: string | null) => {
  if (!value) return DEFAULT_ACCENT_COLOR;
  const trimmed = value.trim();
  if (trimmed.startsWith("#")) {
    return hexToHslString(trimmed, DEFAULT_ACCENT_COLOR);
  }
  return trimmed;
};

const ensureProfile = (profile?: OshiProfile): OshiProfile => ({
  nickname: profile?.nickname ?? "",
  birthday: profile?.birthday ?? "",
  height_cm: profile?.height_cm ?? null,
  weight_kg: profile?.weight_kg ?? null,
  blood_type: profile?.blood_type ?? "",
  accent_color: normalizeAccentColor(profile?.accent_color),
  origin: profile?.origin ?? "",
  role: profile?.role ?? "",
  charm_point: profile?.charm_point ?? "",
  quote: profile?.quote ?? "",
  hobbies: profile?.hobbies ?? [],
  likes: profile?.likes ?? [],
  dislikes: profile?.dislikes ?? [],
  skills: profile?.skills ?? [],
  favorite_foods: profile?.favorite_foods ?? [],
  weak_points: profile?.weak_points ?? [],
  supply_tags: profile?.supply_tags ?? [],
  anniversaries: profile?.anniversaries ?? [],
  links: profile?.links ?? [],
  custom_fields: profile?.custom_fields ?? [],
  memo: profile?.memo ?? "",
  image_url: profile?.image_url ?? null,
  image_base64: profile?.image_base64 ?? null,
  updated_at: profile?.updated_at ?? null,
});

export default function OshiProfileForm({
  oshi,
  onSaved,
}: {
  oshi: Oshi;
  onSaved?: (oshi: Oshi) => void;
}) {
  const [form, setForm] = useState<OshiProfile>(() => ensureProfile(oshi.profile));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [accentHex, setAccentHex] = useState(() =>
    hslStringToHex(normalizeAccentColor(oshi.profile.accent_color), "#f472b6")
  );

  useEffect(() => {
    setForm(ensureProfile(oshi.profile));
    setAccentHex(hslStringToHex(normalizeAccentColor(oshi.profile.accent_color), "#f472b6"));
  }, [oshi]);

  const countdownLabel = useMemo(() => {
    const days = getDaysUntilNextBirthday(form.birthday || null);
    return formatBirthdayCountdown(days);
  }, [form.birthday]);

  const updateField = <K extends keyof OshiProfile>(key: K, value: OshiProfile[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { image_base64: _imageBase64, image_url: _imageUrl, updated_at: _updatedAt, ...rest } =
        form;
      const updated = await oshiRepo.updateProfile(oshi.id, {
        ...rest,
        height_cm: form.height_cm || null,
        weight_kg: form.weight_kg || null,
      });
      if (updated) {
        onSaved?.(updated);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(EVENTS.OSHI_PROFILE_CHANGE, { detail: { oshiId: oshi.id } })
          );
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const updated = await oshiRepo.uploadImage(oshi.id, file);
      if (updated) {
        setForm(ensureProfile(updated.profile));
        onSaved?.(updated);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(EVENTS.OSHI_PROFILE_CHANGE, { detail: { oshiId: oshi.id } })
          );
        }
      }
    } finally {
      setUploading(false);
    }
  };

  const imagePreview = form.image_base64 ?? form.image_url ?? null;

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border p-4 shadow-sm">
        <div className="space-y-2">
          <div className="text-sm font-semibold text-muted-foreground">画像アップロード</div>
          {imagePreview ? (
            <div className="h-36 w-full overflow-hidden rounded-xl border" data-testid="oshi-photo-preview">
              <img src={imagePreview} alt="推し画像" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="flex h-36 items-center justify-center rounded-xl border bg-muted text-sm text-muted-foreground">
              画像が未設定です
            </div>
          )}
          <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-2 text-sm text-muted-foreground" data-testid="oshi-photo-save">
            <ImageUp className="h-4 w-4" />
            {uploading ? "アップロード中..." : "画像を選択"}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} data-testid="oshi-photo-input" />
          </label>
        </div>
      </Card>

      <Card className="rounded-2xl border p-4 shadow-sm">
        <div className="space-y-3">
          <div className="text-sm font-semibold text-muted-foreground">基本情報</div>
          <Input
            placeholder="愛称"
            value={form.nickname ?? ""}
            onChange={(event) => updateField("nickname", event.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={form.birthday ?? ""}
              onChange={(event) => updateField("birthday", event.target.value)}
            />
            <Input value={countdownLabel} readOnly />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="身長 (cm)"
              type="number"
              value={form.height_cm ?? ""}
              onChange={(event) =>
                updateField("height_cm", event.target.value ? Number(event.target.value) : null)
              }
            />
            <Input
              placeholder="体重 (kg)"
              type="number"
              value={form.weight_kg ?? ""}
              onChange={(event) =>
                updateField("weight_kg", event.target.value ? Number(event.target.value) : null)
              }
            />
          </div>
          <Input
            placeholder="血液型"
            value={form.blood_type ?? ""}
            onChange={(event) => updateField("blood_type", event.target.value)}
          />
          <Input
            placeholder="出身地/活動拠点"
            value={form.origin ?? ""}
            onChange={(event) => updateField("origin", event.target.value)}
          />
          <Input
            placeholder="役職/属性"
            value={form.role ?? ""}
            onChange={(event) => updateField("role", event.target.value)}
          />
          <Input
            placeholder="チャームポイント"
            value={form.charm_point ?? ""}
            onChange={(event) => updateField("charm_point", event.target.value)}
          />
          <Input
            placeholder="口癖/名言"
            value={form.quote ?? ""}
            onChange={(event) => updateField("quote", event.target.value)}
          />
          <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
            <div>
              <div className="text-sm font-medium">推しカラー</div>
              <div className="text-xs text-muted-foreground">アクセントに反映</div>
            </div>
            <input
              type="color"
              value={accentHex}
              onChange={(event) => {
                setAccentHex(event.target.value);
                updateField("accent_color", hexToHslString(event.target.value, DEFAULT_ACCENT_COLOR));
              }}
              className="h-8 w-12 cursor-pointer rounded-md border border-border bg-transparent"
            />
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl border p-4 shadow-sm">
        <div className="space-y-3">
          <div className="text-sm font-semibold text-muted-foreground">タグ</div>
          <TagInput
            value={form.hobbies}
            onChange={(value) => updateField("hobbies", value)}
            placeholder="趣味を追加"
          />
          <TagInput
            value={form.likes}
            onChange={(value) => updateField("likes", value)}
            placeholder="好きなもの"
          />
          <TagInput
            value={form.dislikes}
            onChange={(value) => updateField("dislikes", value)}
            placeholder="苦手なもの"
          />
          <TagInput
            value={form.skills}
            onChange={(value) => updateField("skills", value)}
            placeholder="特技"
          />
          <TagInput
            value={form.favorite_foods}
            onChange={(value) => updateField("favorite_foods", value)}
            placeholder="好きな食べ物/飲み物"
          />
          <TagInput
            value={form.weak_points}
            onChange={(value) => updateField("weak_points", value)}
            placeholder="弱点"
          />
          <TagInput
            value={form.supply_tags}
            onChange={(value) => updateField("supply_tags", value)}
            placeholder="供給タグ"
          />
        </div>
      </Card>

      <Card className="rounded-2xl border p-4 shadow-sm">
        <div className="space-y-3">
          <div className="text-sm font-semibold text-muted-foreground">記念日</div>
          <AnniversaryListEditor
            value={form.anniversaries}
            onChange={(value) => updateField("anniversaries", value)}
          />
        </div>
      </Card>

      <Card className="rounded-2xl border p-4 shadow-sm">
        <div className="space-y-3">
          <div className="text-sm font-semibold text-muted-foreground">リンク</div>
          <LinksEditor
            value={form.links}
            onChange={(value) => updateField("links", value)}
          />
        </div>
      </Card>

      <Card className="rounded-2xl border p-4 shadow-sm">
        <div className="space-y-3">
          <div className="text-sm font-semibold text-muted-foreground">カスタム項目</div>
          <CustomFieldsEditor
            value={form.custom_fields}
            onChange={(value) => updateField("custom_fields", value)}
          />
        </div>
      </Card>

      <Card className="rounded-2xl border p-4 shadow-sm">
        <div className="space-y-3">
          <div className="text-sm font-semibold text-muted-foreground">メモ</div>
          <Textarea
            placeholder="メモ"
            rows={4}
            value={form.memo ?? ""}
            onChange={(event) => updateField("memo", event.target.value)}
          />
        </div>
      </Card>

      <Button className="w-full" onClick={handleSave} disabled={saving}>
        <Save className="mr-2 h-4 w-4" />
        {saving ? "保存中..." : "保存する"}
      </Button>
    </div>
  );
}
