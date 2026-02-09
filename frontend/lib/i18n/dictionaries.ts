import type { Locale } from "./locales";

type Dictionary = Record<string, string>;

const ja: Dictionary = {
  "language.title": "言語を選択",
  "language.description": "使用する言語を選んでください",
  "language.confirm": "決定",
  "common.next": "次へ",
  "common.back": "戻る",
  "nav.home": "ホーム",
  "nav.log": "ログ",
  "nav.money": "お金",
  "nav.schedule": "予定",
  "nav.album": "アルバム",
  "nav.settings": "設定",
};

const en: Dictionary = {
  "language.title": "Choose language",
  "language.description": "Select your preferred language",
  "language.confirm": "Confirm",
  "common.next": "Next",
  "common.back": "Back",
  "nav.home": "Home",
  "nav.log": "Log",
  "nav.money": "Money",
  "nav.schedule": "Schedule",
  "nav.album": "Album",
  "nav.settings": "Settings",
};

const ko: Dictionary = {
  "language.title": "언어 선택",
  "language.description": "사용할 언어를 선택하세요",
  "language.confirm": "확인",
  "common.next": "다음",
  "common.back": "뒤로",
  "nav.home": "홈",
  "nav.log": "로그",
  "nav.money": "가계부",
  "nav.schedule": "일정",
  "nav.album": "앨범",
  "nav.settings": "설정",
};

const es: Dictionary = {
  "language.title": "Elegir idioma",
  "language.description": "Selecciona tu idioma preferido",
  "language.confirm": "Confirmar",
  "common.next": "Siguiente",
  "common.back": "Atrás",
  "nav.home": "Inicio",
  "nav.log": "Registro",
  "nav.money": "Dinero",
  "nav.schedule": "Agenda",
  "nav.album": "Álbum",
  "nav.settings": "Ajustes",
};

const zhHant: Dictionary = {
  "language.title": "選擇語言",
  "language.description": "請選擇您偏好的語言",
  "language.confirm": "確認",
  "common.next": "下一步",
  "common.back": "返回",
  "nav.home": "首頁",
  "nav.log": "日誌",
  "nav.money": "花費",
  "nav.schedule": "行程",
  "nav.album": "相簿",
  "nav.settings": "設定",
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
