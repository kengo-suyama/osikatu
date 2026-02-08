#!/usr/bin/env node
/* eslint-disable no-console */

const net = require("node:net");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");

const { getKnownKillableReason } = require("./ensure-ports-free.cjs");

const frontendDir = path.resolve(__dirname, "..");
const repoDir = path.resolve(frontendDir, "..");
const laravelDir = path.resolve(repoDir, "laravel");

const PORTS = [3103, 8001];

const safeString = (value) => (typeof value === "string" ? value : "");

const run = (file, args, opts = {}) => {
  const res = spawnSync(file, args, { encoding: "utf8", ...opts });
  return {
    ok: res.status === 0,
    status: res.status ?? 1,
    stdout: safeString(res.stdout),
    stderr: safeString(res.stderr),
    error: res.error,
  };
};

const checkPortOnHost = (port, host) =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on("error", (err) => {
      resolve({ port, host, free: false, errorCode: err && err.code ? String(err.code) : "UNKNOWN" });
    });
    server.listen({ port, host }, () => {
      server.close(() => resolve({ port, host, free: true }));
    });
  });

const checkPort = async (port) => {
  const v4 = await checkPortOnHost(port, "127.0.0.1");
  const v6 = await checkPortOnHost(port, "::");
  const v6Unsupported =
    v6.free === false &&
    (v6.errorCode === "EADDRNOTAVAIL" || v6.errorCode === "EAFNOSUPPORT" || v6.errorCode === "EINVAL");
  const v6FreeEffective = v6Unsupported ? true : Boolean(v6.free);
  return { port, free: Boolean(v4.free && v6FreeEffective), details: [v4, v6] };
};

const getListeningPidsWindows = (port) => {
  const res = run("netstat.exe", ["-ano", "-p", "TCP"]);
  if (!res.ok) return [];

  const pids = new Set();
  const lines = safeString(res.stdout).split(/\r?\n/);
  for (const line of lines) {
    if (!line.includes("LISTENING")) continue;
    const parts = line.trim().split(/\s+/);
    if (parts.length < 5) continue;
    const local = parts[1] ?? "";
    const state = parts[3] ?? "";
    const pid = Number(parts[4]);
    if (state !== "LISTENING") continue;
    if (!Number.isFinite(pid)) continue;
    if (local.endsWith(`:${port}`) || local.endsWith(`]:${port}`)) pids.add(pid);
  }

  return Array.from(pids);
};

const getProcessInfoWindows = (pid) => {
  const ps = `Get-CimInstance Win32_Process -Filter "ProcessId=${pid}" | Select-Object Name,CommandLine,ProcessId | ConvertTo-Json -Compress`;
  const res = run("powershell.exe", ["-NoProfile", "-Command", ps]);
  if (!res.ok) return null;
  const text = safeString(res.stdout).trim();
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    const obj = Array.isArray(parsed) ? parsed[0] : parsed;
    const name = safeString(obj?.Name);
    const commandLine = safeString(obj?.CommandLine);
    const processId = Number(obj?.ProcessId ?? pid);
    return { pid: Number.isFinite(processId) ? processId : pid, name, commandLine };
  } catch {
    return null;
  }
};

