"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { meRepo } from "@/lib/repo/meRepo";
import { PREFECTURES } from "@/lib/prefectures";
import type { MeDto, MeProfileDto } from "@/lib/types";

type ProfileFormProps = {
  submitLabel?: string;
  onSaved?: (profile: MeProfileDto) => void;
};

export default function ProfileForm({ submitLabel, onSaved }: ProfileFormProps) {
  const [me, setMe] = useState<MeDto | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [prefectureCode, setPrefectureCode] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    meRepo
      .getMe()
      .then((data) => {
        if (!active) return;
        setMe(data);
        setDisplayName(data.profile?.displayName ?? "");
        setBio(data.profile?.bio ?? "");
        setPrefectureCode(
          data.profile?.prefectureCode ? String(data.profile.prefectureCode) : ""
        );
      })
      .catch(() => {
        if (!active) return;
        setMe(null);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const avatarUrl = previewUrl ?? me?.profile?.avatarUrl ?? null;
  const prefectureValue = prefectureCode || "none";

  const handlePickAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = displayName.trim();
    if (trimmed.length < 2) {
      setError("表示名は2文字以上で入力してください。");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const updated = await meRepo.updateProfile({
        displayName: trimmed,
        bio: bio.trim() ? bio.trim() : "",
        prefectureCode: prefectureCode ? Number(prefectureCode) : null,
        avatarFile,
      });
      setMe(updated);
      setAvatarFile(null);
      setPreviewUrl(null);
      onSaved?.(
        updated.profile ?? {
          displayName: trimmed,
          avatarUrl,
          bio: bio.trim() ? bio.trim() : null,
          prefectureCode: prefectureCode ? Number(prefectureCode) : null,
          onboardingCompleted: true,
        }
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 overflow-hidden rounded-full border border-border bg-muted">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              No Image
            </div>
          )}
        </div>
        <div className="space-y-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handlePickAvatar}
            className="hidden"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 gap-1 rounded-full px-3 text-[11px]"
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="h-3.5 w-3.5" />
            アイコンを選ぶ
          </Button>
          <p className="text-xs text-muted-foreground">任意（5MBまで）</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          表示名 <span className="text-rose-500">*</span>
        </label>
        <Input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="例：あおい"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">ひとこと</label>
        <Textarea
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          placeholder="推し活メモを一言で"
          maxLength={160}
        />
        <div className="text-right text-xs text-muted-foreground">{bio.length}/160</div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">都道府県（任意）</label>
        <Select
          value={prefectureValue}
          onValueChange={(value) => setPrefectureCode(value === "none" ? "" : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="選択しない" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">選択しない</SelectItem>
            {PREFECTURES.map((pref) => (
              <SelectItem key={pref.code} value={String(pref.code)}>
                {pref.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? <div className="text-sm text-rose-500">{error}</div> : null}

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "保存中..." : submitLabel ?? "保存する"}
      </Button>
    </form>
  );
}
