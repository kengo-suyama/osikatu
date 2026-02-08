#!/usr/bin/env node
// guard-no-pins-v1.mjs — Fail CI if frontend app code calls pins v1 write endpoints.
// Scans frontend/app/ and frontend/lib/repo/ (excluding postRepo.ts legacy definitions).
// Does NOT scan tests/ or docs/.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

// Patterns that indicate v1 pins write usage (not v2)
const V1_WRITE_PATTERNS = [
  // Direct URL patterns for v1 write (POST/PATCH to /pins, not /pins-v2)
  /\/api\/circles\/[^/]+\/pins["'`]\s*,\s*["'`]POST/i,
  /\/api\/circles\/[^/]+\/pins["'`]\s*,\s*["'`]PATCH/i,
  /\/api\/circles\/[^/]+\/pins\/[^/]+\/unpin/,
  // Template literal patterns
  /\/pins`\s*,\s*["'`]POST/,
  /\/pins`\s*,\s*["'`]PATCH/,
  // postRepo v1 method calls (createPin/updatePin on postRepo)
  /postRepo\.createPin/,
  /postRepo\.updatePin/,
  /postRepo\.unpinPost/,
  /postRepo\.unpinPin/,
];

// Directories to scan
const SCAN_DIRS = [
  path.join(ROOT, "app"),
  path.join(ROOT, "components"),
];

// Files to scan in lib/repo (exclude postRepo.ts itself — legacy definitions are allowed there)
const REPO_DIR = path.join(ROOT, "lib", "repo");

function getAllFiles(dir, ext = [".ts", ".tsx"]) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllFiles(fullPath, ext));
    } else if (ext.some((e) => entry.name.endsWith(e))) {
      results.push(fullPath);
    }
  }
  return results;
}

let violations = [];

// Scan app/ and components/
for (const dir of SCAN_DIRS) {
  for (const filePath of getAllFiles(dir)) {
    const content = fs.readFileSync(filePath, "utf8");
    for (const pattern of V1_WRITE_PATTERNS) {
      if (pattern.test(content)) {
        const relPath = path.relative(ROOT, filePath);
        violations.push({ file: relPath, pattern: pattern.source });
      }
    }
  }
}

// Scan lib/repo/ (exclude postRepo.ts — legacy defs are ok, but callers are not)
if (fs.existsSync(REPO_DIR)) {
  for (const filePath of getAllFiles(REPO_DIR)) {
    const basename = path.basename(filePath);
    if (basename === "postRepo.ts") continue; // legacy definitions allowed
    const content = fs.readFileSync(filePath, "utf8");
    for (const pattern of V1_WRITE_PATTERNS) {
      if (pattern.test(content)) {
        const relPath = path.relative(ROOT, filePath);
        violations.push({ file: relPath, pattern: pattern.source });
      }
    }
  }
}

if (violations.length > 0) {
  console.error("\n[GUARD FAIL] Pins v1 write detected in frontend code:");
  for (const v of violations) {
    console.error(`  ${v.file}  (pattern: ${v.pattern})`);
  }
  console.error("\nAll pin write operations must use /pins-v2 endpoints.");
  console.error("See: docs/dev/pins-v1-sunset.md\n");
  process.exit(1);
}

console.log("[GUARD OK] No pins v1 write usage found in frontend app code.");
process.exit(0);
