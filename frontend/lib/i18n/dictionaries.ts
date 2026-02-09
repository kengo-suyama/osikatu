import type { Locale } from "./locales";

type Dictionary = Record<string, string>;

const ja: Dictionary = {
  "language.title": "言語を選択",
  "language.description": "使用する言語を選んでください",
  "language.confirm": "決定",
  "common.next": "次へ",
  "common.back": "戻る",
};

const en: Dictionary = {
  "language.title": "Choose language",
  "language.description": "Select your preferred language",
  "language.confirm": "Confirm",
  "common.next": "Next",
  "common.back": "Back",
};

const ko: Dictionary = {
  "language.title": "언어 선택",
  "language.description": "사용할 언어를 선택하세요",
  "language.confirm": "확인",
  "common.next": "다음",
  "common.back": "뒤로",
};

const es: Dictionary = {
  "language.title": "Elegir idioma",
  "language.description": "Selecciona tu idioma preferido",
  "language.confirm": "Confirmar",
  "common.next": "Siguiente",
  "common.back": "Atrás",
};

const zhHant: Dictionary = {
  "language.title": "選擇語言",
  "language.description": "請選擇您偏好的語言",
  "language.confirm": "確認",
  "common.next": "下一步",
  "common.back": "返回",
};

const DICTS: Record<Locale, Dictionary> = {
  ja,
  en,
  ko,
  es,
  "zh-Hant": zhHant,
};

export function t(key: string, locale: Locale = "ja"): string {
  return DICTS[locale]?.[key] ?? DICTS.ja[key] ?? key;
}
