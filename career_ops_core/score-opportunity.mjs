#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

import { scoreOpportunity } from "./lib/opportunity-scoring.mjs";

const CORE_DIR = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(CORE_DIR);

function loadYaml(path) {
  return yaml.load(readFileSync(path, "utf8"));
}

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: node career_ops_core/score-opportunity.mjs <opportunity.json>");
    process.exit(1);
  }

  const resolvedInput = resolve(process.cwd(), inputPath);
  if (!existsSync(resolvedInput)) {
    console.error(`Opportunity file not found: ${resolvedInput}`);
    process.exit(1);
  }

  const preferencesPath = join(projectRoot, "config", "user-preferences.yml");
  const factsPath = join(projectRoot, "profile", "facts.yml");
  if (!existsSync(preferencesPath)) {
    console.error("config/user-preferences.yml not found.");
    process.exit(1);
  }
  if (!existsSync(factsPath)) {
    console.error("profile/facts.yml not found. Run `npm run profile:build` first.");
    process.exit(1);
  }

  const preferences = loadYaml(preferencesPath);
  const profileFacts = loadYaml(factsPath);
  const opportunity = loadYaml(resolvedInput);

  const result = scoreOpportunity({
    opportunity,
    preferences,
    profileFacts,
  });

  console.log(JSON.stringify(result, null, 2));
}

main();
