import { isApiMode } from "@/lib/config";
import { DEFAULT_ACCENT_COLOR, hexToHslString } from "@/lib/color";
import { oshis as fallbackOshis } from "@/lib/dummy";
import { apiGet, apiSend } from "@/lib/repo/http";
import { getDeviceId } from "@/lib/device";
import { loadJson, loadString, saveJson, saveString } from "@/lib/storage";
import type {
  Anniversary,
  CustomField,
  Oshi,
  OshiLink,
  OshiProfile,
} from "@/lib/uiTypes";
import type { OshiDto } from "@/lib/types";

const OSHIS_KEY = "osikatu:oshis";
const PROFILE_KEY = (id: string | number) => `osikatu:oshi:${id}:profile`;
const IMAGE_KEY = (id: string | number) => `osikatu:oshi:${id}:image`;

const ensureArray = <T>(value?: T[] | null) => (Array.isArray(value) ? value : []);

const defaultProfile = (): OshiProfile => ({
  nickname: null,
  birthday: null,
  height_cm: null,
  weight_kg: null,
  blood_type: null,
  accent_color: null,
  origin: null,
  role: null,
  charm_point: null,
  quote: null,
  hobbies: [],
  likes: [],
  dislikes: [],
  skills: [],
  favorite_foods: [],
  weak_points: [],
  supply_tags: [],
  anniversaries: [],
  links: [],
  custom_fields: [],
  memo: null,
  image_url: null,
  image_base64: null,
  image_frame_id: null,
  updated_at: null,
});

const normalizeAccentColor = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.startsWith("#")) {
    return hexToHslString(trimmed, DEFAULT_ACCENT_COLOR);
  }
  return trimmed;
};

const normalizeProfile = (profile?: Partial<OshiProfile> | null): OshiProfile => {
  return {
    ...defaultProfile(),
    ...profile,
    accent_color: normalizeAccentColor(profile?.accent_color ?? null),
    hobbies: ensureArray(profile?.hobbies),
    likes: ensureArray(profile?.likes),
    dislikes: ensureArray(profile?.dislikes),
    skills: ensureArray(profile?.skills),
    favorite_foods: ensureArray(profile?.favorite_foods),
    weak_points: ensureArray(profile?.weak_points),
    supply_tags: ensureArray(profile?.supply_tags),
    anniversaries: ensureArray(profile?.anniversaries),
    links: ensureArray(profile?.links),
    custom_fields: ensureArray(profile?.custom_fields),
  };
};

const fromOshiDto = (dto: OshiDto): Oshi => {
  const profile: OshiProfile = normalizeProfile({
    nickname: dto.nickname,
    birthday: dto.birthday,
    height_cm: dto.heightCm,
    weight_kg: dto.weightKg,
    blood_type: dto.bloodType,
    accent_color: dto.accentColor,
    origin: dto.origin,
    role: dto.role,
    charm_point: dto.charmPoint,
    quote: dto.quote,
    hobbies: dto.hobbies ?? [],
    likes: dto.likes ?? [],
    dislikes: dto.dislikes ?? [],
    skills: dto.skills ?? [],
    favorite_foods: dto.favoriteFoods ?? [],
    weak_points: dto.weakPoints ?? [],
    supply_tags: dto.supplyTags ?? [],
    anniversaries: (dto.anniversaries ?? []) as Anniversary[],
    links: (dto.links ?? []) as OshiLink[],
    custom_fields: (dto.customFields ?? []) as CustomField[],
    memo: dto.memo,
    image_url: dto.imageUrl,
    image_base64: null,
    image_frame_id: dto.imageFrameId ?? null,
    updated_at: dto.updatedAt,
  });

  return {
    id: dto.id,
    name: dto.name ?? "推し",
    profile,
    updated_at: dto.updatedAt,
  };
};

const buildProfilePayload = (patch: Partial<OshiProfile>) => {
  const payload: Record<string, unknown> = {};
  const entries = Object.entries(patch) as [keyof OshiProfile, unknown][];
  entries.forEach(([key, value]) => {
    if (value === undefined) return;
    const camelKey = String(key).replace(/_([a-z])/g, (_, char) => char.toUpperCase());
    payload[camelKey] = value;
  });
  return payload;
};

