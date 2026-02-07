const net = require("net");
const { execFileSync } = require("child_process");

const ports = process.argv.slice(2).map((value) => Number(value)).filter(Boolean);

if (ports.length === 0) {
  console.error("[preflight] No ports provided. Usage: node tools/ensure-ports-free.cjs <port...>");
  process.exit(1);
}

const checkPort = (port, host) =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on("error", () => {
      resolve({ port, host, free: false });
    });
    server.listen({ port, host }, () => {
      server.close(() => resolve({ port, host, free: true }));
    });
  });

const getListeningPidsForPort = (port) => {
  if (process.platform !== "win32") return [];
  try {
    const out = execFileSync("netstat", ["-ano"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 5) continue;
      if (parts[0].toUpperCase() !== "TCP") continue;
      if (parts[3].toUpperCase() !== "LISTENING") continue;
      const local = parts[1];
      const localPort = Number(local.slice(local.lastIndexOf(":") + 1));
      if (!Number.isFinite(localPort) || localPort !== port) continue;
      const pid = Number(parts[4]);
      if (Number.isFinite(pid) && pid > 0) pids.add(pid);
    }
    return Array.from(pids);
  } catch {
    return [];
  }
};

const getImageName = (pid) => {
  if (process.platform !== "win32") return null;
  try {
    const out = execFileSync("tasklist", ["/FI", `PID eq ${pid}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    for (const rawLine of out.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || !line.includes(String(pid))) continue;
      const cols = line.split(/\s+/);
      if (cols.length >= 2 && cols[1] === String(pid)) return cols[0];
    }
    return null;
  } catch {
    return null;
  }
};

const KILLABLE = new Set(["php.exe", "node.exe", "cmd.exe"]);

const tryAutoKill = (port) => {
  if (process.platform !== "win32") return false;
  const pids = getListeningPidsForPort(port);
  if (pids.length === 0) return false;
  let killed = false;
  for (const pid of pids) {
    const image = (getImageName(pid) || "").toLowerCase();
    if (!KILLABLE.has(image)) {
      console.warn(`[preflight] port ${port} in use by pid=${pid} (${image || "unknown"}); not killing.`);
      continue;
    }
    console.warn(`[preflight] auto-killing known listener on port ${port}: pid=${pid} (${image})`);
    try {
      execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
      killed = true;
    } catch {
      // ignore
    }
  }
  return killed;
};

(async () => {
  // Check both IPv4 and IPv6 for each port.
  const checks = [];
  for (const port of ports) {
    checks.push(checkPort(port, "127.0.0.1"));
    checks.push(checkPort(port, "::1"));
  }
  let results = await Promise.all(checks);
  let blocked = results.filter((item) => !item.free);

  // On Windows, attempt auto-kill for known listeners, then recheck.
  if (blocked.length > 0 && process.platform === "win32") {
    const portsToRetry = new Set(blocked.map((item) => item.port));
    let anyKilled = false;
    for (const port of portsToRetry) {
      if (tryAutoKill(port)) anyKilled = true;
    }
    if (anyKilled) {
      // Brief pause for OS to release ports.
      await new Promise((r) => setTimeout(r, 1000));
      const rechecks = [];
      for (const port of portsToRetry) {
        rechecks.push(checkPort(port, "127.0.0.1"));
        rechecks.push(checkPort(port, "::1"));
      }
      const recheckResults = await Promise.all(rechecks);
      // Merge: keep non-retried results + recheck results.
      results = results.filter((item) => !portsToRetry.has(item.port)).concat(recheckResults);
      blocked = results.filter((item) => !item.free);
    }
  }

  if (blocked.length > 0) {
    const list = blocked.map((item) => `${item.port} (${item.host})`).join(", ");
    console.error(`[preflight] Ports already in use: ${list}`);
    console.error("[preflight] Run: netstat -ano | findstr :PORT to identify the PID.");
    process.exit(1);
  }

  console.log("[preflight] Ports are free (IPv4 + IPv6).");
})();
