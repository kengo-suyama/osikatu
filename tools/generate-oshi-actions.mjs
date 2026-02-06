import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const sharedPath = path.join(repoRoot, "shared", "oshi-actions-ja.json");
const legacyPath = path.join(repoRoot, "laravel", "resources", "oshi_actions_pool.json");

const args = process.argv.slice(2);
const addIndex = args.findIndex((a) => a === "--add");
const addCount = addIndex >= 0 ? Number(args[addIndex + 1]) : 500;

if (!Number.isFinite(addCount) || addCount <= 0) {
  console.error(`[ERR] invalid --add value: ${addCount}`);
  process.exit(1);
}

const sourcePath = fs.existsSync(sharedPath)
  ? sharedPath
  : fs.existsSync(legacyPath)
    ? legacyPath
    : null;

if (!sourcePath) {
  console.error(`[ERR] not found: ${sharedPath} (or legacy ${legacyPath})`);
  process.exit(1);
}

const raw = fs.readFileSync(sourcePath, "utf8");
let parsed = null;
try {
  parsed = JSON.parse(raw);
} catch (error) {
  console.error("[ERR] invalid JSON:", sourcePath);
  process.exit(1);
}

if (!Array.isArray(parsed)) {
  console.error("[ERR] JSON must be an array:", sourcePath);
  process.exit(1);
}

const existing = new Set();
const baseItems = [];
for (const item of parsed) {
  if (typeof item !== "string") continue;
  const value = item.trim();
  if (!value || existing.has(value)) continue;
  existing.add(value);
  baseItems.push(value);
}

// --- 生成素材（自然な文になるようカテゴリ分け） ---
const medias = ["曲", "MV", "ライブ映像", "ダンス動画", "配信アーカイブ", "切り抜き", "出演シーン", "インタビュー", "ラジオ", "歌枠"];
const infos = ["最新告知", "出演情報", "イベント情報", "配信予定", "グッズ情報", "コラボ情報", "公式SNS投稿", "ニュース", "プロフィール", "年表"];
const goods = ["アクスタ", "缶バッジ", "タオル", "ペンライト", "写真カード", "チェキ", "クリアファイル", "キーホルダー", "痛バ", "グッズ棚"];
const writes = ["感想", "応援メッセージ", "布教文", "紹介文", "推し語りメモ", "好きポイント", "名言メモ", "現場メモ", "予算メモ", "振り返り"];
const habits = ["水を1杯飲む", "深呼吸を3回する", "姿勢を正す（1分）", "ストレッチを3分する", "部屋を1か所だけ片付ける", "休憩を取る（3分）", "ToDoを1個だけ終わらせる", "睡眠を30分早める", "散歩を5分する", "スマホから目を離す（1分）"];

const qtyShort = ["1つ", "1回", "1行", "3分だけ", "30秒だけ", "5分以内で", "10秒だけ", "3つ"];
const verbsCheck = ["チェックする", "確認する", "見直す", "調べる", "メモする", "記録する", "保存する"];
const verbsDo = ["聴く", "見る", "読み返す", "まとめる", "整理する", "更新する", "下書きする", "用意する", "設定する", "決める"];

const templates = [
  (t) => `推しの${t}を${pick(qtyShort)}${pick(verbsDo)}`,
  (t) => `推しの${t}を${pick(qtyShort)}${pick(verbsCheck)}`,
  (t) => `推しの${t}を${pick(qtyShort)}見返す`,
  (t) => `推しの${t}を${pick(qtyShort)}スクショして保存する`,
  (t) => `推しの${t}を${pick(qtyShort)}「好きポイント」を書く`,
  (t) => `推しの${t}を${pick(qtyShort)}整理する（フォルダ/メモ）`,
  (t) => `推しの${t}を${pick(qtyShort)}カレンダーに入れる`,
  (t) => `推しの${t}を${pick(qtyShort)}共有する（身内/メモでもOK）`,
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 候補プール（カテゴリ別に“自然に”合成）
function generateCandidate() {
  const bucket = Math.floor(Math.random() * 6);
  if (bucket === 0) return templates[Math.floor(Math.random() * templates.length)](pick(medias));
  if (bucket === 1) return templates[Math.floor(Math.random() * templates.length)](pick(infos));
  if (bucket === 2) return `推しグッズ（${pick(goods)}）を${pick(qtyShort)}手入れする`;
  if (bucket === 3) return `推し活メモに${pick(writes)}を${pick(qtyShort)}書く`;
  if (bucket === 4) return `推し色のアイテムを${pick(qtyShort)}身につける`;
  return `推しを思い浮かべて${pick(habits)}`;
}

// 500件追加（重複除外）。安全のため上限トライを設ける
const newItems = [];
let tries = 0;
const maxTries = addCount * 50;

while (newItems.length < addCount && tries < maxTries) {
  tries += 1;
  const s = generateCandidate();
  if (s.length < 6) continue;
  if (existing.has(s)) continue;
  existing.add(s);
  newItems.push(s);
}

if (newItems.length !== addCount) {
  console.error(`[ERR] could not generate enough unique items: ${newItems.length}/${addCount}`);
  process.exit(1);
}

const updated = baseItems.concat(newItems);
const output = JSON.stringify(updated, null, 2) + "\n";

fs.mkdirSync(path.dirname(sharedPath), { recursive: true });
fs.writeFileSync(sharedPath, output, { encoding: "utf8" });
if (fs.existsSync(legacyPath)) {
  fs.writeFileSync(legacyPath, output, { encoding: "utf8" });
}

console.log(`[OK] added ${addCount} items`);
console.log(`[OK] total items: ${updated.length}`);
console.log("[OK] file updated:", sharedPath);
if (fs.existsSync(legacyPath)) {
  console.log("[OK] file updated:", legacyPath);
}
