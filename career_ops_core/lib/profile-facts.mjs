import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const EDUCATION_PATTERN = /\b(university|college|school|institute|bachelor|master|mba|phd|degree)\b/i;
const YEAR_PATTERN = /\b(?:19|20)\d{2}\b/;
const DATE_RANGE_PATTERN = /\b(?:19|20)\d{2}\s*[-–]\s*(?:present|current|(?:19|20)\d{2})\b/i;
const LOCATION_PATTERN = /^location:\s*(.+)$/i;

const CANONICAL_SKILLS = [
  "SQL",
  "CRM",
  "Python",
  "JavaScript",
  "TypeScript",
  "Product Marketing",
  "Growth Marketing",
  "Lifecycle",
  "Analytics",
  "Excel",
  "Salesforce",
  "HubSpot",
  "Figma",
  "Go-to-market",
];

function uniqueStrings(values = []) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

function stripFrontmatter(text) {
  if (!text.startsWith("---")) return text;
  const end = text.indexOf("\n---", 3);
  return end === -1 ? text : text.slice(end + 4).trimStart();
}

function toEntry(line) {
  return line.replace(/^[-*]\s*/, "").trim();
}

function normalizeSectionHeading(line) {
  const heading = line.replace(/^#+\s*/, "").trim().toLowerCase();
  if (heading.includes("experience")) return "experience";
  if (heading.includes("education")) return "education";
  if (heading.includes("project")) return "projects";
  if (heading.includes("language")) return "languages";
  if (heading.includes("skill")) return "skills";
  if (heading.includes("achievement")) return "achievements";
  return null;
}

function collectSources(normalizedDir) {
  return readdirSync(normalizedDir)
    .filter((file) => file.endsWith(".manifest.json"))
    .sort()
    .map((file) => JSON.parse(readFileSync(join(normalizedDir, file), "utf8")));
}

function collectDocuments(normalizedDir) {
  return readdirSync(normalizedDir)
    .filter((file) => file.endsWith(".md"))
    .filter((file) => file.toLowerCase() !== "readme.md")
    .sort()
    .map((file) => ({
      file,
      body: stripFrontmatter(readFileSync(join(normalizedDir, file), "utf8")),
    }));
}

function inferSeniority(text) {
  const lower = text.toLowerCase();
  if (/\b(principal|staff|head|director|lead)\b/.test(lower)) return "lead";
  if (/\bsenior\b/.test(lower)) return "senior";
  if (/\b(manager|specialist|consultant|analyst|engineer|marketer)\b/.test(lower)) return "mid";
  if (/\b(intern|junior|student|graduate)\b/.test(lower)) return "entry";
  return "unknown";
}

function scoreRoleSignals(text, roleFamilies = []) {
  const lower = text.toLowerCase();
  return roleFamilies
    .map((role) => {
      let score = 0;
      if (lower.includes(String(role.name).toLowerCase())) score += 8;
      for (const keyword of role.keywords || []) {
        if (lower.includes(String(keyword).toLowerCase())) score += 4;
      }
      return {
        name: role.name,
        score,
      };
    })
    .filter((role) => role.score > 0)
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name));
}

