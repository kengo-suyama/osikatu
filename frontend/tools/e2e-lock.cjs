#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");
const gitDir = path.resolve(__dirname, "..", "..", ".git");
for (const name of ["index.lock", "HEAD.lock"]) {
  const lp = path.join(gitDir, name);
  try { fs.unlinkSync(lp); console.log("[e2e-lock] removed stale: " + lp); } catch { /* */ }
  try {
    fs.writeFileSync(lp, "e2e-lock pid=" + process.pid + " " + new Date().toISOString() + "\n", { flag: "wx" });
    console.log("[e2e-lock] created: " + lp);
  } catch (err) {
    console.warn("[e2e-lock] WARN: " + name + ": " + (err instanceof Error ? err.message : String(err)));
  }
}
