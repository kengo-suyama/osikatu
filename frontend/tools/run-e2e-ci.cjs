#!/usr/bin/env node
/* eslint-disable no-console */

// Wrapper for `e2e:ci` on Windows.
// - runs the existing `e2e:ci:raw` script
// - always removes git lock files before/after (guard may be killed forcefully by the process manager)
// - holds `.git/HEAD` open to block IDE auto-checkouts mid-run (Windows only)

const { execFileSync, spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const frontendDir = path.resolve(__dirname, "..");
const repoDir = path.resolve(frontendDir, "..");

function git(args) {
  return execFileSync("git", ["-C", repoDir, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

const resolveGitPath = (gitPath) => {
  try {
    const raw = git(["rev-parse", "--git-path", gitPath]);
    return path.resolve(repoDir, raw);
  } catch {
    return null;
  }
};

const lockPaths = [resolveGitPath("index.lock"), resolveGitPath("HEAD.lock")].filter(Boolean);
const pidFilePath =
  resolveGitPath("osikatu-e2e-ci.head-hold.pid") ||
  path.join(repoDir, ".git", "osikatu-e2e-ci.head-hold.pid");
const headPath = resolveGitPath("HEAD") || path.join(repoDir, ".git", "HEAD");

const cleanupLocks = () => {
  for (const lockPath of lockPaths) {
    try {
      if (fs.existsSync(lockPath)) {
        fs.unlinkSync(lockPath);
        console.log(`[run-e2e-ci] removed ${lockPath}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[run-e2e-ci] WARN: failed to remove ${lockPath}: ${message}`);
    }
  }
};

cleanupLocks();

const isPowershellPid = (pid) => {
  if (process.platform !== "win32") return false;
  try {
    const out = execFileSync("tasklist", ["/FI", `PID eq ${pid}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return /powershell\.exe/i.test(out);
  } catch {
    return false;
  }
};

const killPid = (pid) => {
  if (process.platform !== "win32") return;
  try {
    execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
    });
  } catch {
    // ignore
  }
};

const cleanupHeadHold = () => {
  try {
    if (!fs.existsSync(pidFilePath)) return;
    const raw = fs.readFileSync(pidFilePath, "utf8").trim();
    const pid = Number(raw);
    if (Number.isFinite(pid) && pid > 0 && isPowershellPid(pid)) {
      killPid(pid);
    }
  } catch {
    // ignore
  }
  try {
    fs.unlinkSync(pidFilePath);
  } catch {
    // ignore
  }
};

const startHeadHold = () => {
  if (process.platform !== "win32") return null;

  const escapedHeadPath = headPath.replace(/'/g, "''");
  const psScript = [
    "$ErrorActionPreference='Stop';",
    `$p='${escapedHeadPath}';`,
    // Allow others to read HEAD while blocking write access.
    "$fs=[System.IO.File]::Open($p,[System.IO.FileMode]::Open,[System.IO.FileAccess]::Read,[System.IO.FileShare]::Read);",
    "try { while ($true) { Start-Sleep -Seconds 60 } } finally { $fs.Close() }",
  ].join(" ");

  const proc = spawn("powershell", ["-NoProfile", "-Command", psScript], {
    stdio: "ignore",
    windowsHide: true,
  });
  try {
    fs.writeFileSync(pidFilePath, String(proc.pid), "utf8");
  } catch {
    // ignore
  }
  console.log(`[run-e2e-ci] holding HEAD (pid=${proc.pid})`);
  return proc;
};

cleanupHeadHold();
const headHoldProc = startHeadHold();

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
  if (headHoldProc?.pid && isPowershellPid(headHoldProc.pid)) {
    killPid(headHoldProc.pid);
  }
  cleanupHeadHold();
  cleanupLocks();

  if (signal) {
    process.exit(1);
  }
  process.exit(code ?? 1);
});

