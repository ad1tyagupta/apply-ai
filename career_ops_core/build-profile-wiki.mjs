#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

import { buildProfileWiki } from "./lib/profile-wiki.mjs";
import { buildProfileFacts } from "./lib/profile-facts.mjs";
import { loadMarketData } from "./lib/market-loader.mjs";

const CORE_DIR = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(CORE_DIR);

const preferences = yaml.load(readFileSync(join(projectRoot, "config", "user-preferences.yml"), "utf8"));
const market = loadMarketData(projectRoot, preferences);
const roleFamilies = market.roleFamilies;
const factsPath = join(projectRoot, preferences.documents?.factsPath || "profile/facts.yml");
mkdirSync(join(projectRoot, "profile"), { recursive: true });

const facts = buildProfileFacts({
  normalizedDir: join(projectRoot, preferences.documents.normalizedDir),
  roleFamilies,
});

writeFileSync(factsPath, yaml.dump(facts, { lineWidth: 120, noRefs: true }), "utf8");

buildProfileWiki({
  normalizedDir: join(projectRoot, preferences.documents.normalizedDir),
  wikiDir: join(projectRoot, preferences.documents.wikiDir),
  facts,
});

console.log(`Profile facts refreshed in ${preferences.documents?.factsPath || "profile/facts.yml"} and wiki refreshed in ${preferences.documents.wikiDir} for ${market.name}.`);
