#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CORE_DIR = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

function runNodeScript(scriptName) {
  return spawnSync(process.execPath, [join(CORE_DIR, scriptName), ...args], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

const apiResult = runNodeScript("scan.mjs");
if (apiResult.stdout) process.stdout.write(apiResult.stdout);
if (apiResult.stderr) process.stderr.write(apiResult.stderr);

if (apiResult.status !== 0 && !/no locally scannable companies/i.test(apiResult.stderr || "")) {
  process.exit(apiResult.status || 1);
}

const browserResult = runNodeScript("browser-discover.mjs");
if (browserResult.stdout) process.stdout.write(browserResult.stdout);
if (browserResult.stderr) process.stderr.write(browserResult.stderr);

process.exit(browserResult.status || 0);
