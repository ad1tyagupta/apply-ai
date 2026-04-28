import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { isHttpUrl } from "./url-safety.mjs";

export const SCAN_HISTORY_PATH = "data/scan-history.tsv";
export const PIPELINE_PATH = "data/pipeline.md";
export const APPLICATIONS_PATH = "data/applications.md";

const LINK_VALIDATION_TIMEOUT_MS = 5_000;
const MISSING_LINK_STATUSES = new Set([404, 410]);

export function formatLocation(location) {
  if (!location) return "";
  if (typeof location === "string") return location;
  if (Array.isArray(location)) return location.map(formatLocation).filter(Boolean).join(", ");
  if (typeof location === "object") {
    return location.name || location.locationName || location.city || location.country || location.region || "";
  }
  return String(location);
}

export function buildTitleFilter(titleFilter) {
  const positive = titleFilter?.positive || [];
  const negative = titleFilter?.negative || [];

  return (title) => {
    const hasPositive = positive.length === 0 || positive.some((keyword) => keywordMatches(title, keyword));
    const hasNegative = negative.some((keyword) => keywordMatches(title, keyword));
    return hasPositive && !hasNegative;
  };
}

export function normalizeMatchText(value = "") {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function keywordMatches(value = "", keyword = "") {
  const normalizedValue = normalizeMatchText(value);
  const normalizedKeyword = normalizeMatchText(keyword);
  if (!normalizedValue || !normalizedKeyword) return false;

  return ` ${normalizedValue} `.includes(` ${normalizedKeyword} `);
}

const GENERIC_LOCATION_TERMS = new Set([
  "hybrid",
  "on site",
  "onsite",
  "remote",
]);

function isGenericLocationTerm(term = "") {
  return GENERIC_LOCATION_TERMS.has(normalizeMatchText(term));
}

export function buildLocationFilter(locationFilter) {
  const include = locationFilter?.include || [];
  const exclude = locationFilter?.exclude || [];
  const geographicInclude = include.filter((term) => !isGenericLocationTerm(term));

  return (location = "") => {
    if (include.length === 0 && exclude.length === 0) return true;

    if (exclude.some((keyword) => keywordMatches(location, keyword))) return false;
    if (include.length === 0) return true;

    if (geographicInclude.length > 0) {
      return geographicInclude.some((keyword) => keywordMatches(location, keyword));
    }

    return include.some((keyword) => keywordMatches(location, keyword));
  };
}

export function buildFreshnessFilter(freshness = {}) {
  const maxAgeDays = Number(freshness.max_age_days ?? freshness.max_job_age_days ?? 60);
  if (!Number.isFinite(maxAgeDays) || maxAgeDays <= 0) return () => true;

  const now = new Date();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

  return (postedAt) => {
    if (!postedAt) return true;
    const postedDate = parsePostedDate(postedAt);
    if (!postedDate) return true;
    return now.getTime() - postedDate.getTime() <= maxAgeMs;
  };
}

export function parsePostedDate(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    const ms = value > 10_000_000_000 ? value : value * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function buildLinkValidator(linkValidation = {}) {
  if (linkValidation.enabled !== true) return async () => true;

  const missingStatuses = new Set(linkValidation.reject_statuses || [...MISSING_LINK_STATUSES]);
  return async (url) => validateJobLink(url, missingStatuses);
}

export async function validateJobLink(url, missingStatuses = MISSING_LINK_STATUSES) {
  if (!isHttpUrl(url)) return false;

  const headStatus = await fetchStatus(new URL(String(url).trim()).toString(), "HEAD");
  if (missingStatuses.has(headStatus)) return false;
  if (headStatus === 405 || headStatus === 501) {
    const getStatus = await fetchStatus(new URL(String(url).trim()).toString(), "GET");
    return !missingStatuses.has(getStatus);
  }

  return true;
}

async function fetchStatus(url, method) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LINK_VALIDATION_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
    });
    return res.status;
  } catch {
    return 0;
  } finally {
    clearTimeout(timer);
  }
}

