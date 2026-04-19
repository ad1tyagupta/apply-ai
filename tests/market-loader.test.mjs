import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { loadMarketData, resolveMarketName } from "../career_ops_core/lib/market-loader.mjs";

const PROJECT_ROOT = "/Users/adityagupta/Documents/Codex/apply-ai";

test("loadMarketData reads the active market and falls back to default parts", () => {
  const root = mkdtempSync(join(tmpdir(), "apply-ai-market-"));

  try {
    mkdirSync(join(root, "market", "default"), { recursive: true });
    mkdirSync(join(root, "market", "germany"), { recursive: true });

    writeFileSync(join(root, "market", "default", "companies.yml"), "companies:\n  - name: Default Co\n", "utf8");
    writeFileSync(join(root, "market", "default", "queries.yml"), "queries:\n  - name: default-query\n    template: default\n", "utf8");
    writeFileSync(join(root, "market", "default", "role-families.yml"), "role_families:\n  - name: Default Role\n", "utf8");
    writeFileSync(join(root, "market", "default", "filters.yml"), "hard_stops: []\n", "utf8");

    writeFileSync(join(root, "market", "germany", "companies.yml"), "companies:\n  - name: German Co\nbacklog_companies:\n  - name: Backlog Co\n", "utf8");
    writeFileSync(join(root, "market", "germany", "queries.yml"), "queries:\n  - name: germany-query\n    template: germany\n", "utf8");

    const market = loadMarketData(root, { market: { active: "germany" } });

    assert.equal(resolveMarketName({ market: { active: "germany" } }), "germany");
    assert.equal(market.name, "germany");
    assert.deepEqual(market.companies.map((company) => company.name), ["German Co"]);
    assert.deepEqual(market.backlogCompanies.map((company) => company.name), ["Backlog Co"]);
    assert.deepEqual(market.queries.map((query) => query.name), ["germany-query"]);
    assert.deepEqual(market.roleFamilies.map((role) => role.name), ["Default Role"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("germany market pack exposes API-ready ATS metadata", () => {
  const market = loadMarketData(PROJECT_ROOT, { market: { active: "germany" } });
  const names = new Set(market.companies.map((company) => company.name));
  const parloa = market.companies.find((company) => company.name === "Parloa");
  const n8n = market.companies.find((company) => company.name === "n8n");

  assert.equal(market.name, "germany");
  assert.ok(market.companies.length >= 25);
  assert.ok(market.backlogCompanies.length >= 5);
  assert.ok(names.has("DeepL"));
  assert.ok(names.has("Black Forest Labs"));
  assert.ok(names.has("Vercel"));
  assert.equal(parloa.ats_provider, "greenhouse");
  assert.match(parloa.api_url, /greenhouse/i);
  assert.equal(n8n.ats_provider, "ashby");
  assert.match(n8n.api_url, /ashbyhq/i);
});
