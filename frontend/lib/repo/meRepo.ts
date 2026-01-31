import { isApiMode } from "@/lib/config";
import { apiGet } from "@/lib/repo/http";
import { loadJson, saveJson } from "@/lib/storage";
import { getDeviceId } from "@/lib/device";
import type { MeDto, Plan } from "@/lib/types";

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

const normalizeMe = (value: MeDto): MeDto => {
  const plan = value.plan ?? "free";
  const trialEndsAt = value.trialEndsAt ?? null;
  return {
    ...value,
    plan,
    trialEndsAt,
    effectivePlan: resolveEffectivePlan(plan, trialEndsAt),
  };
};

const defaultMe = (): MeDto => {
  const seed: MeDto = {
    id: 1,
    name: "Me",
    email: "me@example.com",
    plan: "free",
    effectivePlan: "free",
    trialEndsAt: null,
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
        return normalized;
      } catch {
        return ensureLocalMe();
      }
    }

    return ensureLocalMe();
  },
};
