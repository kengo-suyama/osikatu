"use client";

import { useEffect, useState } from "react";

type CinematicTheme = {
  id: string;
  rootClass: string;
  title: string;
  description: string;
  phases: string[];
};

const THEMES: Record<string, CinematicTheme> = {
  ja: {
    id: "ja",
    rootClass: "cinematic-onmyoji",
    title: "陰陽師の封印",
    description: "注連縄が解かれ、五芒星が輝く…",
    phases: ["封印詠唱中…", "紙垂が舞い散る…", "鈴の音が響く…", "封印札が開かれた！"],
  },
  en: {
    id: "en",
    rootClass: "cinematic-arcane",
    title: "Arcane Seal",
    description: "Rune circles glow, crystals chime…",
    phases: ["Channeling…", "Runes aligning…", "Crystal resonance…", "The seal is broken!"],
  },
  ko: {
    id: "ko",
    rootClass: "cinematic-mystic",
    title: "신비의 부적",
    description: "호부가 빛나기 시작합니다…",
    phases: ["기운을 모으는 중…", "부적이 반응합니다…", "빛이 모여듭니다…", "부적이 열렸습니다!"],
  },
  es: {
    id: "es",
    rootClass: "cinematic-festival",
    title: "Sello Festivo",
    description: "El confeti vuela, el sello se rompe…",
    phases: ["Preparando…", "Confeti cayendo…", "Energía reunida…", "El sello se abrió!"],
  },
  "zh-Hant": {
    id: "zh-Hant",
    rootClass: "cinematic-temple",
    title: "御守之封",
    description: "御守發光，朱印浮現…",
    phases: ["聚氣中…", "御守回應…", "朱印浮現…", "封印解除！"],
  },
};

type CircleGachaCinematicProps = {
  locale: string;
  onComplete: () => void;
};

export default function CircleGachaCinematic({
  locale,
  onComplete,
}: CircleGachaCinematicProps) {
  const theme = THEMES[locale] ?? THEMES.ja;
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    if (phaseIndex >= theme.phases.length) {
      const timer = setTimeout(onComplete, 600);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      setPhaseIndex((prev) => prev + 1);
    }, 800);
    return () => clearTimeout(timer);
  }, [phaseIndex, theme.phases.length, onComplete]);

  const phaseText =
    phaseIndex < theme.phases.length
      ? theme.phases[phaseIndex]
      : theme.phases[theme.phases.length - 1];

  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 py-12 ${theme.rootClass}`}
      data-testid="circle-gacha-cinematic"
    >
      <div className="text-lg font-bold">{theme.title}</div>
      <div className="text-sm text-muted-foreground">{theme.description}</div>
      <div className="mt-4 animate-pulse text-xl font-semibold">{phaseText}</div>
      <div className="mt-2 flex gap-1">
        {theme.phases.map((_, i) => (
          <div
            key={i}
            className={`h-2 w-2 rounded-full transition-colors ${
              i <= phaseIndex ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
