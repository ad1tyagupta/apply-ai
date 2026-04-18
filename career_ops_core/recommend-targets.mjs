#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

import { recommendTargets } from "./lib/recommendations.mjs";

const CORE_DIR = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(CORE_DIR);

function loadYaml(path) {
  return yaml.load(readFileSync(path, "utf8"));
}

const preferences = loadYaml(join(projectRoot, "config", "user-preferences.yml"));
const roleFamilies = loadYaml(join(projectRoot, "market", "default", "role-families.yml")).role_families;
const companies = loadYaml(join(projectRoot, "market", "default", "companies.yml")).companies;

const recommendations = recommendTargets({
  profile: {
    targetRoles: preferences.rolePreferences.preferredRoleFamilies,
    preferredIndustries: preferences.rolePreferences.preferredIndustries,
    preferredCompanyStages: preferences.rolePreferences.preferredCompanyStages,
  },
  roleFamilies,
  companies,
  roleLimit: 12,
  companyLimit: 25,
});

const lines = [
  "# Target Recommendations",
  "",
  "## Role Families",
  "",
  ...recommendations.roles.map((role) => `- ${role.name} — ${role.reason}`),
  "",
  "## Companies",
  "",
  ...recommendations.companies.map((company) => `- ${company.name} — ${company.reason}`),
  "",
  "Review these with the user and copy accepted companies into `config/user-preferences.yml`.",
  "",
];

writeFileSync(join(projectRoot, "profile", "target-recommendations.md"), lines.join("\n"), "utf8");

console.log(`Wrote ${recommendations.roles.length} role recommendations and ${recommendations.companies.length} company recommendations.`);
