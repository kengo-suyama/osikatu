#!/usr/bin/env node
/* eslint-disable no-console */

// e2e:doctor – Diagnostic tool for E2E test environment.
// Checks common issues: ports, git locks, stale processes, SQLite DB, dependencies.

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");

const frontendDir = path.resolve(__dirname, "..");
const repoDir = path.resolve(frontendDir, "..");
const laravelDir = path.resolve(repoDir, "laravel");

const E2E_PORTS = [3103, 8001];

let passed = 0;
let warned = 0;
let failed = 0;

const ok = (msg) => { passed++; console.log(`  ✅ ${msg}`); };
const warn = (msg) => { warned++; console.log(`  ⚠️  ${msg}`); };
const fail = (msg) => { failed++; console.log(`  ❌ ${msg}`); };

const checkPort = (port, host) =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on("error", () => resolve(false));
    server.listen({ port, host }, () => {
      server.close(() => resolve(true));
    });
  });

console.log("\n🩺 E2E Doctor — Diagnosing test environment...\n");

// ── 1. Node / npm versions ──────────────────────────────────────────────────
console.log("1) Runtime");
try {
  const nodeVersion = process.version;
  const major = Number(nodeVersion.slice(1).split(".")[0]);
  if (major >= 18) {
    ok(`Node.js ${nodeVersion}`);
  } else {
    warn(`Node.js ${nodeVersion} (recommended >= 18)`);
  }
} catch {
  fail("Could not determine Node.js version");
}

try {
  const npmVersion = execFileSync("npm", ["--version"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  ok(`npm ${npmVersion}`);
} catch {
  fail("npm not found in PATH");
}

// ── 2. PHP ──────────────────────────────────────────────────────────────────
console.log("\n2) PHP");
try {
  const phpVersion = execFileSync("php", ["--version"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split("\n")[0];
  ok(phpVersion);
} catch {
  fail("php not found in PATH (required for Laravel E2E backend)");
}

// ── 3. Ports ────────────────────────────────────────────────────────────────
console.log("\n3) Ports");

const portChecks = (async () => {
  for (const port of E2E_PORTS) {
    const freeV4 = await checkPort(port, "127.0.0.1");
    const freeV6 = await checkPort(port, "::1");
    if (freeV4 && freeV6) {
      ok(`Port ${port} is free (IPv4 + IPv6)`);
    } else if (!freeV4 && !freeV6) {
      fail(`Port ${port} is in use (IPv4 and IPv6)`);
    } else {
      warn(`Port ${port}: IPv4=${freeV4 ? "free" : "busy"}, IPv6=${freeV6 ? "free" : "busy"}`);
    }
  }
})();

portChecks.then(() => {
  // ── 4. Git locks ──────────────────────────────────────────────────────────
  console.log("\n4) Git locks");
  const gitDir = path.join(repoDir, ".git");
  const lockFiles = ["index.lock", "HEAD.lock"].map((f) => path.join(gitDir, f));
  const reentryLock = path.join(frontendDir, ".run-e2e-ci.lock");

  let anyLock = false;
  for (const lockPath of lockFiles) {
    if (fs.existsSync(lockPath)) {
      warn(`Stale lock found: ${lockPath}`);
      anyLock = true;
    }
  }
  if (fs.existsSync(reentryLock)) {
    warn(`Re-entry lock exists: ${reentryLock} (another run-e2e-ci may be active or crashed)`);
    anyLock = true;
  }
  if (!anyLock) {
    ok("No stale git/runner locks found");
  }

  // ── 5. SQLite DB ──────────────────────────────────────────────────────────
  console.log("\n5) SQLite E2E database");
  const sqliteDbPath = path.join(laravelDir, "storage", "osikatu-e2e.sqlite");
  if (fs.existsSync(sqliteDbPath)) {
    try {
      const stat = fs.statSync(sqliteDbPath);
      if (stat.size === 0) {
        warn(`E2E SQLite DB exists but is empty (${sqliteDbPath})`);
      } else {
        // Quick integrity check: read first 16 bytes for SQLite magic.
        const buf = Buffer.alloc(16);
        const fd = fs.openSync(sqliteDbPath, "r");
        fs.readSync(fd, buf, 0, 16, 0);
        fs.closeSync(fd);
        const magic = buf.toString("ascii", 0, 15);
        if (magic === "SQLite format 3") {
          ok(`E2E SQLite DB looks valid (${(stat.size / 1024).toFixed(0)} KB)`);
        } else {
          fail(`E2E SQLite DB may be corrupt (bad magic header): ${sqliteDbPath}`);
        }
      }
    } catch (err) {
      warn(`Could not inspect E2E SQLite DB: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    ok("No E2E SQLite DB yet (will be created on first e2e:ci run)");
  }

  // ── 6. Dependencies ──────────────────────────────────────────────────────
  console.log("\n6) Dependencies");
  const nodeModules = path.join(frontendDir, "node_modules");
  if (fs.existsSync(nodeModules)) {
    ok("node_modules exists");
    // Check key deps
    const keyDeps = ["@playwright/test", "concurrently", "wait-on"];
    for (const dep of keyDeps) {
      const depPath = path.join(nodeModules, dep);
      if (fs.existsSync(depPath)) {
        ok(`${dep} installed`);
      } else {
        fail(`${dep} missing — run: npm install`);
      }
    }
  } else {
    fail("node_modules not found — run: npm install");
  }

  // ── 7. Playwright browsers ───────────────────────────────────────────────
  console.log("\n7) Playwright browsers");
  try {
    const out = execFileSync("npx", ["playwright", "install", "--dry-run"], {
      cwd: frontendDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (/already installed/i.test(out) || out.trim() === "") {
      ok("Playwright browsers appear installed");
    } else {
      warn("Playwright browsers may need installation — run: npx playwright install");
    }
  } catch {
    warn("Could not verify Playwright browsers — run: npx playwright install");
  }

  // ── 8. Conflict markers ──────────────────────────────────────────────────
  console.log("\n8) Conflict markers");
  try {
    const result = execFileSync("git", ["-C", repoDir, "grep", "-E", "-rn", "^(<<<<<<<|=======|>>>>>>>)", "--", "*.ts", "*.tsx", "*.cjs", "*.mjs", "*.js", "*.json", "*.md", "*.php"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (result.trim()) {
      fail(`Conflict markers found:\n${result.trim()}`);
    } else {
      ok("No conflict markers found");
    }
  } catch {
    // git grep returns exit code 1 when no matches — that's success.
    ok("No conflict markers found");
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n─────────────────────────────────────");
  console.log(`🩺 Results: ${passed} passed, ${warned} warnings, ${failed} failed`);
  if (failed > 0) {
    console.log("   Fix the ❌ items above before running e2e:ci.\n");
    process.exit(1);
  } else if (warned > 0) {
    console.log("   Review ⚠️  warnings. E2E may still work.\n");
    process.exit(0);
  } else {
    console.log("   Environment looks good! 🎉\n");
    process.exit(0);
  }
});
