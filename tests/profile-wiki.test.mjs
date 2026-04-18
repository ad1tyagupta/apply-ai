import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildProfileWiki } from "../career_ops_core/lib/profile-wiki.mjs";

test("buildProfileWiki writes structured markdown pages with source provenance", () => {
  const root = mkdtempSync(join(tmpdir(), "career-ops-wiki-"));

  try {
    const normalizedDir = join(root, "normalized");
    const wikiDir = join(root, "wiki");
    mkdirSync(normalizedDir, { recursive: true });

    writeFileSync(
      join(normalizedDir, "resume.md"),
      "# Resume\n\n## Experience\nBuilt lifecycle marketing programs.\n\n## Education\nMBA in Marketing Analytics.\n",
      "utf8",
    );

    writeFileSync(
      join(normalizedDir, "resume.manifest.json"),
      JSON.stringify({
        sourceFile: "resume.pdf",
        outputFile: "resume.md",
        converter: "pdf-parse",
      }, null, 2),
      "utf8",
    );

    buildProfileWiki({ normalizedDir, wikiDir });

    const summary = readFileSync(join(wikiDir, "personal-summary.md"), "utf8");
    const evidence = readFileSync(join(wikiDir, "achievements-and-evidence.md"), "utf8");

    assert.match(summary, /Source Documents/);
    assert.match(summary, /resume\.pdf/);
    assert.match(evidence, /Built lifecycle marketing programs/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
