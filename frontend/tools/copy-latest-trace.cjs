const fs = require("fs");
const path = require("path");

const rawArgs = process.argv.slice(2);
let outDir = "test-results/tools";
let useTimestamp = false;

for (let i = 0; i < rawArgs.length; i += 1) {
  const arg = rawArgs[i];
  if (arg === "--outDir") {
    outDir = rawArgs[i + 1];
    i += 1;
    continue;
  }
  if (arg === "--ts") {
    useTimestamp = true;
  }
}

const root = path.join(__dirname, "..");
const resultsDir = path.join(root, "test-results");
const resolvedOutDir = path.join(root, outDir);

const now = new Date();
const pad = (value) => String(value).padStart(2, "0");
const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(
  now.getHours()
)}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

const collectTraceZips = (dir) => {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTraceZips(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".zip") && entry.name.includes("trace")) {
      const stats = fs.statSync(fullPath);
      files.push({ path: fullPath, mtimeMs: stats.mtimeMs });
    }
  }
  return files;
};

const traces = collectTraceZips(resultsDir).sort((a, b) => b.mtimeMs - a.mtimeMs);

if (traces.length === 0) {
  console.error("[FAIL] No trace zip found under test-results.");
  process.exit(1);
}

fs.mkdirSync(resolvedOutDir, { recursive: true });

const latest = traces[0];
const fileName = useTimestamp ? `trace_${timestamp}.zip` : "trace_latest.zip";
const destPath = path.join(resolvedOutDir, fileName);

fs.copyFileSync(latest.path, destPath);
console.log(`[PASS] Trace copied: ${destPath}`);
