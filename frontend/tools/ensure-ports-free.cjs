/* eslint-disable no-console */

const net = require("net");
const path = require("path");
const { spawnSync } = require("child_process");

const isWindows = process.platform === "win32";

const safeString = (value) => (typeof value === "string" ? value : "");

const envTruthy = (value, defaultValue = false) => {
  if (value == null) return defaultValue;
  const raw = String(value).trim().toLowerCase();
  if (raw === "") return defaultValue;
  return raw !== "0" && raw !== "false" && raw !== "off" && raw !== "no";
};

const isCi = envTruthy(process.env.CI, false);
const shouldKillKnown = (() => {
  // Safety policy:
  // - never auto-kill on CI by default
  // - allow devs to disable auto-kill via E2E_KILL_KNOWN_LISTENERS=0
  if (!isWindows) return false;
  if (isCi) return false;
  return envTruthy(process.env.E2E_KILL_KNOWN_LISTENERS, true);
})();

const parsePorts = (argv) =>
  (Array.isArray(argv) ? argv : [])
    .map((value) => Number(value))
    .filter((n) => Number.isFinite(n) && n > 0);

const normalizeWindowsPathForIncludes = (value) => safeString(value).replace(/\//g, "\\").toLowerCase();
const withTrailingSep = (p) => (p.endsWith(path.sep) ? p : `${p}${path.sep}`);

const frontendRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(frontendRoot, "..");
const laravelRoot = path.resolve(repoRoot, "laravel");

const frontendRootNorm = normalizeWindowsPathForIncludes(withTrailingSep(frontendRoot));
const laravelRootNorm = normalizeWindowsPathForIncludes(withTrailingSep(laravelRoot));

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
  // Next dev binds on IPv6 (`::`) on some Windows setups, while Laravel binds on 127.0.0.1.
  // Check both so we don't miss IPv6-only listeners that will still break `next dev -p PORT`.
  const v4 = await checkPortOnHost(port, "127.0.0.1");
  const v6 = await checkPortOnHost(port, "::");

  // Some Windows environments have IPv6 disabled; in that case binding to `::` fails with
  // EADDRNOTAVAIL/EAFNOSUPPORT/EINVAL even if the port is usable for IPv4-only services.
  // Treat those as "skip IPv6 check" to avoid false negatives, while still catching EADDRINUSE.
  const v6Unsupported =
    v6.free === false &&
    (v6.errorCode === "EADDRNOTAVAIL" || v6.errorCode === "EAFNOSUPPORT" || v6.errorCode === "EINVAL");
  const v6FreeEffective = v6Unsupported ? true : Boolean(v6.free);

  return { port, free: Boolean(v4.free && v6FreeEffective), details: [v4, v6] };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getListeningPidsWindows = (port) => {
  const res = spawnSync("netstat.exe", ["-ano", "-p", "TCP"], { encoding: "utf8" });
  if (res.status !== 0) return [];

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

    if (local.endsWith(`:${port}`) || local.endsWith(`]:${port}`)) {
      pids.add(pid);
    }
  }

  return Array.from(pids);
};

const getProcessInfoWindows = (pid) => {
  const ps = `Get-CimInstance Win32_Process -Filter "ProcessId=${pid}" | Select-Object Name,CommandLine,ProcessId | ConvertTo-Json -Compress`;
  const res = spawnSync("powershell.exe", ["-NoProfile", "-Command", ps], {
    encoding: "utf8",
  });
  if (res.status !== 0) return null;

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

const getImageNameWindows = (pid) => {
  const res = spawnSync("tasklist.exe", ["/FO", "CSV", "/NH", "/FI", `PID eq ${pid}`], { encoding: "utf8" });
  if (res.status !== 0) return null;
  const line = safeString(res.stdout).split(/\r?\n/).map((s) => s.trim()).find(Boolean);
  if (!line) return null;
  if (/^INFO:/i.test(line)) return null;
  // CSV: "Image Name","PID",...
  const m = line.match(/^"([^"]+)","(\d+)"/);
  if (!m) return null;
  if (Number(m[2]) !== pid) return null;
  return m[1];
};

const killPidWindows = (pid) => {
  const res = spawnSync("taskkill.exe", ["/F", "/PID", String(pid)], { encoding: "utf8" });
  return res.status === 0;
};

