import { isApiMode } from "@/lib/config";
import { apiGet, apiSend } from "@/lib/repo/http";
import { loadJson, saveJson } from "@/lib/storage";
import { getDeviceId } from "@/lib/device";
import type { MeDto, MeProfileDto, Plan } from "@/lib/types";
import {
  getStoredSpecialBgEnabled,
  getStoredThemeId,
  syncUiSettingsFromMe,
} from "@/lib/theme/uiTheme";

const ME_KEY = "osikatu:me";

const resolveEffectivePlan = (plan: Plan, trialEndsAt: string | null): Plan => {
  if (plan === "free" && trialEndsAt) {
    const trialDate = new Date(trialEndsAt);
    if (!Number.isNaN(trialDate.getTime()) && trialDate.getTime() > Date.now()) {
      return "premium";
    }
  }
  return plan;
};

const normalizeProfile = (profile?: MeProfileDto | null): MeProfileDto => ({
  displayName: profile?.displayName ?? null,
  avatarUrl: profile?.avatarUrl ?? null,
  bio: profile?.bio ?? null,
  prefectureCode:
    typeof profile?.prefectureCode === "number" ? profile.prefectureCode : null,
  onboardingCompleted: Boolean(profile?.onboardingCompleted),
});

const normalizeMe = (value: MeDto): MeDto => {
  const plan = value.plan ?? "free";
  const planStatus = value.planStatus ?? "active";
  const trialEndsAt = value.trialEndsAt ?? null;
  const themeId = value.ui?.themeId ?? getStoredThemeId();
  const specialBgEnabled =
    typeof value.ui?.specialBgEnabled === "boolean"
      ? value.ui.specialBgEnabled
      : getStoredSpecialBgEnabled();
  return {
    ...value,
    plan,
    planStatus,
    trialEndsAt,
    effectivePlan: resolveEffectivePlan(plan, trialEndsAt),
    profile: normalizeProfile(value.profile),
    ui: {
      themeId,
      specialBgEnabled,
    },
  };
};

const defaultMe = (): MeDto => {
  const seed: MeDto = {
    id: 1,
    name: "Me",
    email: "me@example.com",
    plan: "free",
    planStatus: "active",
    effectivePlan: "free",
    trialEndsAt: null,
    profile: normalizeProfile(null),
    ui: {
      themeId: getStoredThemeId(),
      specialBgEnabled: getStoredSpecialBgEnabled(),
    },
  };
  return normalizeMe(seed);
};

const ensureLocalMe = (): MeDto => {
  const stored = loadJson<MeDto>(ME_KEY);
  if (stored) return normalizeMe(stored);
  const seeded = defaultMe();
  saveJson(ME_KEY, seeded);
  return seeded;
};

export const meRepo = {
  async getMe(): Promise<MeDto> {
    if (isApiMode()) {
      try {
        const me = await apiGet<MeDto>("/api/me", {
          headers: { "X-Device-Id": getDeviceId() },
        });
        const normalized = normalizeMe(me);
        saveJson(ME_KEY, normalized);
        syncUiSettingsFromMe(normalized);
        return normalized;
      } catch {
        return ensureLocalMe();
      }
    }

    return ensureLocalMe();
  },

  async updateUiSettings(payload: {
    themeId?: string | null;
    specialBgEnabled?: boolean;
  }): Promise<MeDto> {
    const current = ensureLocalMe();
    if (isApiMode()) {
      try {
        const updatedUi = await apiSend<MeDto["ui"]>(
          "/api/me/ui-settings",
          "PUT",
          payload,
          {
            headers: {
              "Content-Type": "application/json",
              "X-Device-Id": getDeviceId(),
            },
          }
        );
        const merged = normalizeMe({
          ...current,
          ui: {
            ...current.ui,
            ...updatedUi,
          },
        });
        saveJson(ME_KEY, merged);
        syncUiSettingsFromMe(merged);
        return merged;
      } catch {
        return current;
      }
    }

    const merged = normalizeMe({
      ...current,
      ui: {
        ...current.ui,
        ...payload,
      },
    });
    saveJson(ME_KEY, merged);
    syncUiSettingsFromMe(merged);
    return merged;
  },

  async updateProfile(payload: {
    displayName: string;
    bio?: string | null;
    prefectureCode?: number | null;
    avatarFile?: File | null;
  }): Promise<MeDto> {
    const current = ensureLocalMe();

    if (isApiMode()) {
      try {
        const formData = new FormData();
        formData.append("displayName", payload.displayName);
        if (payload.bio !== undefined) {
          formData.append("bio", payload.bio ?? "");
        }
        if (payload.prefectureCode !== undefined) {
          formData.append(
            "prefectureCode",
            payload.prefectureCode === null ? "" : String(payload.prefectureCode)
          );
        }
        if (payload.avatarFile) {
          formData.append("avatar", payload.avatarFile);
        }

        const updatedProfile = await apiSend<MeProfileDto>(
          "/api/me/profile",
          "PUT",
          formData,
          {
            headers: { "X-Device-Id": getDeviceId() },
          }
        );

        const merged = normalizeMe({
          ...current,
          profile: {
            ...current.profile,
            ...updatedProfile,
          },
        });
        saveJson(ME_KEY, merged);
        return merged;
      } catch {
        return current;
      }
    }

    const avatarUrl = await (async () => {
      if (!payload.avatarFile) return current.profile?.avatarUrl ?? null;
      return await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => resolve(current.profile?.avatarUrl ?? null);
        reader.readAsDataURL(payload.avatarFile);
      });
    })();

    const normalizedBio = payload.bio ? payload.bio : null;
    const merged = normalizeMe({
      ...current,
      profile: {
        displayName: payload.displayName,
        bio: normalizedBio,
        prefectureCode: payload.prefectureCode ?? null,
        avatarUrl,
        onboardingCompleted: true,
      },
    });
    saveJson(ME_KEY, merged);
    return merged;
  },

  async skipOnboarding(): Promise<MeDto> {
    const current = ensureLocalMe();

    if (isApiMode()) {
      try {
        const profile = await apiSend<MeProfileDto>("/api/me/onboarding/skip", "POST", null, {
          headers: { "X-Device-Id": getDeviceId() },
        });
        const merged = normalizeMe({
          ...current,
          profile: {
            ...current.profile,
            ...profile,
          },
        });
        saveJson(ME_KEY, merged);
        return merged;
      } catch {
        return current;
      }
    }

    const merged = normalizeMe({
      ...current,
      profile: {
        ...current.profile,
        onboardingCompleted: true,
      },
    });
    saveJson(ME_KEY, merged);
    return merged;
  },
};
