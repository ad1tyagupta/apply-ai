#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

import { inspectRawDocuments } from "./lib/document-ingest.mjs";

const CORE_DIR = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(CORE_DIR);

function loadPreferences() {
  const text = readFileSync(join(projectRoot, "config", "user-preferences.yml"), "utf8");
  return yaml.load(text);
}

function main() {
  const preferences = loadPreferences();
  const rawDir = join(projectRoot, preferences.documents?.rawDir || "intake/raw");
  const inspection = inspectRawDocuments({ rawDir });

  console.log(`Upload folder: ${inspection.uploadFolder}`);

  if (inspection.documents.length === 0) {
    console.log("No uploaded documents found yet.");
    console.log("Ask the user to add focused career documents, then run `npm run uploads:check` again.");
    return;
  }

  console.log(`Found ${inspection.documents.length} uploaded document${inspection.documents.length === 1 ? "" : "s"}:`);
  for (const document of inspection.documents) {
    const status = document.supported ? "supported" : "unsupported";
    console.log(`- ${document.fileName} (${status}, ${document.fileSizeBytes} bytes)`);
    if (document.warning) {
      console.log(`  Warning: ${document.warning}`);
    }
  }

  console.log("Confirm these are the intended uploads with the user before running `npm run ingest`.");
}

main();
