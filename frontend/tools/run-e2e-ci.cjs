#!/usr/bin/env node
/* eslint-disable no-console */

// Wrapper for `e2e:ci` on Windows.
// - runs the existing `e2e:ci:raw` script
// - always removes stale git lock files created by our e2e scripts
// - actively blocks IDE auto-checkouts using git lock files (index.lock / HEAD.lock)
// - holds `.git/HEAD` open to block IDE auto-checkouts mid-run (Windows only)
// - optional: `--repeat N` to run e2e:ci multiple times without dropping the locks

const { execFileSync, spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const frontendDir = path.resolve(__dirname, "..");
const repoDir = path.resolve(frontendDir, "..");
const laravelDir = path.resolve(repoDir, "laravel");
const LOCK_MARKER_GUARD = "locked by guard-git-head";
const LOCK_MARKER_RUNNER = "locked by run-e2e-ci";

function git(args) {
  return execFileSync("git", ["-C", repoDir, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function parseArgs(argv) {
  const out = { repeat: 1 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--repeat") {
      const raw = argv[i + 1];
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error(`Invalid --repeat value: ${raw}`);
      }
      out.repeat = Math.floor(n);
      i++;
    } else if (a === "--help" || a === "-h") {
      console.log("Usage: node tools/run-e2e-ci.cjs [--repeat N]");
      process.exit(0);
    }
  }
  return out;
}

const resolveGitPath = (gitPath) => {
  try {
    const raw = git(["rev-parse", "--git-path", gitPath]);
    return path.resolve(repoDir, raw);
  } catch {
    return null;
  }
};

let symbolicHeadRef = null;
try {
  symbolicHeadRef = git(["symbolic-ref", "-q", "HEAD"]);
} catch {
  // Detached HEAD; nothing to lock.
}

const refLockPath =
  symbolicHeadRef && typeof symbolicHeadRef === "string"
    ? resolveGitPath(`${symbolicHeadRef}.lock`)
    : null;

const lockPaths = [
  resolveGitPath("index.lock"),
  resolveGitPath("HEAD.lock"),
  refLockPath,
].filter(Boolean);
const pidFilePath =
  resolveGitPath("osikatu-e2e-ci.head-hold.pid") ||
  path.join(repoDir, ".git", "osikatu-e2e-ci.head-hold.pid");
const headPath = resolveGitPath("HEAD") || path.join(repoDir, ".git", "HEAD");
const headRefPath =
  symbolicHeadRef && typeof symbolicHeadRef === "string" ? resolveGitPath(symbolicHeadRef) : null;

const canRemoveLock = (lockPath) => {
  try {
    const buf = fs.readFileSync(lockPath, "utf8");
    return buf.includes(LOCK_MARKER_GUARD) || buf.includes(LOCK_MARKER_RUNNER);
  } catch {
    // If we can't read it, we shouldn't delete it automatically.
    return false;
  }
};

const cleanupLocks = ({ allowUnknown = false } = {}) => {
  for (const lockPath of lockPaths) {
    try {
      if (fs.existsSync(lockPath)) {
        if (!allowUnknown && !canRemoveLock(lockPath)) {
          console.error(`[run-e2e-ci] ERROR: lock exists but was not created by our tools: ${lockPath}`);
          console.error("[run-e2e-ci] If no git operation is running, delete it manually and retry.");
          process.exit(2);
        }
        fs.unlinkSync(lockPath);
        console.log(`[run-e2e-ci] removed ${lockPath}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[run-e2e-ci] WARN: failed to remove ${lockPath}: ${message}`);
    }
  }
};

const createdLockPaths = [];
const createLocks = () => {
  for (const lockPath of lockPaths) {
    try {
      fs.writeFileSync(
        lockPath,
        `${LOCK_MARKER_RUNNER} pid=${process.pid} at ${new Date().toISOString()}\n`,
        { flag: "wx" }
      );
      createdLockPaths.push(lockPath);
      console.log(`[run-e2e-ci] lock created: ${lockPath}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[run-e2e-ci] WARN: could not create lock ${lockPath}: ${message}`);
    }
  }
};

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

  const pathsToHold = [headPath];
  if (headRefPath && fs.existsSync(headRefPath)) pathsToHold.push(headRefPath);

  const escapedPaths = pathsToHold.map((p) => p.replace(/'/g, "''"));
  const psScript = [
    "$ErrorActionPreference='Stop';",
    "$handles=@();",
    // Allow others to read git metadata while blocking write access (prevents IDE auto-checkouts).
    ...escapedPaths.map(
      (p) =>
        `$handles += [System.IO.File]::Open('${p}',[System.IO.FileMode]::Open,[System.IO.FileAccess]::Read,[System.IO.FileShare]::Read);`
    ),
    "try { while ($true) { Start-Sleep -Seconds 60 } } finally { foreach ($h in $handles) { try { $h.Close() } catch {} } }",
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
  const held = pathsToHold.map((p) => path.basename(p)).join(", ");
  console.log(`[run-e2e-ci] holding ${held} (pid=${proc.pid})`);
  return proc;
};

const { repeat } = parseArgs(process.argv.slice(2));

const cleanupWeirdNulFile = () => {
  // A stray `nul` file sometimes appears on Windows and breaks `git status` hygiene.
  // Delete it if present. (This does not affect app behavior.)
  const normal = path.join(repoDir, "nul");
  const extended = `\\\\?\\${normal}`;
  try {
    fs.unlinkSync(normal);
    return;
  } catch {
    // ignore
  }
  try {
    fs.unlinkSync(extended);
  } catch {
    // ignore
  }
  // Fallback for odd cases where Node can't remove it.
  try {
    execFileSync("cmd", ["/c", `del /f /q "${extended}"`], { stdio: "ignore" });
  } catch {
    // ignore
  }
};

const setupLaravelSqliteDb = (dbPath) => {
  // We run Laravel via `php artisan serve` for e2e:ci. On Windows machines, MySQL may not be running.
  // Use a dedicated SQLite file for e2e runs to make the suite self-contained and repeatable.
  try {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    // Ensure file exists; Laravel will create it too, but we want a predictable path.
    if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, "");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[run-e2e-ci] WARN: failed to prepare sqlite file: ${message}`);
  }

  const env = {
    ...process.env,
    APP_ENV: "e2e",
    APP_DEBUG: "0",
    DB_CONNECTION: "sqlite",
    DB_DATABASE: dbPath,
    DB_FOREIGN_KEYS: "1",
    CACHE_DRIVER: "array",
    SESSION_DRIVER: "array",
    QUEUE_CONNECTION: "sync",
    MAIL_MAILER: "array",
  };

  try {
    execFileSync("php", ["artisan", "migrate:fresh", "--force"], {
      cwd: laravelDir,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    execFileSync(
      "php",
      ["artisan", "db:seed", "--class", "Database\\Seeders\\OwnerDashboardDemoSeeder", "--force"],
      {
        cwd: laravelDir,
        env,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
    console.log(`[run-e2e-ci] sqlite DB prepared: ${dbPath}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[run-e2e-ci] WARN: failed to migrate/seed sqlite DB: ${message}`);
  }
};

cleanupLocks({ allowUnknown: false });
cleanupHeadHold();
cleanupWeirdNulFile();
createLocks();
const headHoldProc = startHeadHold();

const initialBranch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
const initialHead = git(["rev-parse", "HEAD"]);

let currentChild = null;
const forwardSignal = (signal) => {
  try {
    currentChild?.kill(signal);
  } catch {
    // ignore
  }
};

const finalize = (exitCode) => {
  if (headHoldProc?.pid && isPowershellPid(headHoldProc.pid)) {
    killPid(headHoldProc.pid);
  }
  cleanupHeadHold();

  // Remove only locks we created (and any stale ones from guard).
  for (const lockPath of createdLockPaths) {
    try {
      fs.unlinkSync(lockPath);
      console.log(`[run-e2e-ci] lock removed: ${lockPath}`);
    } catch {
      // ignore
    }
  }
  cleanupLocks({ allowUnknown: false });
  process.exit(exitCode);
};

process.on("SIGINT", () => {
  forwardSignal("SIGINT");
  finalize(130);
});
process.on("SIGTERM", () => {
  forwardSignal("SIGTERM");
  finalize(143);
});

const runOnce = (runIndex) =>
  new Promise((resolve) => {
    console.log(`[run-e2e-ci] run ${runIndex}/${repeat} (branch=${initialBranch})`);
    const sqliteDbPath = path.join(laravelDir, "storage", "osikatu-e2e.sqlite");
    setupLaravelSqliteDb(sqliteDbPath);

    const env = {
      ...process.env,
      // We keep locks for the whole run; avoid noisy warnings from the guard lock attempt.
      GUARD_GIT_HEAD_LOCK_INDEX: "0",
      GUARD_GIT_HEAD_LOCK_HEAD: "0",
      // Make the Laravel server independent from MySQL (common source of Windows flakes).
      APP_ENV: "e2e",
      APP_DEBUG: "0",
      DB_CONNECTION: "sqlite",
      DB_DATABASE: sqliteDbPath,
      DB_FOREIGN_KEYS: "1",
      CACHE_DRIVER: "array",
      SESSION_DRIVER: "array",
      QUEUE_CONNECTION: "sync",
      MAIL_MAILER: "array",
    };

    const child = spawn("npm", ["run", "e2e:ci:raw"], {
      cwd: frontendDir,
      shell: true,
      stdio: "inherit",
      env,
    });
    currentChild = child;

    child.on("exit", (code, signal) => {
      currentChild = null;
      cleanupWeirdNulFile();

      const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
      const head = git(["rev-parse", "HEAD"]);
      if (branch !== initialBranch || head !== initialHead) {
        console.error("[run-e2e-ci] ERROR: git HEAD changed while running e2e:ci.");
        console.error(`[run-e2e-ci] initial branch=${initialBranch} head=${initialHead}`);
        console.error(`[run-e2e-ci] current branch=${branch} head=${head}`);
        return resolve({ code: 2, signal: null });
      }

      if (signal) return resolve({ code: 1, signal });
      return resolve({ code: code ?? 1, signal: null });
    });
  });

(async () => {
  for (let i = 1; i <= repeat; i++) {
    const { code } = await runOnce(i);
    if (code !== 0) {
      return finalize(code);
    }
  }
  return finalize(0);
})().catch((err) => {
  console.error(`[run-e2e-ci] ERROR: ${err instanceof Error ? err.stack : String(err)}`);
  finalize(1);
});

