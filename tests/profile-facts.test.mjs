import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildProfileFacts } from "../career_ops_core/lib/profile-facts.mjs";

test("buildProfileFacts extracts conservative facts and role signals from normalized markdown", () => {
  const root = mkdtempSync(join(tmpdir(), "apply-ai-facts-"));

  try {
    const normalizedDir = join(root, "normalized");
    mkdirSync(normalizedDir, { recursive: true });

    writeFileSync(
      join(normalizedDir, "resume.md"),
      `---
source_file: resume.pdf
converter: pdf-parse
---
# Jane Example

Email: jane@example.com
Location: Berlin, Germany

## Experience
- Senior Product Marketing Manager | Acme AI | 2021-2024
- Built lifecycle onboarding programs and product launches for AI SaaS products.
- Increased qualified pipeline by 32%.

## Education
- MBA in Marketing Analytics, University of Cologne

## Skills
Product Marketing, Lifecycle, SQL, CRM

## Languages
English (Fluent), German (B2)

## Projects
- Launched a cross-functional customer education program for enterprise buyers.
`,
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

    const facts = buildProfileFacts({
      normalizedDir,
      roleFamilies: [
        { name: "Product Marketing", keywords: ["product marketing", "go to market"] },
        { name: "Lifecycle Marketing", keywords: ["lifecycle", "retention"] },
      ],
    });

    assert.deepEqual(facts.contact.emails, ["jane@example.com"]);
    assert.match(facts.contact.locations[0], /Berlin/);
    assert.equal(facts.education.length, 1);
    assert.equal(facts.experience.length >= 1, true);
    assert.equal(facts.skills.includes("SQL"), true);
    assert.equal(facts.languages.includes("English (Fluent)"), true);
    assert.equal(facts.achievements.some((item) => /32%/.test(item.summary)), true);
    assert.equal(facts.inferred.roleSignals[0].name, "Product Marketing");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
