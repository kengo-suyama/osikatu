const net = require("net");

const ports = process.argv.slice(2).map((value) => Number(value)).filter(Boolean);

if (ports.length === 0) {
  console.error("[preflight] No ports provided. Usage: node tools/ensure-ports-free.cjs <port...>");
  process.exit(1);
}

const checkPort = (port) =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on("error", () => {
      resolve({ port, free: false });
    });
    server.listen({ port, host: "127.0.0.1" }, () => {
      server.close(() => resolve({ port, free: true }));
    });
  });

(async () => {
  const results = await Promise.all(ports.map(checkPort));
  const blocked = results.filter((item) => !item.free);

  if (blocked.length > 0) {
    const list = blocked.map((item) => item.port).join(", ");
    console.error(`[preflight] Ports already in use: ${list}`);
    console.error("[preflight] Run: netstat -ano | findstr :PORT to identify the PID.");
    process.exit(1);
  }

  console.log("[preflight] Ports are free.");
})();
