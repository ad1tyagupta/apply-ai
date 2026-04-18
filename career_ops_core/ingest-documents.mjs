#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

import { defaultConverters, ingestDocuments } from "./lib/document-ingest.mjs";

const CORE_DIR = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(CORE_DIR);

function loadPreferences() {
  const text = readFileSync(join(projectRoot, "config", "user-preferences.yml"), "utf8");
  return yaml.load(text);
}

async function main() {
  const preferences = loadPreferences();
  const rawDir = join(projectRoot, preferences.documents.rawDir);
  const normalizedDir = join(projectRoot, preferences.documents.normalizedDir);
  const converters = await defaultConverters();
  const results = await ingestDocuments({ rawDir, normalizedDir, converters });

  console.log(`Ingested ${results.length} document${results.length === 1 ? "" : "s"} into ${preferences.documents.normalizedDir}.`);
}

main().catch((error) => {
  console.error("ingest-documents.mjs failed:", error.message);
  process.exit(1);
});