export function canonicalizeJobUrl(rawUrl = "") {
  let parsed;
  try {
    parsed = new URL(String(rawUrl).trim());
  } catch {
    return String(rawUrl || "").trim();
  }

  parsed.hash = "";
  parsed.hostname = parsed.hostname.toLowerCase();
  const trackingParams = [
    "gh_src",
    "source",
    "utm_campaign",
    "utm_content",
    "utm_medium",
    "utm_source",
    "utm_term",
  ];
  for (const param of trackingParams) parsed.searchParams.delete(param);

  const sortedParams = [...parsed.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
  parsed.search = "";
  for (const [key, value] of sortedParams) parsed.searchParams.append(key, value);

  return parsed.toString().replace(/\/$/, "");
}

export function normalizeCompany(name = "") {
  return String(name).toLowerCase()
    .replace(/[()]/g, "")
    .replace(/\b(inc|llc|ltd|corp|corporation|technologies|technology|group|co)\b\.?/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeRole(role = "") {
  return String(role).toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/[^a-z0-9 /-]/g, " ")
    .replace(/[-/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ROLE_STOPWORDS = new Set([
  "senior", "junior", "lead", "staff", "principal", "head", "chief",
  "manager", "director", "associate", "intern", "contractor",
  "remote", "hybrid", "onsite",
]);

const LOCATION_STOPWORDS = new Set([
  "berlin", "germany", "munich", "hamburg", "tokyo", "japan", "london",
  "paris", "singapore", "york", "francisco", "angeles", "seattle",
  "austin", "boston", "chicago", "denver", "toronto", "amsterdam",
  "dublin", "sydney", "global", "emea", "apac", "latam",
]);

function roleFuzzyMatch(a, b) {
  const terms = (role) => normalizeRole(role)
    .split(/\s+/)
    .filter((word) => word.length > 1 && !ROLE_STOPWORDS.has(word) && !LOCATION_STOPWORDS.has(word));

  const wordsA = terms(a);
  const wordsB = terms(b);
  if (wordsA.length === 0 || wordsB.length === 0) return false;

  const overlap = wordsA.filter((word) => wordsB.some((other) => other === word || other.includes(word) || word.includes(other)));
  const smaller = Math.min(wordsA.length, wordsB.length);
  return overlap.length >= 2 && overlap.length / smaller >= 0.6;
}

export function hasSeenCompanyRole(seenCompanyRoles, company, role) {
  const normCompany = normalizeCompany(company);
  return seenCompanyRoles.some((seen) =>
    seen.company === normCompany && (seen.role === normalizeRole(role) || roleFuzzyMatch(seen.role, role))
  );
}

export function loadSeenUrls({
  scanHistoryPath = SCAN_HISTORY_PATH,
  pipelinePath = PIPELINE_PATH,
  applicationsPath = APPLICATIONS_PATH,
} = {}) {
  const seen = new Set();

  if (existsSync(scanHistoryPath)) {
    const lines = readFileSync(scanHistoryPath, "utf-8").split("\n");
    for (const line of lines.slice(1)) {
      const url = line.split("\t")[0];
      if (url) seen.add(canonicalizeJobUrl(url));
    }
  }

  if (existsSync(pipelinePath)) {
    const text = readFileSync(pipelinePath, "utf-8");
    for (const match of text.matchAll(/- \[[ x]\] (https?:\/\/\S+)/g)) {
      seen.add(canonicalizeJobUrl(match[1]));
    }
  }

  if (existsSync(applicationsPath)) {
    const text = readFileSync(applicationsPath, "utf-8");
    for (const match of text.matchAll(/https?:\/\/[^\s|)]+/g)) {
      seen.add(canonicalizeJobUrl(match[0]));
    }
  }

  return seen;
}

export function loadSeenCompanyRoles({
  pipelinePath = PIPELINE_PATH,
  applicationsPath = APPLICATIONS_PATH,
} = {}) {
  const seen = [];

  if (existsSync(pipelinePath)) {
    const text = readFileSync(pipelinePath, "utf-8");
    for (const match of text.matchAll(/- \[[ x]\] (?:https?:\/\/\S+|local:\S+)\s+\|\s*([^|]+)\s+\|\s*([^\n|]+)/g)) {
      const company = normalizeCompany(match[1]);
      const role = normalizeRole(match[2]);
      if (company && role) seen.push({ company, role });
    }
  }

  if (existsSync(applicationsPath)) {
    const text = readFileSync(applicationsPath, "utf-8");
    for (const line of text.split("\n")) {
      if (!line.trim().startsWith("|") || line.includes("---")) continue;
      const parts = line.split("|").map((part) => part.trim());
      if (parts.length < 5) continue;
      const entryNumber = Number.parseInt(parts[1], 10);
      if (!Number.isFinite(entryNumber)) continue;
      const company = normalizeCompany(parts[3]);
      const role = normalizeRole(parts[4]);
      if (company && role && company !== "company" && role !== "role") {
        seen.push({ company, role });
      }
    }
  }
  return seen;
}

export function appendToPipeline(offers, { pipelinePath = PIPELINE_PATH } = {}) {
  if (offers.length === 0) return;

  let text = readFileSync(pipelinePath, "utf-8");
  const marker = text.includes("## Pending") ? "## Pending" : "## Pendientes";
  const idx = text.indexOf(marker);
  if (idx === -1) {
    let procIdx = text.indexOf("## Processed");
    if (procIdx === -1) procIdx = text.indexOf("## Procesadas");
    const insertAt = procIdx === -1 ? text.length : procIdx;
    const block = `\n${marker}\n\n` + offers.map((offer) =>
      `- [ ] ${offer.url} | ${offer.company} | ${offer.title}`
    ).join("\n") + "\n\n";
    text = text.slice(0, insertAt) + block + text.slice(insertAt);
  } else {
    const afterMarker = idx + marker.length;
    const nextSection = text.indexOf("\n## ", afterMarker);
    const insertAt = nextSection === -1 ? text.length : nextSection;

    const block = "\n" + offers.map((offer) =>
      `- [ ] ${offer.url} | ${offer.company} | ${offer.title}`
    ).join("\n") + "\n";
    text = text.slice(0, insertAt) + block + text.slice(insertAt);
  }

  writeFileSync(pipelinePath, text, "utf-8");
}

export function appendToScanHistory(offers, date, { scanHistoryPath = SCAN_HISTORY_PATH } = {}) {
  if (!existsSync(scanHistoryPath)) {
    writeFileSync(scanHistoryPath, "url\tfirst_seen\tportal\ttitle\tcompany\tstatus\n", "utf-8");
  }

  const lines = offers.map((offer) =>
    `${offer.url}\t${date}\t${offer.source}\t${offer.title}\t${offer.company}\tadded`
  ).join("\n") + "\n";

  appendFileSync(scanHistoryPath, lines, "utf-8");
}

export function createFilterState() {
  return {
    totalFiltered: 0,
    totalLocationFiltered: 0,
    totalAgeFiltered: 0,
    totalInvalidLinks: 0,
    totalDupes: 0,
    filterExamples: {
      title: [],
      location: [],
      age: [],
      invalidLink: [],
      duplicate: [],
    },
  };
}

export function rememberFilterExample(filterExamples, kind, job, detail = "") {
  if (!filterExamples[kind] || filterExamples[kind].length >= 3) return;
  filterExamples[kind].push({
    title: job.title || "(untitled)",
    company: job.company || "",
    location: job.location || "",
    detail,
  });
}

export async function filterJobs(jobs, {
  titleFilter,
  locationFilter,
  freshnessFilter,
  linkValidator,
  seenUrls,
  seenCompanyRoles,
  source,
  state = createFilterState(),
}) {
  const newOffers = [];

  for (const job of jobs) {
    if (!titleFilter(job.title)) {
      state.totalFiltered++;
      rememberFilterExample(state.filterExamples, "title", job);
      continue;
    }
    if (!locationFilter(job.location)) {
      state.totalLocationFiltered++;
      rememberFilterExample(state.filterExamples, "location", job);
      continue;
    }
    if (!freshnessFilter(job.postedAt)) {
      state.totalAgeFiltered++;
      rememberFilterExample(state.filterExamples, "age", job, job.postedAt || "no date");
      continue;
    }
    const canonicalUrl = canonicalizeJobUrl(job.url);
    if (!isHttpUrl(canonicalUrl)) {
      state.totalInvalidLinks++;
      rememberFilterExample(state.filterExamples, "invalidLink", job, job.url || "empty URL");
      continue;
    }
    if (seenUrls.has(canonicalUrl)) {
      state.totalDupes++;
      rememberFilterExample(state.filterExamples, "duplicate", job, canonicalUrl);
      continue;
    }
    if (hasSeenCompanyRole(seenCompanyRoles, job.company, job.title)) {
      state.totalDupes++;
      rememberFilterExample(state.filterExamples, "duplicate", job, "matched existing company + role");
      continue;
    }
    if (!(await linkValidator(canonicalUrl))) {
      state.totalInvalidLinks++;
      rememberFilterExample(state.filterExamples, "invalidLink", job, canonicalUrl);
      continue;
    }

    seenUrls.add(canonicalUrl);
    seenCompanyRoles.push({ company: normalizeCompany(job.company), role: normalizeRole(job.title) });
    newOffers.push({ ...job, url: canonicalUrl, source });
  }

  return newOffers;
}

export function printFilterExamples(filterExamples) {
  const labels = {
    title: "Title filter examples",
    location: "Location filter examples",
    age: "Freshness filter examples",
    invalidLink: "Invalid link examples",
    duplicate: "Duplicate examples",
  };

  for (const [kind, examples] of Object.entries(filterExamples)) {
    if (examples.length === 0) continue;
    console.log(`\n${labels[kind]}:`);
    for (const example of examples) {
      const parts = [
        example.company,
        example.title,
        example.location,
        example.detail,
      ].filter(Boolean);
      console.log(`  - ${parts.join(" | ")}`);
    }
  }
}
