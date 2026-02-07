#!/usr/bin/env node
/* eslint-disable no-console */
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const repoDir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, "..", "..");
function git(args) {
  try { return execFileSync("git", ["-C", repoDir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); }
  catch { return null; }
}
const initialHead = git(["rev-parse", "HEAD"]);
const initialBranch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
console.log("[guard-git-head] branch=" + initialBranch + " head=" + initialHead);
process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
setInterval(() => {
  const head = git(["rev-parse", "HEAD"]);
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  if (!head || !branch) return;
  if (head !== initialHead || branch !== initialBranch) {
    console.error("[guard-git-head] ERROR: HEAD changed: " + initialBranch + " -> " + branch);
    process.exit(2);
  }
}, 2000);
