"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import { meRepo } from "@/lib/repo/meRepo";

const ONBOARDING_PATH = "/onboarding/profile";

export default function OnboardingGate() {
  const pathname = usePathname();
  const router = useRouter();
  const runningRef = useRef(false);

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith(ONBOARDING_PATH)) return;
    if (runningRef.current) return;
    runningRef.current = true;

    meRepo
      .getMe()
      .then((me) => {
        if (!me.profile?.onboardingCompleted) {
          router.replace(ONBOARDING_PATH);
        }
      })
      .finally(() => {
        runningRef.current = false;
      });
  }, [pathname, router]);

  return null;
}
