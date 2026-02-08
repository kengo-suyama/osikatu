const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { getKnownKillableReason, frontendRoot, laravelRoot } = require("./ensure-ports-free.cjs");

test("getKnownKillableReason: Next start-server.js inside this repo is killable on 3103", () => {
  const startServer = path.join(frontendRoot, "node_modules", "next", "dist", "server", "lib", "start-server.js");
  const reason = getKnownKillableReason({
    port: 3103,
    name: "node.exe",
    commandLine: `node.exe "${startServer}"`,
  });
  assert.equal(reason, "next-start-server-in-repo");
});

test("getKnownKillableReason: Next dev inside this repo is killable on 3103", () => {
  const nextBin = path.join(frontendRoot, "node_modules", ".bin", "next");
  const reason = getKnownKillableReason({
    port: 3103,
    name: "node.exe",
    commandLine: `node.exe "${nextBin}" dev -p 3103`,
  });
  assert.equal(reason, "next-dev-in-repo");
});

test("getKnownKillableReason: Next dev outside this repo is NOT killable on 3103", () => {
  const reason = getKnownKillableReason({
    port: 3103,
    name: "node.exe",
    commandLine: "node.exe C:\\other\\project\\node_modules\\.bin\\next dev -p 3103",
  });
  assert.equal(reason, null);
});

test("getKnownKillableReason: Laravel framework server.php inside this repo is killable on 8001", () => {
  const serverPhp = path.join(
    laravelRoot,
    "vendor",
    "laravel",
    "framework",
    "src",
    "Illuminate",
    "Foundation",
    "resources",
    "server.php"
  );
  const reason = getKnownKillableReason({
    port: 8001,
    name: "php.exe",
    commandLine: `php.exe -S 127.0.0.1:8001 -t "${path.join(laravelRoot, "public")}" "${serverPhp}"`,
  });
  assert.equal(reason, "laravel-artisan-serve-in-repo");
});

test("getKnownKillableReason: php artisan serve without repo paths is NOT killable on 8001", () => {
  const reason = getKnownKillableReason({
    port: 8001,
    name: "php.exe",
    commandLine: "php.exe artisan serve --host=127.0.0.1 --port=8001",
  });
  assert.equal(reason, null);
});