const ensureLocalOshis = (): Oshi[] => {
  const stored = loadJson<Oshi[]>(OSHIS_KEY);
  if (stored && stored.length) {
    return stored.map((oshi) => ({
      ...oshi,
      profile: normalizeProfile(oshi.profile),
    }));
  }
  const seeded = fallbackOshis.map((oshi) => ({
    ...oshi,
    profile: normalizeProfile(oshi.profile),
  }));
  saveJson(OSHIS_KEY, seeded);
  return seeded;
};

const mergeLocalProfile = (oshi: Oshi): Oshi => {
  const storedProfile = loadJson<OshiProfile>(PROFILE_KEY(oshi.id));
  const storedImage = loadString(IMAGE_KEY(oshi.id));
  const mergedProfile = normalizeProfile({
    ...oshi.profile,
    ...storedProfile,
    image_base64: storedProfile?.image_base64 ?? storedImage ?? oshi.profile.image_base64,
  });
  return {
    ...oshi,
    profile: mergedProfile,
    updated_at: mergedProfile.updated_at ?? oshi.updated_at ?? null,
  };
};

const mergeLocalImage = (oshi: Oshi): Oshi => {
  const storedImage = loadString(IMAGE_KEY(oshi.id));
  if (!storedImage) return oshi;
  if (oshi.profile.image_url || oshi.profile.image_base64) return oshi;
  return {
    ...oshi,
    profile: {
      ...oshi.profile,
      image_base64: storedImage,
    },
  };
};

export const oshiRepo = {
  async getOshis(): Promise<Oshi[]> {
    if (isApiMode()) {
      try {
        const list = await apiGet<OshiDto[]>("/api/oshis", {
          headers: { "X-Device-Id": getDeviceId() },
        });
        return list.map((item) => mergeLocalImage(fromOshiDto(item)));
      } catch {
        return ensureLocalOshis().map((oshi) => mergeLocalProfile(oshi));
      }
    }

    return ensureLocalOshis().map((oshi) => mergeLocalProfile(oshi));
  },

  async getOshi(id: string | number): Promise<Oshi | null> {
    const list = await this.getOshis();
    return list.find((item) => String(item.id) === String(id)) ?? null;
  },

  async updateProfile(id: string | number, patch: Partial<OshiProfile>): Promise<Oshi | null> {
    if (isApiMode()) {
      const payload = buildProfilePayload(patch);
      const item = await apiSend<OshiDto>(`/api/oshis/${id}`, "PATCH", payload, {
        headers: {
          "Content-Type": "application/json",
          "X-Device-Id": getDeviceId(),
        },
      });
      return fromOshiDto(item);
    }

    const list = ensureLocalOshis();
    const target = list.find((oshi) => String(oshi.id) === String(id));
    if (!target) return null;

    const updatedProfile = normalizeProfile({
      ...target.profile,
      ...patch,
      updated_at: new Date().toISOString(),
    });
    saveJson(PROFILE_KEY(id), updatedProfile);
    const updated = { ...target, profile: updatedProfile, updated_at: updatedProfile.updated_at };

    const nextList = list.map((oshi) =>
      String(oshi.id) === String(id) ? updated : oshi
    );
    saveJson(OSHIS_KEY, nextList);
    return updated;
  },

  async uploadImage(id: string | number, file: File): Promise<Oshi | null> {
    if (isApiMode()) {
      const formData = new FormData();
      formData.append("image", file);
      const item = await apiSend<OshiDto>(`/api/oshis/${id}/image`, "POST", formData, {
        headers: { "X-Device-Id": getDeviceId() },
      });
      return fromOshiDto(item);
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("failed to read file"));
      reader.readAsDataURL(file);
    });
    saveString(IMAGE_KEY(id), dataUrl);
    return this.updateProfile(id, { image_base64: dataUrl });
  },
};
