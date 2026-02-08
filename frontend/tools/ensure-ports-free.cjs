const net = require("net");
const path = require("path");
const { spawnSync } = require("child_process");

const ports = process.argv.slice(2).map((value) => Number(value)).filter(Boolean);

if (ports.length === 0) {
  console.error("[preflight] No ports provided. Usage: node tools/ensure-ports-free.cjs <port...>");
  process.exit(1);
}

const isWindows = process.platform === "win32";
const shouldKillKnown = (() => {
  if (!isWindows) return false;
  const raw = (process.env.E2E_KILL_KNOWN_LISTENERS ?? "1").trim().toLowerCase();
  return raw !== "0" && raw !== "false" && raw !== "off";
})();

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
  // EADDRNOTAVAIL/EAFNOSUPPORT/EINVAL even if the port is actually usable for IPv4-only services.
  // Treat those as "skip IPv6 check" to avoid false negatives, while still catching EADDRINUSE.
  const v6Unsupported =
    v6.free === false &&
    (v6.errorCode === "EADDRNOTAVAIL" || v6.errorCode === "EAFNOSUPPORT" || v6.errorCode === "EINVAL");
  const v6FreeEffective = v6Unsupported ? true : Boolean(v6.free);

  return { port, free: Boolean(v4.free && v6FreeEffective), details: [v4, v6] };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const safeString = (value) => (typeof value === "string" ? value : "");

const normalizeWindowsPathForIncludes = (value) => safeString(value).replace(/\//g, "\\").toLowerCase();
const frontendRoot = path.resolve(__dirname, "..");
const frontendRootNorm = normalizeWindowsPathForIncludes(frontendRoot + path.sep);

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
  // Defensive validation: ensure pid is a finite positive number (PID 0 is System Idle Process, cannot be killed)
  if (!Number.isFinite(pid) || pid <= 0) return null;
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

const killPidWindows = (pid) => {
  const res = spawnSync("taskkill.exe", ["/F", "/PID", String(pid)], { encoding: "utf8" });
  return res.status === 0;
};

const isKnownKillableListener = ({ port, name, commandLine }) => {
  const n = safeString(name).toLowerCase();
  const cmd = safeString(commandLine).toLowerCase();
  const cmdPathNorm = normalizeWindowsPathForIncludes(commandLine);

  if (port === 8001 && n === "php.exe") {
    const isArtisanServe =
      cmd.includes("artisan") &&
      cmd.includes("serve") &&
      (cmd.includes("--port=8001") || cmd.includes("--port 8001")) &&
      (cmd.includes("--host=127.0.0.1") || cmd.includes("--host 127.0.0.1"));

    // Match Laravel's resources/server.php only when called via artisan serve (which we validate above).
    // Direct invocations of `php resources/server.php` are NOT matched because we can't validate
    // their host binding. This is intentional to avoid terminating network-exposed servers.
    // If you need to auto-kill direct invocations, add explicit host validation here.
    const isLaravelServerPhp = false; // Disabled: no host validation available for direct invocations

    // Only match PHP built-in server explicitly bound to localhost to avoid terminating
    // network-accessible servers (e.g., `php -S 0.0.0.0:8001` or `php -S 192.168.1.100:8001`)
    const isPhpBuiltInServer = cmd.includes(" -s ") && cmd.includes("127.0.0.1:8001");

    return isArtisanServe || isLaravelServerPhp || isPhpBuiltInServer;
  }

  if (port === 3103 && n === "node.exe") {
    // Only match Next.js dev server without explicit non-localhost host binding
    // to avoid terminating intentionally network-exposed servers.
    // Check for explicit network-exposed binding like --host 0.0.0.0, --host ::, or --host <IP>
    const hostMatch = cmd.match(/(?:--host|-h)[= ]([^\s]+)/);
    const hostValue = hostMatch ? hostMatch[1].toLowerCase() : null;
    
    const bindsToNonLocalhost = 
      hostValue !== null && 
      hostValue !== "localhost" && 
      hostValue !== "127.0.0.1" &&
      hostValue !== "::1";
    
    const isNextDev =
      !bindsToNonLocalhost &&
      cmd.includes("next") &&
      cmd.includes("dev") &&
      (cmd.includes("-p 3103") || cmd.includes("-p=3103") || cmd.includes("--port 3103") || cmd.includes("--port=3103"));

    // On Windows, Next can spawn a node process that listens on the port with a command line that
    // does NOT include `next dev` nor the port, e.g.:
    //   node.exe <frontend>\\node_modules\\next\\dist\\server\\lib\\start-server.js
    // Only consider it killable when it is clearly within this repo's frontend directory.
    const isNextStartServerInRepo =
      cmdPathNorm.includes(frontendRootNorm) &&
      cmdPathNorm.includes("\\node_modules\\next\\dist\\server\\lib\\start-server.js");

    return isNextDev || isNextStartServerInRepo;
  }

  return false;
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

    details.push({ pid, name, commandLine });

    if (!shouldKillKnown) continue;
    if (!info) continue;

    if (isKnownKillableListener({ port, name, commandLine })) {
      console.log(`[preflight] Port ${port} is in use by PID ${pid} (${name}). Killing (known listener)...`);
      const ok = killPidWindows(pid);
      if (ok) {
        killedAny = true;
        console.log(`[preflight] Killed PID ${pid}.`);
      } else {
        console.log(`[preflight] Failed to kill PID ${pid}.`);
      }
    } else {
      console.log(`[preflight] Port ${port} is in use by PID ${pid} (${name}). Not killing (unknown).`);
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

(async () => {
  const results = await Promise.all(ports.map(checkPort));
  const blocked = results.filter((item) => !item.free);

  if (blocked.length > 0) {
    if (isWindows) {
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
})();
