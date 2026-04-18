#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

import { buildPortalsConfig } from "./lib/portals-builder.mjs";

const CORE_DIR = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(CORE_DIR);

function loadYaml(path) {
  return yaml.load(readFileSync(path, "utf8"));
}

const preferences = loadYaml(join(projectRoot, "config", "user-preferences.yml"));
const companies = loadYaml(join(projectRoot, "market", "default", "companies.yml")).companies;
const queryTemplates = loadYaml(join(projectRoot, "market", "default", "queries.yml")).queries;

const acceptedNames = new Set(
  (preferences.companyPreferences.acceptedCompanies || []).map((name) => String(name).toLowerCase()),
);

const acceptedCompanies = companies
  .filter((company) => acceptedNames.has(company.name.toLowerCase()))
  .map((company) => ({
    ...company,
    role_fit: company.roleKeywords || [],
  }));

const config = buildPortalsConfig({
  preferences,
  acceptedCompanies,
  queryTemplates,
});

writeFileSync(join(projectRoot, "portals.yml"), yaml.dump(config, { lineWidth: 120 }), "utf8");

console.log(`Generated portals.yml with ${config.tracked_companies.length} tracked companies and ${config.search_queries.length} queries.`);
