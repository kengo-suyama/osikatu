const fs = require("fs");
const path = require("path");

const INPUT_PATH = path.join(
  __dirname,
  "..",
  "lib",
  "titles",
  "titles_ja_1000_universal.ts"
);

const EXPECTED_COUNT = 1000;
const KNOWN_TAGS = new Set([
  "health",
  "selfcare",
  "music",
  "organize",
  "cleanup",
  "money",
  "record",
  "writing",
  "study",
  "watch",
  "creative",
  "social",
  "joy",
  "home",
  "care",
  "memory",
  "domain:daily",
  "domain:balance",
  "domain:oshi",
  "domain:life",
]);

const fail = (message) => {
  console.error(`[titles:check][ERROR] ${message}`);
  process.exit(1);
};

const buffer = fs.readFileSync(INPUT_PATH);
if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
  fail("BOM detected in titles_ja_1000_universal.ts");
}

const content = buffer.toString("utf8");
if (content.charCodeAt(0) === 0xfeff) {
  fail("BOM detected in titles_ja_1000_universal.ts");
}

const rarityMatch = content.match(/export\s+type\s+TitleRarity\s*=\s*([^;]+);/);
const allowedRarities = new Set(
  rarityMatch
    ? Array.from(rarityMatch[1].matchAll(/"([^"]+)"/g)).map((match) => match[1])
    : ["common", "rare", "epic", "legendary"]
);

const exportIndex = content.indexOf("export const TITLES_JA_1000_UNIVERSAL");
if (exportIndex === -1) {
  fail("Titles export not found");
}
const arrayStart = content.indexOf("[", exportIndex);
const arrayEnd = content.indexOf("];", arrayStart);
if (arrayStart === -1 || arrayEnd === -1) {
  fail("Could not locate titles array literal");
}
const arrayLiteral = content.slice(arrayStart, arrayEnd + 1);

let titles;
try {
  titles = new Function(`"use strict"; return (${arrayLiteral});`)();
} catch (error) {
  fail(`Failed to parse titles file: ${error instanceof Error ? error.message : String(error)}`);
}

if (!Array.isArray(titles)) {
  fail("Titles export is not an array");
}

if (titles.length !== EXPECTED_COUNT) {
  fail(`Expected ${EXPECTED_COUNT} titles, got ${titles.length}`);
}

const seenTitles = new Set();
const duplicateTitles = new Set();
const unknownTagCounts = new Map();

titles.forEach((entry, index) => {
  if (!entry || typeof entry !== "object") {
    fail(`Title entry at index ${index} is not an object`);
  }

  if (typeof entry.title !== "string" || entry.title.trim() === "") {
    fail(`Title entry at index ${index} has invalid title`);
  }

  if (seenTitles.has(entry.title)) {
    duplicateTitles.add(entry.title);
  }
  seenTitles.add(entry.title);

  if (!Array.isArray(entry.tags) || entry.tags.length === 0) {
    fail(`Title ${entry.id} has empty tags`);
  }
  if (!entry.tags.every((tag) => typeof tag === "string" && tag.trim() !== "")) {
    fail(`Title ${entry.id} has invalid tag value`);
  }

  if (!allowedRarities.has(entry.rarity)) {
    fail(`Title ${entry.id} has invalid rarity: ${String(entry.rarity)}`);
  }

  const unknownTags = entry.tags.filter((tag) => !KNOWN_TAGS.has(tag));
  if (unknownTags.length > 0) {
    unknownTags.forEach((tag) => {
      unknownTagCounts.set(tag, (unknownTagCounts.get(tag) || 0) + 1);
    });
  }
});

if (duplicateTitles.size > 0) {
  fail(
    `Duplicate title text found: ${Array.from(duplicateTitles).slice(0, 5).join(", ")}${
      duplicateTitles.size > 5 ? "..." : ""
    }`
  );
}

if (unknownTagCounts.size > 0) {
  console.warn(`[titles:check][WARN] Unknown tag unique count: ${unknownTagCounts.size}`);
  const topUnknownTags = Array.from(unknownTagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const topList = topUnknownTags.map(([tag, count]) => `${tag} (${count})`).join(", ");
  console.warn(`[titles:check][WARN] Unknown tag top 10: ${topList}`);
}

console.log("[titles:check] OK");
