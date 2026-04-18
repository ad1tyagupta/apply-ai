import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function collectSources(normalizedDir) {
  const files = readdirSync(normalizedDir).filter((file) => file.endsWith(".manifest.json")).sort();
  return files.map((file) => JSON.parse(readFileSync(join(normalizedDir, file), "utf8")));
}

function collectDocumentBodies(normalizedDir) {
  return readdirSync(normalizedDir)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((file) => ({
      file,
      body: readFileSync(join(normalizedDir, file), "utf8"),
    }));
}

function writePage(wikiDir, fileName, title, bodyLines) {
  writeFileSync(
    join(wikiDir, fileName),
    [`# ${title}`, "", ...bodyLines, ""].join("\n"),
    "utf8",
  );
}

export function buildProfileWiki({ normalizedDir, wikiDir }) {
  mkdirSync(wikiDir, { recursive: true });

  const sources = collectSources(normalizedDir);
  const documents = collectDocumentBodies(normalizedDir);
  const sourceLines = sources.length > 0
    ? sources.map((source) => `- \`${source.sourceFile}\` via \`${source.converter}\``)
    : ["- No source manifests found yet."];

  const evidenceBlocks = documents.flatMap((document) => {
    const lines = document.body.split("\n").filter((line) => line.trim());
    return [`## ${document.file}`, "", ...lines.slice(0, 20), ""];
  });

  writePage(wikiDir, "personal-summary.md", "Personal Summary", [
    "Use this page as the concise candidate overview during evaluation and document drafting.",
    "",
    "## Source Documents",
    ...sourceLines,
    "",
    "## Summary Guidance",
    "- Add only claims that can be traced back to the source documents above.",
    "- Keep geography, role preferences, and career narrative aligned with `config/user-preferences.yml`.",
  ]);

  writePage(wikiDir, "education.md", "Education", [
    "Capture factual education history here with source-backed evidence only.",
    "",
    "## Source Documents",
    ...sourceLines,
  ]);

  writePage(wikiDir, "experience.md", "Experience", [
    "Capture role history, employers, dates, and responsibilities here.",
    "",
    "## Source Documents",
    ...sourceLines,
  ]);

  writePage(wikiDir, "skills-and-tools.md", "Skills And Tools", [
    "Track skills only when a source document supports them.",
    "",
    "## Source Documents",
    ...sourceLines,
  ]);

  writePage(wikiDir, "languages.md", "Languages", [
    "Track language ability conservatively. Do not infer fluency.",
    "",
    "## Source Documents",
    ...sourceLines,
  ]);

  writePage(wikiDir, "achievements-and-evidence.md", "Achievements And Evidence", [
    "Use the excerpts below as raw evidence. Translate them into CV or cover-letter bullets only when they remain factual.",
    "",
    ...evidenceBlocks,
  ]);

  writePage(wikiDir, "constraints.md", "Constraints", [
    "- No invented metrics, employers, dates, or language ability.",
    "- Generated CVs and cover letters must stay grounded in source documents.",
    "- Keep submission decisions manual.",
  ]);

  writePage(wikiDir, "target-roles.md", "Target Roles", [
    "Record the 10 to 20 shortlisted role families here after onboarding.",
  ]);

  writePage(wikiDir, "target-companies.md", "Target Companies", [
    "Record the accepted and user-added company targets here after onboarding.",
  ]);
}