export function buildProfileFacts({ normalizedDir, roleFamilies = [] }) {
  const sources = collectSources(normalizedDir);
  const documents = collectDocuments(normalizedDir);
  const corpus = documents.map((document) => document.body).join("\n").trim();

  const contact = {
    emails: uniqueStrings(corpus.match(/[\w.+-]+@[\w.-]+\.\w+/g) || []),
    phones: uniqueStrings(corpus.match(/\+?\d[\d\s().-]{7,}\d/g) || []),
    urls: uniqueStrings(corpus.match(/https?:\/\/[^\s)]+/g) || []),
    locations: [],
  };

  const facts = {
    generatedAt: new Date().toISOString(),
    sources,
    contact,
    education: [],
    experience: [],
    projects: [],
    achievements: [],
    skills: [],
    languages: [],
    evidence: [],
    inferred: {
      roleSignals: [],
      seniority: { level: inferSeniority(corpus) },
      industrySignals: [],
    },
  };

  for (const document of documents) {
    let section = null;
    const sourceFile = sources.find((item) => item.outputFile === document.file)?.sourceFile || document.file;
    const lines = document.body.split("\n");

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const locationMatch = line.match(LOCATION_PATTERN);
      if (locationMatch) {
        facts.contact.locations = uniqueStrings([...facts.contact.locations, locationMatch[1]]);
      }

      if (rawLine.startsWith("#")) {
        section = normalizeSectionHeading(rawLine);
        continue;
      }

      const entry = toEntry(line);
      if (!entry) continue;

      if (section === "education") {
        facts.education.push({ summary: entry, sourceFile });
        continue;
      }
      if (section === "experience") {
        facts.experience.push({ summary: entry, sourceFile });
        if (/\d/.test(entry) && /\b(increased|grew|improved|launched|built|reduced|won)\b/i.test(entry)) {
          facts.achievements.push({ summary: entry, sourceFile });
        }
        if (/\d/.test(entry)) {
          facts.evidence.push({ sourceFile, excerpt: entry });
        }
        continue;
      }
      if (section === "projects") {
        facts.projects.push({ summary: entry, sourceFile });
        if (/\d/.test(entry) && /\b(increased|grew|improved|launched|built|reduced|won)\b/i.test(entry)) {
          facts.achievements.push({ summary: entry, sourceFile });
        }
        continue;
      }
      if (section === "languages") {
        const languages = entry.split(/[,;]+/).map((item) => item.trim()).filter(Boolean);
        facts.languages.push(...languages);
        continue;
      }
      if (section === "skills") {
        const skills = entry.split(/[,;|]+/).map((item) => item.trim()).filter(Boolean);
        facts.skills.push(...skills);
        continue;
      }
      if (section === "achievements") {
        facts.achievements.push({ summary: entry, sourceFile });
        continue;
      }

      if (EDUCATION_PATTERN.test(entry)) {
        facts.education.push({ summary: entry, sourceFile });
      } else if (DATE_RANGE_PATTERN.test(entry) || (YEAR_PATTERN.test(entry) && /\|/.test(entry))) {
        facts.experience.push({ summary: entry, sourceFile });
      } else if (/\b(project|launched|built|created|developed)\b/i.test(entry)) {
        facts.projects.push({ summary: entry, sourceFile });
      }

      if (/\d/.test(entry) && /\b(increased|grew|improved|launched|built|reduced|won)\b/i.test(entry)) {
        facts.achievements.push({ summary: entry, sourceFile });
      }

      if (facts.evidence.length < 12) {
        facts.evidence.push({ sourceFile, excerpt: entry });
      }
    }
  }

  const normalizedCorpus = corpus.toLowerCase();
  for (const skill of CANONICAL_SKILLS) {
    if (normalizedCorpus.includes(skill.toLowerCase())) {
      facts.skills.push(skill);
    }
  }

  facts.skills = uniqueStrings(facts.skills).sort((left, right) => left.localeCompare(right));
  facts.languages = uniqueStrings(facts.languages);
  facts.contact.locations = uniqueStrings(facts.contact.locations);
  facts.education = facts.education.filter((item, index, list) => list.findIndex((other) => other.summary === item.summary) === index);
  facts.experience = facts.experience.filter((item, index, list) => list.findIndex((other) => other.summary === item.summary) === index);
  facts.projects = facts.projects.filter((item, index, list) => list.findIndex((other) => other.summary === item.summary) === index);
  facts.achievements = facts.achievements.filter((item, index, list) => list.findIndex((other) => other.summary === item.summary) === index);
  facts.inferred.roleSignals = scoreRoleSignals(corpus, roleFamilies);

  return facts;
}
