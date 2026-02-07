#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");
const gitDir = path.resolve(__dirname, "..", "..", ".git");
for (const name of ["index.lock", "HEAD.lock"]) {
  const lp = path.join(gitDir, name);
  try { fs.unlinkSync(lp); console.log("[e2e-unlock] removed: " + lp); } catch { /* */ }
}
