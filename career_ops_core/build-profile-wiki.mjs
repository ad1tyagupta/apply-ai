#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

import { buildProfileWiki } from "./lib/profile-wiki.mjs";

const CORE_DIR = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(CORE_DIR);

const preferences = yaml.load(readFileSync(join(projectRoot, "config", "user-preferences.yml"), "utf8"));

buildProfileWiki({
  normalizedDir: join(projectRoot, preferences.documents.normalizedDir),
  wikiDir: join(projectRoot, preferences.documents.wikiDir),
});

console.log(`Profile wiki refreshed in ${preferences.documents.wikiDir}.`);
