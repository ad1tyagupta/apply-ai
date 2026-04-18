import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ingestDocuments } from "../career_ops_core/lib/document-ingest.mjs";

async function withTempDir(fn) {
  const tempRoot = mkdtempSync(join(tmpdir(), "career-ops-ingest-"));
  try {
    return await fn(tempRoot);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

test("ingestDocuments copies markdown and text sources into normalized markdown with manifests", async () => {
  await withTempDir(async (root) => {
    const rawDir = join(root, "raw");
    const normalizedDir = join(root, "normalized");
    mkdirSync(rawDir, { recursive: true });

    writeFileSync(join(rawDir, "resume.md"), "# Resume\n\nBuilt lifecycle campaigns.\n", "utf8");
    writeFileSync(join(rawDir, "notes.txt"), "MBA in marketing analytics", "utf8");

    const results = await ingestDocuments({
      rawDir,
      normalizedDir,
      converters: {
        pdf: async () => {
          throw new Error("pdf converter should not run");
        },
        docx: async () => {
          throw new Error("docx converter should not run");
        },
        image: async () => {
          throw new Error("image converter should not run");
        },
      },
    });

    assert.equal(results.length, 2);
    assert.equal(existsSync(join(normalizedDir, "resume.md")), true);
    assert.equal(existsSync(join(normalizedDir, "notes.md")), true);

    const manifestPath = join(normalizedDir, "resume.manifest.json");
    assert.equal(existsSync(manifestPath), true);

    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    assert.equal(manifest.sourceFile, "resume.md");
    assert.equal(manifest.outputFile, "resume.md");
    assert.equal(manifest.converter, "markdown-copy");
  });
});

test("ingestDocuments routes pdf, docx, and image files to the correct converters", async () => {
  await withTempDir(async (root) => {
    const rawDir = join(root, "raw");
    const normalizedDir = join(root, "normalized");
    mkdirSync(rawDir, { recursive: true });

    writeFileSync(join(rawDir, "portfolio.pdf"), "fake", "utf8");
    writeFileSync(join(rawDir, "history.docx"), "fake", "utf8");
    writeFileSync(join(rawDir, "certificate.png"), "fake", "utf8");

    const calls = [];

    const results = await ingestDocuments({
      rawDir,
      normalizedDir,
      converters: {
        pdf: async (filePath) => {
          calls.push(["pdf", filePath]);
          return "pdf body";
        },
        docx: async (filePath) => {
          calls.push(["docx", filePath]);
          return "docx body";
        },
        image: async (filePath) => {
          calls.push(["image", filePath]);
          return "image body";
        },
      },
    });

    assert.equal(results.length, 3);
    assert.deepEqual(
      calls.map(([kind]) => kind).sort(),
      ["docx", "image", "pdf"],
    );
    assert.match(readFileSync(join(normalizedDir, "portfolio.md"), "utf8"), /pdf body/);
    assert.match(readFileSync(join(normalizedDir, "history.md"), "utf8"), /docx body/);
    assert.match(readFileSync(join(normalizedDir, "certificate.md"), "utf8"), /image body/);
  });
});

test("ingestDocuments ignores template README files in the raw folder", async () => {
  await withTempDir(async (root) => {
    const rawDir = join(root, "raw");
    const normalizedDir = join(root, "normalized");
    mkdirSync(rawDir, { recursive: true });

    writeFileSync(join(rawDir, "README.md"), "# Instructions", "utf8");

    const results = await ingestDocuments({
      rawDir,
      normalizedDir,
      converters: {
        pdf: async () => "",
        docx: async () => "",
        image: async () => "",
      },
    });

    assert.equal(results.length, 0);
  });
});
