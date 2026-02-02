const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const logsDir = path.join(__dirname, "..", "logs");
fs.mkdirSync(logsDir, { recursive: true });

const rawArgs = process.argv.slice(2);
let useTimestamp = false;
let logBase = null;
let commandArgs = [];
let sawSeparator = false;

for (let i = 0; i < rawArgs.length; i += 1) {
  const arg = rawArgs[i];
  if (arg === "--") {
    sawSeparator = true;
    commandArgs = rawArgs.slice(i + 1);
    break;
  }
  if (arg === "--ts") {
    useTimestamp = true;
    continue;
  }
  if (arg === "--name") {
    logBase = rawArgs[i + 1];
    i += 1;
    continue;
  }
  if (!logBase) {
    logBase = arg;
    continue;
  }
  commandArgs.push(arg);
}

if (!sawSeparator && commandArgs.length === 0) {
  commandArgs = rawArgs.slice(rawArgs.indexOf(logBase) + 1);
}

if (!logBase || commandArgs.length === 0) {
  console.error(
    "Usage: node tools/run-with-log.cjs [--name <logBase>] [--ts] -- <command...>"
  );
  process.exit(1);
}

const now = new Date();
const pad = (value) => String(value).padStart(2, "0");
const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(
  now.getHours()
)}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
const logPaths = [path.join(logsDir, `${logBase}.log`)];
if (useTimestamp) {
  logPaths.push(path.join(logsDir, `${logBase}_${timestamp}.log`));
}
const logStreams = logPaths.map((logPath) => fs.createWriteStream(logPath, { encoding: "utf8" }));

const child = spawn(commandArgs.join(" "), {
  shell: true,
  stdio: ["inherit", "pipe", "pipe"],
});

child.stdout.on("data", (data) => {
  process.stdout.write(data);
  for (const stream of logStreams) {
    stream.write(data);
  }
});

child.stderr.on("data", (data) => {
  process.stderr.write(data);
  for (const stream of logStreams) {
    stream.write(data);
  }
});

child.on("close", (code) => {
  for (const stream of logStreams) {
    stream.end();
  }
  if (code !== 0) process.exit(code);
});
