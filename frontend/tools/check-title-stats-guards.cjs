const fs = require("fs");
const path = require("path");

const TARGET = path.join(__dirname, "..", "lib", "titles", "titleState.ts");

const content = fs.readFileSync(TARGET, "utf8");

const requiredSnippets = [
  "sanitizeTitleStats",
  "slice(0, 2000)",
  "bestRarityEver",
  "lastEarnedDate",
  "getTitleStats",
  "updateTitleStatsOnEarn",
];

const missing = requiredSnippets.filter((snippet) => !content.includes(snippet));

if (missing.length > 0) {
  console.error(`[FAIL] Missing guard snippets: ${missing.join(", ")}`);
  process.exit(1);
}

if (content.charCodeAt(0) === 0xfeff) {
  console.error("[FAIL] BOM detected in titleState.ts");
  process.exit(1);
}

console.log("[PASS] titleState guard checks OK");
