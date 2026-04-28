import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import yaml from "js-yaml";

const PROJECT_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const NORMALIZED_DIR = join(PROJECT_ROOT, "docs", "Research", "normalized");
const NORMALIZED_YAML = join(NORMALIZED_DIR, "germany-market-research.yml");
const NORMALIZED_MARKDOWN = join(NORMALIZED_DIR, "germany-market-research.md");
const MARKET_COMPANIES = join(PROJECT_ROOT, "market", "germany", "companies.yml");

function uniqueValues(values) {
  return new Set(values.map((value) => value.toLowerCase()));
}

test("normalized Germany research is parseable and matches the runtime market pack", () => {
  const research = yaml.load(readFileSync(NORMALIZED_YAML, "utf8"));
  const market = yaml.load(readFileSync(MARKET_COMPANIES, "utf8"));

  for (const sourceFile of research.source_files) {
    assert.ok(existsSync(resolve(NORMALIZED_DIR, sourceFile)), `missing source file: ${sourceFile}`);
  }

  for (const runtimePath of Object.values(research.runtime_config)) {
    assert.ok(existsSync(resolve(NORMALIZED_DIR, runtimePath)), `missing runtime config: ${runtimePath}`);
  }

  assert.equal(research.market, "germany");
  assert.equal(research.normalization.raw_files_readable, true);
  assert.equal(research.normalization.raw_files_are_primary_source, false);
  assert.equal(research.normalization.api_ready_company_count, market.companies.length);
  assert.equal(research.normalization.backlog_company_count, market.backlog_companies.length);

  const marketCompanyNames = market.companies.map((company) => company.name);
  const backlogNames = market.backlog_companies.map((company) => company.name);
  const allNames = [...marketCompanyNames, ...backlogNames];
  assert.equal(uniqueValues(allNames).size, allNames.length, "company and backlog names must be unique");

  const apiUrls = market.companies.map((company) => company.api_url);
  assert.equal(new Set(apiUrls).size, apiUrls.length, "API-ready companies must not reuse api_url values");

  for (const company of market.companies) {
    assert.ok(company.ats_provider, `${company.name} missing ats_provider`);
    assert.ok(company.ats_slug, `${company.name} missing ats_slug`);
    assert.ok(company.api_url, `${company.name} missing api_url`);
    assert.ok(company.job_url_field, `${company.name} missing job_url_field`);
    assert.ok(company.job_id_field, `${company.name} missing job_id_field`);
    assert.ok(company.dedup_key, `${company.name} missing dedup_key`);
  }

  const indexNames = research.company_index.api_ready.map((company) => company.name).sort();
  const runtimeNames = [...marketCompanyNames].sort();
  assert.deepEqual(indexNames, runtimeNames);

  const indexBacklogNames = research.company_index.backlog.map((company) => company.name).sort();
  assert.deepEqual(indexBacklogNames, [...backlogNames].sort());
});

test("normalized Germany research does not contain raw research-tool citation tokens", () => {
  const markdown = readFileSync(NORMALIZED_MARKDOWN, "utf8");
  const normalizedYaml = readFileSync(NORMALIZED_YAML, "utf8");

  assert.doesNotMatch(markdown, /cite|turn\d+(search|view)\d+/);
  assert.doesNotMatch(normalizedYaml, /cite|turn\d+(search|view)\d+/);
});
