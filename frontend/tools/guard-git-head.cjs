#!/usr/bin/env node
/* eslint-disable no-console */

// Fail fast if git HEAD changes while e2e:ci is running.
// This prevents running tests with the wrong branch's code/config when an IDE auto-checkouts.

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
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

// Default ON: we actively prevent external `git checkout/switch` during e2e runs.
// - index.lock blocks index updates
// - HEAD.lock blocks HEAD updates (for git implementations that honor lock files)
// Set `GUARD_GIT_HEAD_LOCK_INDEX=0` / `GUARD_GIT_HEAD_LOCK_HEAD=0` to disable.
const lockIndex = process.env.GUARD_GIT_HEAD_LOCK_INDEX !== "0";
const lockHead = process.env.GUARD_GIT_HEAD_LOCK_HEAD !== "0";
const createdLockPaths = [];

const cleanup = () => {
  for (const lockPath of createdLockPaths) {
    try {
      fs.unlinkSync(lockPath);
      console.log(`[guard-git-head] lock removed: ${lockPath}`);
    } catch {
      // ignore
    }
  }
};

const tryCreateLock = (gitPath) => {
  try {
    // In worktrees, `.git` can be a file. Ask git for the correct lock path.
    const raw = git(["rev-parse", "--git-path", gitPath]);
    const lockPath = path.resolve(repoDir, raw);
    fs.writeFileSync(
      lockPath,
      `locked by guard-git-head pid=${process.pid} at ${new Date().toISOString()}\n`,
      { flag: "wx" }
    );
    createdLockPaths.push(lockPath);
    console.log(`[guard-git-head] lock created: ${lockPath}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[guard-git-head] WARN: could not create ${gitPath}: ${message}`);
  }
};

if (lockIndex) tryCreateLock("index.lock");
if (lockHead) tryCreateLock("HEAD.lock");

const initialHead = git(["rev-parse", "HEAD"]);
const initialBranch = git(["rev-parse", "--abbrev-ref", "HEAD"]);

console.log(`[guard-git-head] repo=${repoDir}`);
console.log(`[guard-git-head] initial branch=${initialBranch} head=${initialHead}`);

process.on("exit", cleanup);
process.on("SIGINT", () => {
  cleanup();
  process.exit(0);
});
process.on("SIGTERM", () => {
  cleanup();
  process.exit(0);
});

setInterval(() => {
  const head = git(["rev-parse", "HEAD"]);
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  if (head !== initialHead || branch !== initialBranch) {
    console.error("[guard-git-head] ERROR: git HEAD changed during e2e.");
    console.error(`[guard-git-head] initial branch=${initialBranch} head=${initialHead}`);
    console.error(`[guard-git-head] current branch=${branch} head=${head}`);
    cleanup();
    process.exit(2);
  }
}, 1000);

