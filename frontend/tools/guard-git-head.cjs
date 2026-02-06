#!/usr/bin/env node
/* eslint-disable no-console */

// Fail fast if git HEAD changes while e2e:ci is running.
// This prevents running tests with the wrong branch's code/config when an IDE auto-checkouts.

const { execFileSync } = require("node:child_process");
const path = require("node:path");

const repoDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, "..", "..");

function git(args) {
  return execFileSync("git", ["-C", repoDir, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

const initialHead = git(["rev-parse", "HEAD"]);
const initialBranch = git(["rev-parse", "--abbrev-ref", "HEAD"]);

console.log(`[guard-git-head] repo=${repoDir}`);
console.log(`[guard-git-head] initial branch=${initialBranch} head=${initialHead}`);

const exitCleanly = () => process.exit(0);
process.on("SIGINT", exitCleanly);
process.on("SIGTERM", exitCleanly);

setInterval(() => {
  const head = git(["rev-parse", "HEAD"]);
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  if (head !== initialHead || branch !== initialBranch) {
    console.error("[guard-git-head] ERROR: git HEAD changed during e2e.");
    console.error(`[guard-git-head] initial branch=${initialBranch} head=${initialHead}`);
    console.error(`[guard-git-head] current branch=${branch} head=${head}`);
    process.exit(2);
  }
}, 1000);