const getKnownKillableReason = ({ port, name, commandLine }) => {
  const n = safeString(name).toLowerCase();
  const cmd = safeString(commandLine).toLowerCase();
  const cmdPathNorm = normalizeWindowsPathForIncludes(commandLine);

  if (port === 8001 && n === "php.exe") {
    // Laravel's built-in server is a php process that runs this framework server script.
    // Only kill when the path is clearly inside THIS repo.
    const isLaravelServeInRepo =
      cmdPathNorm.includes(laravelRootNorm) &&
      cmdPathNorm.includes("\\vendor\\laravel\\framework\\src\\illuminate\\foundation\\") &&
      cmdPathNorm.includes("\\resources\\server.php");
    if (isLaravelServeInRepo) return "laravel-artisan-serve-in-repo";

    // `php artisan serve` without an absolute path is not safe to assume it's this repo.
    // (It could be any Laravel project using port 8001.)
    if (
      cmd.includes("artisan") &&
      cmd.includes("serve") &&
      (cmd.includes("--port=8001") || cmd.includes("--port 8001"))
    ) {
      return null;
    }
  }

  if (port === 3103 && n === "node.exe") {
    const isNextDevInRepo =
      cmdPathNorm.includes(frontendRootNorm) &&
      cmd.includes("next") &&
      cmd.includes("dev") &&
      (cmd.includes("-p 3103") ||
        cmd.includes("-p=3103") ||
        cmd.includes("--port 3103") ||
        cmd.includes("--port=3103"));
    if (isNextDevInRepo) return "next-dev-in-repo";

    // On Windows, Next can spawn a node process that listens on the port with a command line that
    // does NOT include `next dev` nor the port, e.g.:
    //   node.exe <frontend>\\node_modules\\next\\dist\\server\\lib\\start-server.js
    // Only kill when it is clearly within this repo's frontend directory.
    const isNextStartServerInRepo =
      cmdPathNorm.includes(frontendRootNorm) &&
      cmdPathNorm.includes("\\node_modules\\next\\dist\\server\\lib\\start-server.js");
    if (isNextStartServerInRepo) return "next-start-server-in-repo";
  }

  return null;
};

const tryFreePortWindows = async (port) => {
  const pids = getListeningPidsWindows(port);
  if (pids.length === 0) return { port, freed: false, details: [] };

  const details = [];
  let killedAny = false;

  for (const pid of pids) {
    const info = getProcessInfoWindows(pid);
    const name = info?.name ?? "unknown";
    const commandLine = info?.commandLine ?? "";
    const cmdOneLine = safeString(commandLine).replace(/\s+/g, " ").trim();

    details.push({ pid, name, commandLine });

    if (!info) {
      const image = getImageNameWindows(pid);
      console.log(
        `[preflight] Port ${port} is in use by PID ${pid} (${image || "unknown"}). Not killing (unable to inspect command line).`
      );
      continue;
    }

    const reason = getKnownKillableReason({ port, name, commandLine });
    if (reason && shouldKillKnown) {
      console.log(`[preflight] Port ${port} is in use by PID ${pid} (${name}). Killing (known: ${reason})...`);
      const ok = killPidWindows(pid);
      if (ok) {
        killedAny = true;
        console.log(`[preflight] Killed PID ${pid}.`);
      } else {
        console.log(`[preflight] Failed to kill PID ${pid}.`);
      }
    } else if (reason) {
      console.log(`[preflight] Port ${port} is in use by PID ${pid} (${name}). Not killing (known: ${reason}; auto-kill disabled).`);
      if (cmdOneLine) console.log(`[preflight] PID ${pid} CommandLine: ${cmdOneLine}`);
    } else {
      console.log(`[preflight] Port ${port} is in use by PID ${pid} (${name}). Not killing (unknown).`);
      if (cmdOneLine) console.log(`[preflight] PID ${pid} CommandLine: ${cmdOneLine}`);
    }
  }

  if (!killedAny) return { port, freed: false, details };

  for (let i = 0; i < 20; i += 1) {
    const check = await checkPort(port);
    if (check.free) return { port, freed: true, details };
    await sleep(250);
  }

  return { port, freed: false, details };
};

async function main(argv = process.argv.slice(2)) {
  const ports = parsePorts(argv);
  if (ports.length === 0) {
    console.error("[preflight] No ports provided. Usage: node tools/ensure-ports-free.cjs <port...>");
    process.exit(1);
  }

  const results = await Promise.all(ports.map(checkPort));
  const blocked = results.filter((item) => !item.free);

  if (blocked.length > 0) {
    if (isWindows) {
      if (isCi) console.log("[preflight] CI=true detected; auto-kill is disabled.");

      for (const item of blocked) {
        await tryFreePortWindows(item.port);
      }

      const retry = await Promise.all(ports.map(checkPort));
      const stillBlocked = retry.filter((item) => !item.free);
      if (stillBlocked.length === 0) {
        console.log("[preflight] Ports are free.");
        return;
      }

      const list = stillBlocked.map((item) => item.port).join(", ");
      console.error(`[preflight] Ports already in use: ${list}`);
      console.error("[preflight] Unable to auto-free all ports safely.");
      console.error("[preflight] Run: netstat -ano | findstr :PORT to identify the PID.");
      console.error("[preflight] Tip: set E2E_KILL_KNOWN_LISTENERS=0 to disable auto-kill.");
      process.exit(1);
    }

    const list = blocked.map((item) => item.port).join(", ");
    console.error(`[preflight] Ports already in use: ${list}`);
    console.error("[preflight] Run: netstat -ano | findstr :PORT to identify the PID.");
    process.exit(1);
  }

  console.log("[preflight] Ports are free.");
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(`[preflight] ERROR: ${err instanceof Error ? err.stack : String(err)}`);
    process.exit(1);
  });
}

module.exports = {
  main,
  getKnownKillableReason,
  normalizeWindowsPathForIncludes,
  frontendRoot,
  laravelRoot,
};
