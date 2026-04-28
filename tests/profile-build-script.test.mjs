import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import yaml from "js-yaml";

test("profile build uses the active market role families", () => {
  const root = join(tmpdir(), `apply-ai-profile-build-${process.pid}-${Date.now()}`);

  try {
    mkdirSync(root, { recursive: true });
    cpSync("career_ops_core", join(root, "career_ops_core"), { recursive: true });
    symlinkSync(join(process.cwd(), "node_modules"), join(root, "node_modules"), "dir");
    mkdirSync(join(root, "config"), { recursive: true });
    mkdirSync(join(root, "market", "default"), { recursive: true });
    mkdirSync(join(root, "market", "germany"), { recursive: true });
    mkdirSync(join(root, "intake", "normalized"), { recursive: true });

    writeFileSync(
      join(root, "config", "user-preferences.yml"),
      yaml.dump({
        market: { active: "germany" },
        documents: {
          normalizedDir: "intake/normalized",
          wikiDir: "profile/wiki",
          factsPath: "profile/facts.yml",
        },
      }),
      "utf8",
    );
    writeFileSync(
      join(root, "market", "default", "role-families.yml"),
      "role_families:\n  - name: Product Marketing\n    keywords: [product marketing]\n",
      "utf8",
    );
    writeFileSync(
      join(root, "market", "default", "companies.yml"),
      "companies: []\n",
      "utf8",
    );
    writeFileSync(
      join(root, "market", "default", "queries.yml"),
      "queries: []\n",
      "utf8",
    );
    writeFileSync(
      join(root, "market", "default", "filters.yml"),
      "hard_stops: []\n",
      "utf8",
    );
    writeFileSync(
      join(root, "market", "germany", "role-families.yml"),
      "role_families:\n  - name: AI Solutions Engineering\n    keywords: [AI, Solutions Engineer, LLM]\n",
      "utf8",
    );
    writeFileSync(
      join(root, "intake", "normalized", "resume.md"),
      "# Resume\n\n## Experience\n- Built LLM workflows as an AI Solutions Engineer.\n",
      "utf8",
    );
    writeFileSync(
      join(root, "intake", "normalized", "resume.manifest.json"),
      JSON.stringify({ sourceFile: "resume.md", outputFile: "resume.md", converter: "markdown-copy" }),
      "utf8",
    );

    const result = spawnSync("node", ["career_ops_core/build-profile-wiki.mjs"], {
      cwd: root,
      encoding: "utf8",
    });

    assert.equal(result.status, 0, result.stderr);
    const facts = yaml.load(readFileSync(join(root, "profile", "facts.yml"), "utf8"));
    assert.equal(facts.inferred.roleSignals[0].name, "AI Solutions Engineering");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
