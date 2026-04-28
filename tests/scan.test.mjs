import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";

test("scan fails with actionable guidance when no local scanner targets are available", () => {
  const root = mkdtempSync(join(tmpdir(), "apply-ai-scan-"));

  try {
    mkdirSync(join(root, "data"), { recursive: true });
    writeFileSync(join(root, "data", "pipeline.md"), "# Pipeline\n\n## Pending\n\n## Processed\n", "utf8");
    writeFileSync(join(root, "data", "applications.md"), "# Applications Tracker\n", "utf8");
    writeFileSync(
      join(root, "portals.yml"),
      `tracked_companies: []
search_queries:
  - name: general-product-marketing
    query: 'site:company.com "Product Marketing" Germany'
discovery_backlog:
  - name: Custom Co
    reason: no supported api detected
`,
      "utf8",
    );

    const result = spawnSync("node", ["/Users/adityagupta/Documents/Codex/apply-ai/career_ops_core/scan.mjs", "--dry-run"], {
      cwd: root,
      encoding: "utf8",
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /no locally scannable companies/i);
    assert.match(result.stderr, /Codex-assisted discovery/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function withJsonServer(payload, fn) {
  const server = createServer((req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(payload));
  });

  return new Promise((resolve, reject) => {
    server.listen(0, "127.0.0.1", async () => {
      const { port } = server.address();
      try {
        resolve(await fn(`http://127.0.0.1:${port}/greenhouse`));
      } catch (err) {
        reject(err);
      } finally {
        server.close();
      }
    });
  });
}

function withJobServer(makePayload, fn) {
  const server = createServer((req, res) => {
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;

    if (req.url === "/greenhouse") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(makePayload(baseUrl)));
      return;
    }

    if (req.url === "/jobs/valid") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end("<!doctype html><title>Valid job</title>");
      return;
    }

    if (req.url === "/jobs/missing") {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("missing");
      return;
    }

    res.writeHead(500, { "content-type": "text/plain" });
    res.end("unexpected test path");
  });

  return new Promise((resolve, reject) => {
    server.listen(0, "127.0.0.1", async () => {
      const { port } = server.address();
      try {
        resolve(await fn(`http://127.0.0.1:${port}/greenhouse`));
      } catch (err) {
        reject(err);
      } finally {
        server.close();
      }
    });
  });
}

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

test("scan skips stale known-date jobs and fuzzy duplicates", async () => {
  const root = mkdtempSync(join(tmpdir(), "apply-ai-scan-"));

  try {
    mkdirSync(join(root, "data"), { recursive: true });
    writeFileSync(join(root, "data", "pipeline.md"), "# Pipeline\n\n## Pending\n\n## Processed\n", "utf8");
    writeFileSync(
      join(root, "data", "applications.md"),
      [
        "# Applications Tracker",
        "",
        "| # | Date | Company | Role | Score | Status | PDF | Report | Notes |",
        "|---|---|---|---|---|---|---|---|---|",
        "| 1 | 2026-04-01 | Fresh Co | Senior AI Engineer, Berlin | 4.1/5 | Evaluated | no | [001](reports/001.md) | |",
        "",
      ].join("\n"),
      "utf8",
    );
    writeFileSync(
      join(root, "data", "scan-history.tsv"),
      "url\tfirst_seen\tportal\ttitle\tcompany\tstatus\nhttps://jobs.example.com/job-2\t2026-04-01\tgreenhouse-api\tML Engineer\tFresh Co\tadded\n",
      "utf8",
    );

    const payload = {
      jobs: [
        {
          title: "Principal ML Engineer",
          absolute_url: "https://jobs.example.com/job-1",
          location: { name: "Berlin" },
          updated_at: "2000-01-01T00:00:00Z",
        },
        {
          title: "ML Engineer",
          absolute_url: "https://jobs.example.com/job-2?utm_source=feed",
          location: { name: "Berlin" },
          updated_at: "2999-01-01T00:00:00Z",
        },
        {
          title: "AI Engineer - Berlin",
          absolute_url: "https://jobs.example.com/job-3",
          location: { name: "Berlin" },
          updated_at: "2999-01-01T00:00:00Z",
        },
        {
          title: "AI Product Manager",
          absolute_url: "https://jobs.example.com/job-4?utm_source=feed",
          location: { name: "Berlin" },
          updated_at: "2999-01-01T00:00:00Z",
        },
      ],
    };

    await withJsonServer(payload, async (apiUrl) => {
      writeFileSync(
        join(root, "portals.yml"),
        `freshness:
  max_age_days: 365
tracked_companies:
  - name: Fresh Co
    api: ${apiUrl}
    careers_url: https://job-boards.greenhouse.io/freshco
title_filter:
  positive: ["AI", "ML", "Product"]
  negative: []
location_filter:
  include: ["Berlin"]
`,
        "utf8",
      );

      const result = await spawnNode(["/Users/adityagupta/Documents/Codex/apply-ai/career_ops_core/scan.mjs", "--dry-run"], {
        cwd: root,
        encoding: "utf8",
      });

      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /Filtered by age:\s+1 removed/);
      assert.match(result.stdout, /Duplicates:\s+2 skipped/);
      assert.match(result.stdout, /New offers added:\s+1/);
      assert.match(result.stdout, /Fresh Co \| AI Product Manager/);
      assert.doesNotMatch(result.stdout, /Principal ML Engineer/);
      assert.doesNotMatch(result.stdout, /AI Engineer - Berlin/);
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("scan rejects short-keyword substring matches and generic hybrid locations outside Germany", async () => {
  const root = mkdtempSync(join(tmpdir(), "apply-ai-scan-"));

  try {
    mkdirSync(join(root, "data"), { recursive: true });
    writeFileSync(join(root, "data", "pipeline.md"), "# Pipeline\n\n## Pending\n\n## Processed\n", "utf8");
    writeFileSync(join(root, "data", "applications.md"), "# Applications Tracker\n", "utf8");

    const payload = {
      jobs: [
        {
          title: "AI Product Manager",
          absolute_url: "https://jobs.example.com/job-valid",
          location: { name: "Berlin Office" },
          updated_at: "2999-01-01T00:00:00Z",
        },
        {
          title: "Senior Partnerships Manager - Spain/Italy",
          absolute_url: "https://jobs.example.com/job-spain",
          location: { name: "Madrid; Milan; Remotely in Spain" },
          updated_at: "2999-01-01T00:00:00Z",
        },
        {
          title: "Engineering Manager, AI Gateway",
          absolute_url: "https://jobs.example.com/job-us-ai",
          location: { name: "Hybrid - San Francisco" },
          updated_at: "2999-01-01T00:00:00Z",
        },
        {
          title: "Senior Partner Solutions Engineer",
          absolute_url: "https://jobs.example.com/job-us-solutions",
          location: { name: "Hybrid - San Francisco, New York City, Austin" },
          updated_at: "2999-01-01T00:00:00Z",
        },
      ],
    };

    await withJsonServer(payload, async (apiUrl) => {
      writeFileSync(
        join(root, "portals.yml"),
        `freshness:
  max_age_days: 365
tracked_companies:
  - name: Germany Co
    api: ${apiUrl}
    careers_url: https://job-boards.greenhouse.io/germanyco
title_filter:
  positive: ["AI", "Product Manager", "Solutions Engineer"]
  negative: []
location_filter:
  include: ["Germany", "Berlin", "Remote", "Hybrid"]
  exclude: ["United States"]
link_validation:
  enabled: false
`,
        "utf8",
      );

      const result = await spawnNode(["/Users/adityagupta/Documents/Codex/apply-ai/career_ops_core/scan.mjs", "--dry-run"], {
        cwd: root,
        encoding: "utf8",
      });

      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /Filtered by title:\s+1 removed/);
      assert.match(result.stdout, /Filtered by location:\s+2 removed/);
      assert.match(result.stdout, /New offers added:\s+1/);
      assert.match(result.stdout, /Germany Co \| AI Product Manager \| Berlin Office/);
      assert.doesNotMatch(result.stdout, /Spain\/Italy/);
      assert.doesNotMatch(result.stdout, /San Francisco/);
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("scan validates final job links and skips explicit missing links", async () => {
  const root = mkdtempSync(join(tmpdir(), "apply-ai-scan-"));

  try {
    mkdirSync(join(root, "data"), { recursive: true });
    writeFileSync(join(root, "data", "pipeline.md"), "# Pipeline\n\n## Pending\n\n## Processed\n", "utf8");
    writeFileSync(join(root, "data", "applications.md"), "# Applications Tracker\n", "utf8");

    await withJobServer((baseUrl) => ({
      jobs: [
        {
          title: "AI Product Manager",
          absolute_url: `${baseUrl}/jobs/valid`,
          location: { name: "Berlin" },
          updated_at: "2999-01-01T00:00:00Z",
        },
        {
          title: "AI Solutions Engineer",
          absolute_url: `${baseUrl}/jobs/missing`,
          location: { name: "Berlin" },
          updated_at: "2999-01-01T00:00:00Z",
        },
      ],
    }), async (apiUrl) => {
      writeFileSync(
        join(root, "portals.yml"),
        `freshness:
  max_age_days: 365
tracked_companies:
  - name: Link Co
    api: ${apiUrl}
    careers_url: https://job-boards.greenhouse.io/linkco
title_filter:
  positive: ["AI", "Product Manager", "Solutions Engineer"]
  negative: []
location_filter:
  include: ["Germany", "Berlin"]
link_validation:
  enabled: true
`,
        "utf8",
      );

      const result = await spawnNode(["/Users/adityagupta/Documents/Codex/apply-ai/career_ops_core/scan.mjs", "--dry-run"], {
        cwd: root,
        encoding: "utf8",
      });

      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /Invalid links:\s+1 removed/);
      assert.match(result.stdout, /New offers added:\s+1/);
      assert.match(result.stdout, /Link Co \| AI Product Manager \| Berlin/);
      assert.doesNotMatch(result.stdout, /AI Solutions Engineer/);
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("scan uses explicit ATS API metadata when careers URL is company-owned", async () => {
  const root = mkdtempSync(join(tmpdir(), "apply-ai-scan-"));

  try {
    mkdirSync(join(root, "data"), { recursive: true });
    writeFileSync(join(root, "data", "pipeline.md"), "# Pipeline\n\n## Pending\n\n## Processed\n", "utf8");
    writeFileSync(join(root, "data", "applications.md"), "# Applications Tracker\n", "utf8");

    const payload = {
      jobs: [
        {
          id: "job-1",
          title: "AI Solutions Engineer",
          jobUrl: "https://jobs.ashbyhq.com/example/12345678-1234-1234-1234-123456789abc",
          location: { name: "Remote Germany" },
          publishedAt: "2999-01-01T00:00:00Z",
        },
      ],
    };

    await withJsonServer(payload, async (apiUrl) => {
      writeFileSync(
        join(root, "portals.yml"),
        `tracked_companies:
  - name: Example AI
    careers_url: https://example.ai/careers
    ats_provider: ashby
    api_url: ${apiUrl}
title_filter:
  positive: ["AI", "Solutions"]
  negative: []
location_filter:
  include: ["Germany"]
`,
        "utf8",
      );

      const result = await spawnNode(["/Users/adityagupta/Documents/Codex/apply-ai/career_ops_core/scan.mjs", "--dry-run"], {
        cwd: root,
        encoding: "utf8",
      });

      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /Companies scanned:\s+1/);
      assert.match(result.stdout, /New offers added:\s+1/);
      assert.match(result.stdout, /Example AI \| AI Solutions Engineer \| Remote Germany/);
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
