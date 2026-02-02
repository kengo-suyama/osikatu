const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const logsDir = path.join(__dirname, "..", "logs");
fs.mkdirSync(logsDir, { recursive: true });

const logBase = process.argv[2];
const commandArgs = process.argv.slice(3);

if (!logBase || commandArgs.length === 0) {
  console.error("Usage: node tools/run-with-log.cjs <logBase> <command...>");
  process.exit(1);
}

const now = new Date();
const pad = (value) => String(value).padStart(2, "0");
const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(
  now.getHours()
)}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
const logPath = path.join(logsDir, `${logBase}_${timestamp}.log`);

const logStream = fs.createWriteStream(logPath, { encoding: "utf8" });

const child = spawn(commandArgs.join(" "), {
  shell: true,
  stdio: ["inherit", "pipe", "pipe"],
});

child.stdout.on("data", (data) => {
  process.stdout.write(data);
  logStream.write(data);
});

child.stderr.on("data", (data) => {
  process.stderr.write(data);
  logStream.write(data);
});

child.on("close", (code) => {
  logStream.end();
  if (code !== 0) process.exit(code);
});
