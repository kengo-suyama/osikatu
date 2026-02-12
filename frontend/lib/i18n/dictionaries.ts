import type { Locale } from "./locales";

type Dictionary = Record<string, string>;

const ja: Dictionary = {
  "language.title": "言語を選択",
  "language.description": "使用する言語を選んでください",
  "language.confirm": "決定",
  "common.next": "次へ",
  "common.back": "戻る",
  "share.title": "みんなにシェア",
  "share.description": "SNSで推し活仲間を増やそう",
  "share.copied": "コピーしました",
  "share.points_awarded": "+5P ゲット！",
  "share.already_awarded": "本日のシェア報酬は受取済み",
  "share.template": "推し活をもっと楽しく！仲間と推しの情報を共有しよう\nhttps://osikatu.app\n#推し活 #拡散希望",
};

const en: Dictionary = {
  "language.title": "Choose language",
  "language.description": "Select your preferred language",
  "language.confirm": "Confirm",
  "common.next": "Next",
  "common.back": "Back",
  "share.title": "Share with friends",
  "share.description": "Grow your fan community on social media",
  "share.copied": "Copied!",
  "share.points_awarded": "+5P earned!",
  "share.already_awarded": "Today's share reward already claimed",
  "share.template": "Make oshi-katsu more fun! Share and discover with fellow fans\nhttps://osikatu.app\n#oshikatsu",
};

const ko: Dictionary = {
  "language.title": "언어 선택",
  "language.description": "사용할 언어를 선택하세요",
  "language.confirm": "확인",
  "common.next": "다음",
  "common.back": "뒤로",
  "share.title": "친구에게 공유",
  "share.description": "SNS에서 팬 커뮤니티를 키워보세요",
  "share.copied": "복사되었습니다!",
  "share.points_awarded": "+5P 획득!",
  "share.already_awarded": "오늘의 공유 보상은 이미 받았습니다",
  "share.template": "덕질을 더 즐겁게! 함께 최애 정보를 공유하자\nhttps://osikatu.app\n#덕질",
};

const es: Dictionary = {
  "language.title": "Elegir idioma",
  "language.description": "Selecciona tu idioma preferido",
  "language.confirm": "Confirmar",
  "common.next": "Siguiente",
  "common.back": "Atrás",
  "share.title": "Compartir",
  "share.description": "Haz crecer tu comunidad fan en redes sociales",
  "share.copied": "Copiado!",
  "share.points_awarded": "+5P ganados!",
  "share.already_awarded": "La recompensa de hoy ya fue reclamada",
  "share.template": "Haz tu oshi-katsu mas divertido! Comparte y descubre con otros fans\nhttps://osikatu.app\n#oshikatsu",
};

const zhHant: Dictionary = {
  "language.title": "選擇語言",
  "language.description": "請選擇您偏好的語言",
  "language.confirm": "確認",
  "common.next": "下一步",
  "common.back": "返回",
  "share.title": "分享給朋友",
  "share.description": "在社群媒體上擴展您的推活社群",
  "share.copied": "已複製！",
  "share.points_awarded": "+5P 獲得！",
  "share.already_awarded": "今日的分享獎勵已領取",
  "share.template": "讓推活更有趣！與同好分享推的資訊\nhttps://osikatu.app\n#推活",
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
