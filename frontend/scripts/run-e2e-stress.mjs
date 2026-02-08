#!/usr/bin/env node
// E2E Stress Runner — runs the smoke suite N times and reports pass/fail.
import { execSync } from "node:child_process";

const RUNS = parseInt(process.argv[2] || "5", 10);
const COMMAND =
  process.env.E2E_STRESS_CMD ||
  "npx playwright test tests/e2e/circle-hub-navigation.spec.ts tests/e2e/quick-mode-switch.spec.ts tests/e2e/log-diary-create.spec.ts tests/e2e/oshi-profile-edit.spec.ts --reporter=line --workers=1";

let passed = 0;
let failed = 0;
const failures = [];

console.log(`=== E2E Stress Runner: ${RUNS} iterations ===\n`);

for (let i = 1; i <= RUNS; i++) {
  process.stdout.write(`Run ${i}/${RUNS} ... `);
  try {
    execSync(COMMAND, {
      stdio: "pipe",
      cwd: process.cwd(),
      timeout: 300_000,
    });
    passed++;
    console.log("PASS");
  } catch (err) {
    failed++;
    console.log("FAIL");
    const stderr = err.stderr?.toString().slice(-500) ?? "";
    failures.push({ run: i, stderr });
  }
}

console.log(
  `\n=== Results: ${passed} passed, ${failed} failed out of ${RUNS} ===`,
);

if (failures.length > 0) {
  console.log("\nFailure details:");
  for (const f of failures) {
    console.log(
      `  Run ${f.run}:\n    ${f.stderr.split("\n").slice(-3).join("\n    ")}`,
    );
  }
  process.exit(1);
}

process.exit(0);
