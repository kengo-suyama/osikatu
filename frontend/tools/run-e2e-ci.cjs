#!/usr/bin/env node
/* eslint-disable no-console */

// Wrapper for `e2e:ci` on Windows.
// - runs the existing `e2e:ci:raw` script
// - always removes `.git/index.lock` afterwards (guard may be killed forcefully by the process manager)

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const frontendDir = path.resolve(__dirname, "..");
const repoDir = path.resolve(frontendDir, "..");
const indexLockPath = path.join(repoDir, ".git", "index.lock");

const cleanupIndexLock = () => {
  try {
    if (fs.existsSync(indexLockPath)) {
      fs.unlinkSync(indexLockPath);
      console.log(`[run-e2e-ci] removed ${indexLockPath}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[run-e2e-ci] WARN: failed to remove ${indexLockPath}: ${message}`);
  }
};

cleanupIndexLock();

const child = spawn("npm", ["run", "e2e:ci:raw"], {
  cwd: frontendDir,
  shell: true,
  stdio: "inherit",
});

const forwardSignal = (signal) => {
  try {
    child.kill(signal);
  } catch {
    // ignore
  }
};

process.on("SIGINT", () => forwardSignal("SIGINT"));
process.on("SIGTERM", () => forwardSignal("SIGTERM"));

child.on("exit", (code, signal) => {
  cleanupIndexLock();

  if (signal) {
    process.exit(1);
  }
  process.exit(code ?? 1);
});

