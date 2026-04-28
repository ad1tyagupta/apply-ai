#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

import { loadMarketData } from "./lib/market-loader.mjs";
import { recommendTargets } from "./lib/recommendations.mjs";

const CORE_DIR = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(CORE_DIR);

function loadYaml(path) {
  return yaml.load(readFileSync(path, "utf8"));
}

const preferences = loadYaml(join(projectRoot, "config", "user-preferences.yml"));
const market = loadMarketData(projectRoot, preferences);
const roleFamilies = market.roleFamilies;
const companies = market.companies;
const factsPath = join(projectRoot, preferences.documents?.factsPath || "profile/facts.yml");
const recommendationsPath = join(projectRoot, preferences.documents?.recommendationsPath || "profile/recommendations.yml");

if (!existsSync(factsPath)) {
  console.error(`Profile facts not found at ${preferences.documents?.factsPath || "profile/facts.yml"}. Run \`npm run profile:build\` first.`);
  process.exit(1);
}

const facts = loadYaml(factsPath);

const recommendations = recommendTargets({
  profile: {
    targetRoles: [...new Set([
      ...(preferences.rolePreferences.preferredRoleFamilies || []),
      ...(preferences.rolePreferences.includedKeywords || []),
    ])],
    confirmedKeywords: preferences.rolePreferences.includedKeywords,
    preferredIndustries: preferences.rolePreferences.preferredIndustries,
    preferredCompanyStages: preferences.rolePreferences.preferredCompanyStages,
    inferredRoleSignals: facts.inferred?.roleSignals || [],
    skills: facts.skills || [],
  },
  roleFamilies,
  companies,
  roleLimit: 12,
  companyLimit: 25,
});

mkdirSync(join(projectRoot, "profile"), { recursive: true });
writeFileSync(
  recommendationsPath,
  yaml.dump({
    generatedAt: new Date().toISOString(),
    summary: recommendations.summary,
    roles: recommendations.roles,
    companies: recommendations.companies,
  }, { lineWidth: 120, noRefs: true }),
  "utf8",
);

const lines = [
  "# Target Recommendations",
  "",
  "## Role Families",
  "",
  ...recommendations.roles.map((role) => `- ${role.name} (${Math.round(role.confidence * 100)}%) — ${role.reason}`),
  "",
  "## Companies",
  "",
  ...recommendations.companies.map((company) => `- ${company.name} (${Math.round(company.confidence * 100)}%) — ${company.reason}`),
  "",
  "Review these with the user. Confirm final choices in `config/user-preferences.yml`; keep generated suggestions in `profile/recommendations.yml`.",
  "",
];

writeFileSync(join(projectRoot, "profile", "target-recommendations.md"), lines.join("\n"), "utf8");

console.log(`Wrote ${recommendations.roles.length} role recommendations and ${recommendations.companies.length} company recommendations for ${market.name}.`);
