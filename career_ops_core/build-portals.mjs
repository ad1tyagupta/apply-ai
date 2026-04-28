#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

import { buildPortalsConfig, selectCompaniesForPortals } from "./lib/portals-builder.mjs";
import { loadMarketData } from "./lib/market-loader.mjs";
import { assessOnboardingState } from "./lib/workflow-state.mjs";

const CORE_DIR = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(CORE_DIR);

function loadYaml(path) {
  return yaml.load(readFileSync(path, "utf8"));
}

const preferences = loadYaml(join(projectRoot, "config", "user-preferences.yml"));
const market = loadMarketData(projectRoot, preferences);
const companies = market.companies;
const queryTemplates = market.queries;
const rawDir = join(projectRoot, preferences.documents?.rawDir || "intake/raw");
const normalizedDir = join(projectRoot, preferences.documents?.normalizedDir || "intake/normalized");
const factsPath = join(projectRoot, preferences.documents?.factsPath || "profile/facts.yml");
const recommendationsPath = join(projectRoot, preferences.documents?.recommendationsPath || "profile/recommendations.yml");

const state = assessOnboardingState(preferences, {
  rawDocumentCount: existsSync(rawDir) ? readdirSync(rawDir).filter((file) => file.toLowerCase() !== "readme.md").length : 0,
  normalizedDocumentCount: existsSync(normalizedDir) ? readdirSync(normalizedDir).filter((file) => file.endsWith(".md") && file.toLowerCase() !== "readme.md").length : 0,
  hasProfileFacts: existsSync(factsPath),
});

if (!state.readyForDiscovery) {
  console.error("Cannot build portals yet:");
  for (const step of state.missingSteps) {
    console.error(`- ${step}`);
  }
  process.exit(1);
}

const recommendations = existsSync(recommendationsPath) ? loadYaml(recommendationsPath) : null;
const companySelection = selectCompaniesForPortals({
  preferences,
  companies,
  recommendations,
});

const config = buildPortalsConfig({
  preferences,
  acceptedCompanies: companySelection.companies,
  queryTemplates,
  companySelectionSource: companySelection.source,
  recommendationFallbackCount: companySelection.recommendationFallbackCount,
});

writeFileSync(join(projectRoot, "portals.yml"), yaml.dump(config, { lineWidth: 120 }), "utf8");

if (companySelection.source === "recommendations") {
  console.log(`No accepted companies configured; using ${companySelection.recommendationFallbackCount} top recommended companies for the scan plan.`);
}
console.log(`Generated portals.yml for ${market.name} with ${config.tracked_companies.length} tracked companies, ${config.discovery_backlog.length} backlog companies, and ${config.search_queries.length} Codex discovery queries.`);
