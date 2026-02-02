export type TitleTag =
  | "health"
  | "selfcare"
  | "organize"
  | "cleanup"
  | "record"
  | "writing"
  | "music"
  | "watch"
  | "money"
  | "study"
  | "creative"
  | "social"
  | "memory"
  | "home"
  | "care"
  | "joy";

type Rule = { tag: TitleTag; keywords: string[] };

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[！!？?。．,，・]/g, "");

const RULES: Rule[] = [
  {
    tag: "health",
    keywords: ["散歩", "ストレッチ", "深呼吸", "姿勢", "睡眠", "休憩", "水"],
  },
  {
    tag: "selfcare",
    keywords: ["水を", "身だしなみ", "整える", "深呼吸", "姿勢", "睡眠"],
  },
  {
    tag: "organize",
    keywords: ["整理", "片付け", "配置", "チェックリスト", "持ち物", "リスト"],
  },
  {
    tag: "cleanup",
    keywords: ["掃除", "拭く", "手入れ", "フォルダ", "片付け", "整理"],
  },
  {
    tag: "record",
    keywords: ["メモ", "転記", "更新", "分類", "言語化", "振り返る", "記録"],
  },
  { tag: "writing", keywords: ["書く", "下書き", "原稿", "文章", "手紙", "一文"] },
  { tag: "music", keywords: ["曲", "bgm", "聴く", "音", "配信予定"] },
  { tag: "watch", keywords: ["見る", "動画", "配信", "投稿を見", "チェック"] },
  {
    tag: "money",
    keywords: ["予算", "支出", "見直す", "交通", "宿", "費用", "出費"],
  },
  {
    tag: "study",
    keywords: ["調べる", "復習", "年表", "背景", "インタビュー", "調査"],
  },
  {
    tag: "creative",
    keywords: ["描く", "イメージカラー", "俳句", "詩", "ストーリー", "漫画", "アート"],
  },
  {
    tag: "social",
    keywords: ["コメント", "送る", "リポスト", "いいね", "感想", "保存", "ブクマ"],
  },
  { tag: "memory", keywords: ["思い出す", "数える", "振り返る", "思い出"] },
  { tag: "home", keywords: ["部屋", "壁紙", "小物", "グッズ", "痛バ", "片付け"] },
  { tag: "care", keywords: ["会う日", "睡眠", "姿勢を正す", "水を", "休憩"] },
  { tag: "joy", keywords: ["ありがとう", "尊い", "楽しい", "嬉しい", "幸せ"] },
];

export function inferTagsFromAction(text: string): TitleTag[] {
  if (!text) return [];
  const normalized = normalizeText(text);
  const hits: TitleTag[] = [];
  for (const rule of RULES) {
    if (
      rule.keywords.some((keyword) => normalized.includes(normalizeText(keyword)))
    ) {
      hits.push(rule.tag);
    }
  }
  return Array.from(new Set(hits)).slice(0, 3);
}