const git = (args) => {
  try {
    return execFileSync("git", ["-C", repoDir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
};

const resolveGitPath = (gitPath) => {
  const raw = git(["rev-parse", "--git-path", gitPath]);
  if (!raw) return null;
  return path.resolve(repoDir, raw);
};

const statOrNull = (p) => {
  try {
    const s = fs.statSync(p);
    return { exists: true, size: s.size, mtimeMs: s.mtimeMs };
  } catch {
    return { exists: false, size: null, mtimeMs: null };
  }
};

const listRecentLogs = () => {
  const logsDir = path.join(frontendDir, "logs");
  if (!fs.existsSync(logsDir)) return [];
  try {
    const files = fs
      .readdirSync(logsDir)
      .map((name) => path.join(logsDir, name))
      .filter((p) => fs.statSync(p).isFile())
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    return files.slice(0, 5);
  } catch {
    return [];
  }
};

async function main() {
  console.log("[doctor] Osikatu E2E Doctor");
  console.log(`[doctor] repoDir=${repoDir}`);
  console.log(`[doctor] frontendDir=${frontendDir}`);
  console.log(`[doctor] laravelDir=${laravelDir}`);

  console.log("");
  console.log(`[doctor] node=${process.version}`);
  const npmV = run("npm", ["-v"]);
  console.log(`[doctor] npm=${npmV.ok ? npmV.stdout.trim() : "(failed to run npm -v)"}`);
  const phpV = run("php", ["-v"]);
  console.log(`[doctor] php=${phpV.ok ? phpV.stdout.split(/\r?\n/)[0].trim() : "(failed to run php -v)"}`);

  console.log("");
  console.log("[doctor] Ports");

  const checks = await Promise.all(PORTS.map(checkPort));
  for (const c of checks) {
    const blocked = !c.free;
    console.log(`[doctor] port ${c.port}: ${blocked ? "IN USE" : "free"}`);

    for (const d of c.details) {
      const suffix = d.free ? "free" : `blocked (${d.errorCode || "UNKNOWN"})`;
      console.log(`[doctor]   bind ${d.host}: ${suffix}`);
    }

    if (process.platform === "win32" && blocked) {
      const pids = getListeningPidsWindows(c.port);
      if (pids.length === 0) {
        console.log("[doctor]   netstat: no listening pid found");
      }
      for (const pid of pids) {
        const info = getProcessInfoWindows(pid);
        const name = info?.name || "unknown";
        const cmd = safeString(info?.commandLine).replace(/\s+/g, " ").trim();
        const reason = info ? getKnownKillableReason({ port: c.port, name, commandLine: info.commandLine }) : null;
        console.log(`[doctor]   pid=${pid} name=${name}${reason ? ` killable=${reason}` : ""}`);
        if (cmd) console.log(`[doctor]   cmd=${cmd}`);
      }
    }
  }

  console.log("");
  console.log("[doctor] SQLite (E2E)");
  const sqlitePath = path.join(laravelDir, "storage", "osikatu-e2e.sqlite");
  const sqliteStat = statOrNull(sqlitePath);
  console.log(`[doctor] path=${sqlitePath}`);
  console.log(`[doctor] exists=${sqliteStat.exists} size=${sqliteStat.size ?? ""} mtimeMs=${sqliteStat.mtimeMs ?? ""}`);

  console.log("");
  console.log("[doctor] Git Locks");
  const symbolicHeadRef = git(["symbolic-ref", "-q", "HEAD"]);
  const refLockPath = symbolicHeadRef ? resolveGitPath(`${symbolicHeadRef}.lock`) : null;
  const lockPaths = [
    resolveGitPath("index.lock"),
    resolveGitPath("HEAD.lock"),
    refLockPath,
  ].filter(Boolean);
  if (lockPaths.length === 0) {
    console.log("[doctor] (none)");
  } else {
    for (const p of lockPaths) {
      const s = statOrNull(p);
      console.log(`[doctor] ${p}: ${s.exists ? "exists" : "missing"}`);
      if (s.exists) {
        try {
          const text = fs.readFileSync(p, "utf8");
          const oneLine = text.replace(/\s+/g, " ").trim();
          console.log(`[doctor]   content=${oneLine}`);
        } catch {
          // ignore
        }
      }
    }
  }

  console.log("");
  console.log("[doctor] Recent frontend logs");
  const recent = listRecentLogs();
  if (recent.length === 0) {
    console.log("[doctor] (none)");
  } else {
    for (const p of recent) console.log(`[doctor] ${p}`);
  }

  console.log("");
  console.log("[doctor] Tips");
  console.log("[doctor] - Run: npm run e2e:preflight");
  console.log("[doctor] - Disable auto-kill (dev only): set E2E_KILL_KNOWN_LISTENERS=0");
  console.log("[doctor] - If sqlite is corrupted: delete laravel\\storage\\osikatu-e2e.sqlite then retry");
}

main().catch((err) => {
  console.error(`[doctor] ERROR: ${err instanceof Error ? err.stack : String(err)}`);
  process.exit(1);
});

