import type { Locale } from "./locales";

type Dictionary = Record<string, string>;

const ja: Dictionary = {
  "language.title": "言語を選択",
  "language.description": "使用する言語を選んでください",
  "language.confirm": "決定",
  "common.next": "次へ",
  "common.back": "戻る",
  "gacha.title": "封印札ガチャ",
  "gacha.open": "封印札を開く",
  "gacha.item.polaroid_elegant.name": "ポラロイド（上品）",
  "gacha.item.polaroid_elegant.desc": "上品なポラロイドフレーム",
  "gacha.item.polaroid_pop.name": "ポラロイド（ポップ）",
  "gacha.item.polaroid_pop.desc": "カラフルなポラロイドフレーム",
  "gacha.item.festival_holo.name": "祭りホログラム",
  "gacha.item.festival_holo.desc": "虹色に輝く超レアフレーム",
  "gacha.item.midnight.name": "ミッドナイト",
  "gacha.item.midnight.desc": "ダークブルーのテーマ",
  "gacha.item.neon.name": "ネオン",
  "gacha.item.neon.desc": "光るネオンカラーのテーマ",
};

const en: Dictionary = {
  "language.title": "Choose language",
  "language.description": "Select your preferred language",
  "language.confirm": "Confirm",
  "common.next": "Next",
  "common.back": "Back",
  "gacha.title": "Seal Gacha",
  "gacha.open": "Open Seal",
  "gacha.item.polaroid_elegant.name": "Polaroid (Elegant)",
  "gacha.item.polaroid_elegant.desc": "An elegant polaroid frame",
  "gacha.item.polaroid_pop.name": "Polaroid (Pop)",
  "gacha.item.polaroid_pop.desc": "A colorful polaroid frame",
  "gacha.item.festival_holo.name": "Festival Hologram",
  "gacha.item.festival_holo.desc": "A rainbow ultra-rare frame",
  "gacha.item.midnight.name": "Midnight",
  "gacha.item.midnight.desc": "Dark blue theme",
  "gacha.item.neon.name": "Neon",
  "gacha.item.neon.desc": "Glowing neon color theme",
};

const ko: Dictionary = {
  "language.title": "언어 선택",
  "language.description": "사용할 언어를 선택하세요",
  "language.confirm": "확인",
  "common.next": "다음",
  "common.back": "뒤로",
  "gacha.title": "봉인 가챠",
  "gacha.open": "봉인 열기",
  "gacha.item.polaroid_elegant.name": "폴라로이드 (우아)",
  "gacha.item.polaroid_elegant.desc": "우아한 폴라로이드 프레임",
  "gacha.item.polaroid_pop.name": "폴라로이드 (팝)",
  "gacha.item.polaroid_pop.desc": "컬러풀한 폴라로이드 프레임",
  "gacha.item.festival_holo.name": "축제 홀로그램",
  "gacha.item.festival_holo.desc": "무지개빛 초레어 프레임",
  "gacha.item.midnight.name": "미드나잇",
  "gacha.item.midnight.desc": "다크 블루 테마",
  "gacha.item.neon.name": "네온",
  "gacha.item.neon.desc": "빛나는 네온 테마",
};

const es: Dictionary = {
  "language.title": "Elegir idioma",
  "language.description": "Selecciona tu idioma preferido",
  "language.confirm": "Confirmar",
  "common.next": "Siguiente",
  "common.back": "Atrás",
  "gacha.title": "Gacha del Sello",
  "gacha.open": "Abrir sello",
  "gacha.item.polaroid_elegant.name": "Polaroid (Elegante)",
  "gacha.item.polaroid_elegant.desc": "Un marco polaroid elegante",
  "gacha.item.polaroid_pop.name": "Polaroid (Pop)",
  "gacha.item.polaroid_pop.desc": "Un marco polaroid colorido",
  "gacha.item.festival_holo.name": "Holograma Festival",
  "gacha.item.festival_holo.desc": "Marco ultrarraro arcoíris",
  "gacha.item.midnight.name": "Medianoche",
  "gacha.item.midnight.desc": "Tema azul oscuro",
  "gacha.item.neon.name": "Neón",
  "gacha.item.neon.desc": "Tema de colores neón brillantes",
};

const zhHant: Dictionary = {
  "language.title": "選擇語言",
  "language.description": "請選擇您偏好的語言",
  "language.confirm": "確認",
  "common.next": "下一步",
  "common.back": "返回",
  "gacha.title": "封印札轉蛋",
  "gacha.open": "開啟封印",
  "gacha.item.polaroid_elegant.name": "拍立得（典雅）",
  "gacha.item.polaroid_elegant.desc": "典雅的拍立得相框",
  "gacha.item.polaroid_pop.name": "拍立得（繽紛）",
  "gacha.item.polaroid_pop.desc": "繽紛的拍立得相框",
  "gacha.item.festival_holo.name": "祭典全息",
  "gacha.item.festival_holo.desc": "彩虹光超稀有相框",
  "gacha.item.midnight.name": "午夜",
  "gacha.item.midnight.desc": "深藍主題",
  "gacha.item.neon.name": "霓虹",
  "gacha.item.neon.desc": "發光霓虹色主題",
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

/** Resolve gacha item name. Falls back to the key itself for unknown items. */
export function tGachaName(itemKey: string, locale: Locale = "ja"): string {
  return t("gacha.item." + itemKey + ".name", locale);
}

/** Resolve gacha item description. Falls back to the key itself. */
export function tGachaDesc(itemKey: string, locale: Locale = "ja"): string {
  return t("gacha.item." + itemKey + ".desc", locale);
}
