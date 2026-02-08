import { isApiMode } from "@/lib/config";
import { apiGet, apiSend } from "@/lib/repo/http";
import { getDeviceId } from "@/lib/device";
import { loadJson, saveJson } from "@/lib/storage";
import type { MeDto, Plan, PlanStatusDto } from "@/lib/types";

const ME_KEY = "osikatu:me";

const updateLocalMe = (plan: Plan, planStatus: PlanStatusDto["planStatus"]) => {
  const stored = loadJson<MeDto>(ME_KEY);
  if (!stored) return;
  const next = {
    ...stored,
    plan,
    planStatus,
    effectivePlan: plan,
  };
  saveJson(ME_KEY, next);
};

export const billingRepo = {
  async getPlan(): Promise<PlanStatusDto> {
    if (!isApiMode()) {
      const stored = loadJson<MeDto>(ME_KEY);
      return {
        plan: stored?.plan ?? "free",
        planStatus: stored?.planStatus ?? "active",
        trialEndsAt: stored?.trialEndsAt ?? null,
      };
    }

    return apiGet<PlanStatusDto>("/api/me/plan", {
      headers: { "X-Device-Id": getDeviceId() },
    });
  },

  async updatePlan(plan: Plan): Promise<PlanStatusDto> {
    if (!isApiMode()) {
      updateLocalMe(plan, "active");
      const stored = loadJson<MeDto>(ME_KEY);
      return {
        plan,
        planStatus: "active",
        trialEndsAt: stored?.trialEndsAt ?? null,
      };
    }

    return apiSend<PlanStatusDto>(
      "/api/me/plan",
      "PUT",
      { plan },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Device-Id": getDeviceId(),
        },
      }
    );
  },

  async cancelPlan(): Promise<PlanStatusDto> {
    if (!isApiMode()) {
      updateLocalMe("free", "canceled");
      const stored = loadJson<MeDto>(ME_KEY);
      return {
        plan: "free",
        planStatus: "canceled",
        trialEndsAt: stored?.trialEndsAt ?? null,
      };
    }

    return apiSend<PlanStatusDto>("/api/me/cancel", "POST", null, {
      headers: { "X-Device-Id": getDeviceId() },
    });
  },

  async createCheckoutUrl(): Promise<string> {
    if (!isApiMode()) {
      await this.updatePlan("plus");
      return "/home";
    }

    const res = await apiSend<{ url: string }>("/api/billing/checkout", "POST", null);
    return res.url;
  },

  async createPortalUrl(): Promise<string> {
    if (!isApiMode()) {
      return "/settings/billing";
    }

    const res = await apiGet<{ url: string }>("/api/billing/portal");
    return res.url;
  },
};
