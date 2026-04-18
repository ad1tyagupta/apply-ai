import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

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
