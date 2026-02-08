#!/usr/bin/env node
// E2E Stress Report — parse a captured stress run log and summarize flaky hotspots.
//
// Usage:
//   node scripts/e2e-stress-report.mjs logs/e2e-stress.log
//   node scripts/e2e-stress-report.mjs logs/e2e-stress.log logs/e2e-stress-report.md
//
// Recommended flow (PowerShell):
//   npm run e2e:stress -- 20 2>&1 | Tee-Object -FilePath logs/e2e-stress.log
//   npm run e2e:stress:report -- logs/e2e-stress.log

import fs from "node:fs";
import path from "node:path";

const inputPath =
  process.argv[2] || process.env.E2E_STRESS_LOG || "logs/e2e-stress.log";
const outputPath =
  process.argv[3] ||
  process.env.E2E_STRESS_REPORT_OUT ||
  "logs/e2e-stress-report.md";

const text = fs.readFileSync(inputPath, "utf8");

const ensureDir = (p) => {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const matchSummary = text.match(
  /=== Results: (\d+) passed, (\d+) failed out of (\d+) ===/m,
);
const summary = matchSummary
  ? {
      passed: Number(matchSummary[1]),
      failed: Number(matchSummary[2]),
      runs: Number(matchSummary[3]),
    }
  : null;

const specCounts = new Map();
const errorCounts = new Map();

const specRegexes = [
  /\btests\/e2e\/[^\s:]+\.spec\.ts\b/g,
  /\bfrontend\/tests\/e2e\/[^\s:]+\.spec\.ts\b/g,
];

const countSpecMentions = (block) => {
  const found = new Set();
  for (const re of specRegexes) {
    for (const m of block.matchAll(re)) found.add(m[0]);
  }
  for (const spec of found) {
    specCounts.set(spec, (specCounts.get(spec) || 0) + 1);
  }
};

const pickErrorKey = (block) => {
  const lines = block.split("\n").map((l) => l.trim());
  const errLine =
    lines.find((l) => l.startsWith("Error:")) ||
    lines.find((l) => l.includes("expect(")) ||
    lines.find((l) => l.includes("Timeout")) ||
    null;
  if (!errLine) return null;
  // Keep it stable-ish; avoid huge blobs.
  return errLine.slice(0, 160);
};

const failureIdx = text.indexOf("Failure details:");
if (failureIdx >= 0) {
  const after = text.slice(failureIdx);
  const blocks = after
    .split(/\n(?=\s{2}Run \d+:)/g)
    .filter((b) => b.trim().startsWith("Run ") || b.trim().startsWith("Run"));

  for (const block of blocks) {
    countSpecMentions(block);
    const k = pickErrorKey(block);
    if (k) errorCounts.set(k, (errorCounts.get(k) || 0) + 1);
  }
} else {
  // Best-effort fallback: scan entire text for spec mentions.
  countSpecMentions(text);
}

const topN = (map, n) =>
  [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

const lines = [];
lines.push(`# E2E Stress Report`);
lines.push(``);
lines.push(`Input: \`${inputPath}\``);
if (summary) {
  lines.push(`Runs: ${summary.runs} (pass ${summary.passed}, fail ${summary.failed})`);
} else {
  lines.push(`Runs: (could not parse summary line)`);
}
lines.push(``);

lines.push(`## Top Failing Specs (Best-Effort)`);
const topSpecs = topN(specCounts, 10);
if (topSpecs.length === 0) {
  lines.push(`(none detected)`);
} else {
  for (const [spec, count] of topSpecs) lines.push(`- ${count}x \`${spec}\``);
}
lines.push(``);

// Calculate per-spec pass rates
const allSpecMentions = new Map();
const specRegexesForAll = [
  /\btests\/e2e\/[^\s:]+\.spec\.ts\b/g,
  /\bfrontend\/tests\/e2e\/[^\s:]+\.spec\.ts\b/g,
];
for (const re of specRegexesForAll) {
  for (const m of text.matchAll(re)) {
    const s = m[0];
    allSpecMentions.set(s, (allSpecMentions.get(s) || 0) + 1);
  }
}

lines.push(`## Per-Spec Pass Rate (Estimated)`);
if (allSpecMentions.size === 0 || !summary) {
  lines.push(`(not enough data)`);
} else {
  const total = summary.runs;
  for (const [spec, failCount] of topN(allSpecMentions, 20)) {
    const passRate = Math.max(0, Math.round(((total - failCount) / total) * 100));
    lines.push(`- \`${spec}\`: ${passRate}% pass (${failCount} fail / ${total} runs)`);
  }
}
lines.push(``);

lines.push(`## Top Error Snippets (Best-Effort)`);
const topErrs = topN(errorCounts, 10);
if (topErrs.length === 0) {
  lines.push(`(none detected)`);
} else {
  for (const [err, count] of topErrs) lines.push(`- ${count}x \`${err}\``);
}
lines.push(``);
lines.push(
  `Notes: This report parses plain text logs. For higher fidelity, keep full Playwright output in the captured log.`,
);
lines.push(``);

ensureDir(outputPath);
fs.writeFileSync(outputPath, lines.join("\n"), "utf8");
console.log(`Wrote: ${outputPath}`);

