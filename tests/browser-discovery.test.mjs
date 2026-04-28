import test from "node:test";
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";

function spawnNode(args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn("node", args, options);
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (status) => {
      resolve({ status, stdout, stderr });
    });
  });
}

function writeFakeHarness(root, payload) {
  const harnessPath = join(root, "fake-browser-harness.js");
  writeFileSync(
    harnessPath,
    `#!/usr/bin/env node
console.log("APPLYAI_BROWSER_RESULTS_START");
console.log(${JSON.stringify(JSON.stringify(payload))});
console.log("APPLYAI_BROWSER_RESULTS_END");
`,
    "utf8",
  );
  chmodSync(harnessPath, 0o755);
  return harnessPath;
}

function writeBaseFiles(root, portalsYaml) {
  mkdirSync(join(root, "data"), { recursive: true });
  writeFileSync(join(root, "data", "pipeline.md"), "# Pipeline\n\n## Pending\n\n## Processed\n", "utf8");
  writeFileSync(join(root, "data", "applications.md"), "# Applications Tracker\n", "utf8");
  writeFileSync(join(root, "portals.yml"), portalsYaml, "utf8");
}

test("browser discovery normalizes harness jobs and applies shared filters and deduplication", async () => {
  const root = mkdtempSync(join(tmpdir(), "apply-ai-browser-"));

  try {
    writeBaseFiles(
      root,
      `browser_discovery:
  enabled: true
  max_queries: 1
  max_backlog_companies: 1
tracked_companies: []
search_queries:
  - name: ai-product-berlin
    query: '"AI Product Manager" Berlin'
discovery_backlog: []
title_filter:
  positive: ["AI Product Manager"]
  negative: ["Intern"]
location_filter:
  include: ["Berlin"]
link_validation:
  enabled: false
`,
    );
    writeFileSync(
      join(root, "data", "scan-history.tsv"),
      "url\tfirst_seen\tportal\ttitle\tcompany\tstatus\nhttps://jobs.example.com/dupe\t2026-04-01\tbrowser-harness\tAI Product Manager\tSeen Co\tadded\n",
      "utf8",
    );

    const harnessPath = writeFakeHarness(root, {
      jobs: [
        {
          title: "AI Product Manager",
          company: "Fresh Co",
          location: "Berlin",
          url: "https://jobs.example.com/fresh?utm_source=test",
        },
        {
          title: "AI Product Manager",
          company: "Seen Co",
          location: "Berlin",
          url: "https://jobs.example.com/dupe?utm_source=test",
        },
        {
          title: "AI Product Manager",
          company: "Unsafe Co",
          location: "Berlin",
          url: "file:///tmp/job",
        },
      ],
    });

    const result = await spawnNode(
      ["/Users/adityagupta/Documents/Codex/apply-ai/career_ops_core/browser-discover.mjs"],
      {
        cwd: root,
        encoding: "utf8",
        env: {
          ...process.env,
          APPLYAI_BROWSER_HARNESS_BIN: harnessPath,
          APPLYAI_ALLOW_REAL_CHROME: "1",
        },
      },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Browser Discovery/);
    assert.match(result.stdout, /New offers added:\s+1/);

    const pipeline = readFileSync(join(root, "data", "pipeline.md"), "utf8");
    assert.match(pipeline, /https:\/\/jobs\.example\.com\/fresh \| Fresh Co \| AI Product Manager/);
    assert.doesNotMatch(pipeline, /dupe/);
    assert.doesNotMatch(pipeline, /Unsafe Co/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("browser discovery rejects harness output containing secret-like fields", async () => {
  const root = mkdtempSync(join(tmpdir(), "apply-ai-browser-"));

  try {
    writeBaseFiles(
      root,
      `browser_discovery:
  enabled: true
tracked_companies: []
search_queries:
  - name: unsafe
    query: '"AI Product Manager" Berlin'
discovery_backlog: []
title_filter:
  positive: ["AI Product Manager"]
  negative: []
location_filter:
  include: ["Berlin"]
`,
    );
    const harnessPath = writeFakeHarness(root, {
      jobs: [
        {
          title: "AI Product Manager",
          company: "Leaky Co",
          location: "Berlin",
          url: "https://jobs.example.com/leaky",
          sessionToken: "do-not-store",
        },
      ],
    });

    const result = await spawnNode(
      ["/Users/adityagupta/Documents/Codex/apply-ai/career_ops_core/browser-discover.mjs", "--dry-run"],
      {
        cwd: root,
        encoding: "utf8",
        env: {
          ...process.env,
          APPLYAI_BROWSER_HARNESS_BIN: harnessPath,
          APPLYAI_ALLOW_REAL_CHROME: "1",
        },
      },
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, /unsafe browser-harness output/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("scan:all continues to browser discovery when no API targets are available", async () => {
  const root = mkdtempSync(join(tmpdir(), "apply-ai-scan-all-"));

  try {
    writeBaseFiles(
      root,
      `browser_discovery:
  enabled: true
tracked_companies: []
search_queries:
  - name: broad
    query: '"AI Product Manager" Berlin'
discovery_backlog:
  - name: Custom Co
    careers_url: https://careers.example.com
    query: 'site:careers.example.com "AI Product Manager" Berlin'
title_filter:
  positive: ["AI Product Manager"]
  negative: []
location_filter:
  include: ["Berlin"]
link_validation:
  enabled: false
`,
    );
    const harnessPath = writeFakeHarness(root, {
      jobs: [
        {
          title: "AI Product Manager",
          company: "Custom Co",
          location: "Berlin",
          url: "https://careers.example.com/jobs/1",
        },
      ],
    });

    const result = await spawnNode(
      ["/Users/adityagupta/Documents/Codex/apply-ai/career_ops_core/scan-all.mjs"],
      {
        cwd: root,
        encoding: "utf8",
        env: {
          ...process.env,
          APPLYAI_BROWSER_HARNESS_BIN: harnessPath,
          APPLYAI_ALLOW_REAL_CHROME: "1",
        },
      },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /no locally scannable companies/i);
    assert.match(result.stdout, /Browser Discovery/);

    const pipeline = readFileSync(join(root, "data", "pipeline.md"), "utf8");
    assert.match(pipeline, /https:\/\/careers\.example\.com\/jobs\/1 \| Custom Co \| AI Product Manager/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
