import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const normalize = (text) => text.replace(/\r\n/g, "\n");

const templatePath = path.join(rootDir, "docs", "README.template.md");
const agentsPath = path.join(rootDir, "AGENTS.md");
const samplePath = path.join(rootDir, "docs", "samples", "owner_dashboard.sample.json");
const outputPath = path.join(rootDir, "README.md");

const template = normalize(fs.readFileSync(templatePath, "utf8"));
const agents = normalize(fs.readFileSync(agentsPath, "utf8")).trimEnd();
const sample = normalize(fs.readFileSync(samplePath, "utf8")).trim();

const replaceOrThrow = (source, marker, value) => {
  if (!source.includes(marker)) {
    throw new Error(`Marker not found: ${marker}`);
  }
  return source.replace(marker, value);
};

let output = template;
output = replaceOrThrow(output, "<!-- INCLUDE:AGENTS -->", agents);
output = replaceOrThrow(output, "<!-- INCLUDE:OWNER_DASHBOARD_SAMPLE -->", sample);

fs.writeFileSync(outputPath, `${output.trimEnd()}\n`, "utf8");

console.log("README.md generated.");
