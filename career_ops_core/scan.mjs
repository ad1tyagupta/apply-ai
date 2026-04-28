#!/usr/bin/env node

/**
 * scan.mjs — Zero-token portal scanner
 *
 * Fetches Greenhouse, Ashby, and Lever APIs directly, applies title
 * filters from portals.yml, deduplicates against existing history,
 * and appends new offers to pipeline.md + scan-history.tsv.
 *
 * Zero Claude API tokens — pure HTTP + JSON.
 *
 * Usage:
 *   node scan.mjs                  # scan all enabled companies
 *   node scan.mjs --dry-run        # preview without writing files
 *   node scan.mjs --company Cohere # scan a single company
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import yaml from 'js-yaml';
import { detectApi } from './lib/discovery.mjs';
const parseYaml = yaml.load;

// ── Config ──────────────────────────────────────────────────────────

const PORTALS_PATH = 'portals.yml';
const SCAN_HISTORY_PATH = 'data/scan-history.tsv';
const PIPELINE_PATH = 'data/pipeline.md';
const APPLICATIONS_PATH = 'data/applications.md';

// Ensure required directories exist (fresh setup)
mkdirSync('data', { recursive: true });

const CONCURRENCY = 10;
const FETCH_TIMEOUT_MS = 10_000;
const LINK_VALIDATION_TIMEOUT_MS = 5_000;
const MISSING_LINK_STATUSES = new Set([404, 410]);

// ── API parsers ─────────────────────────────────────────────────────

function parseGreenhouse(json, companyName) {
  const jobs = json.jobs || [];
  return jobs.map(j => ({
    title: j.title || '',
    url: j.absolute_url || '',
    company: companyName,
    location: formatLocation(j.location),
    postedAt: j.updated_at || j.published_at || j.first_published || j.created_at || '',
  }));
}

function parseAshby(json, companyName) {
  const jobs = json.jobs || [];
  return jobs.map(j => ({
    title: j.title || '',
    url: j.jobUrl || '',
    company: companyName,
    location: formatLocation(j.location || j.locationName || j.locations),
    postedAt: j.publishedAt || j.updatedAt || j.createdAt || '',
  }));
}

function parseLever(json, companyName) {
  if (!Array.isArray(json)) return [];
  return json.map(j => ({
    title: j.text || '',
    url: j.hostedUrl || j.applyUrl || '',
    company: companyName,
    location: formatLocation(j.categories?.location || j.workplaceType || j.location),
    postedAt: j.createdAt || '',
  }));
}

const PARSERS = { greenhouse: parseGreenhouse, ashby: parseAshby, lever: parseLever };

function formatLocation(location) {
  if (!location) return '';
  if (typeof location === 'string') return location;
  if (Array.isArray(location)) return location.map(formatLocation).filter(Boolean).join(', ');
  if (typeof location === 'object') {
    return location.name || location.locationName || location.city || location.country || location.region || '';
  }
  return String(location);
}

// ── Fetch with timeout ──────────────────────────────────────────────

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ── Title filter ────────────────────────────────────────────────────

function buildTitleFilter(titleFilter) {
  const positive = titleFilter?.positive || [];
  const negative = titleFilter?.negative || [];

  return (title) => {
    const hasPositive = positive.length === 0 || positive.some(k => keywordMatches(title, k));
    const hasNegative = negative.some(k => keywordMatches(title, k));
    return hasPositive && !hasNegative;
  };
}

function normalizeMatchText(value = '') {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function keywordMatches(value = '', keyword = '') {
  const normalizedValue = normalizeMatchText(value);
  const normalizedKeyword = normalizeMatchText(keyword);
  if (!normalizedValue || !normalizedKeyword) return false;

  return ` ${normalizedValue} `.includes(` ${normalizedKeyword} `);
}

const GENERIC_LOCATION_TERMS = new Set([
  'hybrid',
  'on site',
  'onsite',
  'remote',
]);

function isGenericLocationTerm(term = '') {
  return GENERIC_LOCATION_TERMS.has(normalizeMatchText(term));
}

function buildLocationFilter(locationFilter) {
  const include = locationFilter?.include || [];
  const exclude = locationFilter?.exclude || [];
  const geographicInclude = include.filter(term => !isGenericLocationTerm(term));

  return (location = '') => {
    if (include.length === 0 && exclude.length === 0) return true;

    if (exclude.some(k => keywordMatches(location, k))) return false;
    if (include.length === 0) return true;

    if (geographicInclude.length > 0) {
      return geographicInclude.some(k => keywordMatches(location, k));
    }

    return include.some(k => keywordMatches(location, k));
  };
}

function buildFreshnessFilter(freshness = {}) {
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

function parsePostedDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    const ms = value > 10_000_000_000 ? value : value * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildLinkValidator(linkValidation = {}) {
  if (linkValidation.enabled !== true) return async () => true;

  const missingStatuses = new Set(linkValidation.reject_statuses || [...MISSING_LINK_STATUSES]);
  return async (url) => validateJobLink(url, missingStatuses);
}

async function validateJobLink(url, missingStatuses = MISSING_LINK_STATUSES) {
  let parsed;
  try {
    parsed = new URL(String(url || '').trim());
  } catch {
    return false;
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) return false;

  const headStatus = await fetchStatus(parsed.toString(), 'HEAD');
  if (missingStatuses.has(headStatus)) return false;
  if (headStatus === 405 || headStatus === 501) {
    const getStatus = await fetchStatus(parsed.toString(), 'GET');
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
      redirect: 'follow',
      signal: controller.signal,
    });
    return res.status;
  } catch {
    // Do not drop jobs on transient network or bot-protection failures.
    return 0;
  } finally {
    clearTimeout(timer);
  }
}

// ── Dedup ───────────────────────────────────────────────────────────

function canonicalizeJobUrl(rawUrl = '') {
  let parsed;
  try {
    parsed = new URL(String(rawUrl).trim());
  } catch {
    return String(rawUrl || '').trim();
  }

  parsed.hash = '';
  parsed.hostname = parsed.hostname.toLowerCase();
  const trackingParams = [
    'gh_src',
    'source',
    'utm_campaign',
    'utm_content',
    'utm_medium',
    'utm_source',
    'utm_term',
  ];
  for (const param of trackingParams) parsed.searchParams.delete(param);

  const sortedParams = [...parsed.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
  parsed.search = '';
  for (const [key, value] of sortedParams) parsed.searchParams.append(key, value);

  return parsed.toString().replace(/\/$/, '');
}

function normalizeCompany(name = '') {
  return String(name).toLowerCase()
    .replace(/[()]/g, '')
    .replace(/\b(inc|llc|ltd|corp|corporation|technologies|technology|group|co)\b\.?/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeRole(role = '') {
  return String(role).toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/[^a-z0-9 /-]/g, ' ')
    .replace(/[-/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const ROLE_STOPWORDS = new Set([
  'senior', 'junior', 'lead', 'staff', 'principal', 'head', 'chief',
  'manager', 'director', 'associate', 'intern', 'contractor',
  'remote', 'hybrid', 'onsite',
]);

const LOCATION_STOPWORDS = new Set([
  'berlin', 'germany', 'munich', 'hamburg', 'tokyo', 'japan', 'london',
  'paris', 'singapore', 'york', 'francisco', 'angeles', 'seattle',
  'austin', 'boston', 'chicago', 'denver', 'toronto', 'amsterdam',
  'dublin', 'sydney', 'global', 'emea', 'apac', 'latam',
]);

function roleFuzzyMatch(a, b) {
  const terms = (role) => normalizeRole(role)
    .split(/\s+/)
    .filter(w => w.length > 1 && !ROLE_STOPWORDS.has(w) && !LOCATION_STOPWORDS.has(w));

  const wordsA = terms(a);
  const wordsB = terms(b);
  if (wordsA.length === 0 || wordsB.length === 0) return false;

  const overlap = wordsA.filter(w => wordsB.some(wb => wb === w || wb.includes(w) || w.includes(wb)));
  const smaller = Math.min(wordsA.length, wordsB.length);
  return overlap.length >= 2 && overlap.length / smaller >= 0.6;
}

function hasSeenCompanyRole(seenCompanyRoles, company, role) {
  const normCompany = normalizeCompany(company);
  return seenCompanyRoles.some((seen) =>
    seen.company === normCompany && (seen.role === normalizeRole(role) || roleFuzzyMatch(seen.role, role))
  );
}

function loadSeenUrls() {
  const seen = new Set();

  // scan-history.tsv
  if (existsSync(SCAN_HISTORY_PATH)) {
    const lines = readFileSync(SCAN_HISTORY_PATH, 'utf-8').split('\n');
    for (const line of lines.slice(1)) { // skip header
      const url = line.split('\t')[0];
      if (url) seen.add(canonicalizeJobUrl(url));
    }
  }

  // pipeline.md — extract URLs from checkbox lines
  if (existsSync(PIPELINE_PATH)) {
    const text = readFileSync(PIPELINE_PATH, 'utf-8');
    for (const match of text.matchAll(/- \[[ x]\] (https?:\/\/\S+)/g)) {
      seen.add(canonicalizeJobUrl(match[1]));
    }
  }

  // applications.md — extract URLs from report links and any inline URLs
  if (existsSync(APPLICATIONS_PATH)) {
    const text = readFileSync(APPLICATIONS_PATH, 'utf-8');
    for (const match of text.matchAll(/https?:\/\/[^\s|)]+/g)) {
      seen.add(canonicalizeJobUrl(match[0]));
    }
  }

  return seen;
}

function loadSeenCompanyRoles() {
  const seen = [];

  if (existsSync(PIPELINE_PATH)) {
    const text = readFileSync(PIPELINE_PATH, 'utf-8');
    for (const match of text.matchAll(/- \[[ x]\] (?:https?:\/\/\S+|local:\S+)\s+\|\s*([^|]+)\s+\|\s*([^\n|]+)/g)) {
      const company = normalizeCompany(match[1]);
      const role = normalizeRole(match[2]);
      if (company && role) seen.push({ company, role });
    }
  }

  if (existsSync(APPLICATIONS_PATH)) {
    const text = readFileSync(APPLICATIONS_PATH, 'utf-8');
    for (const line of text.split('\n')) {
      if (!line.trim().startsWith('|') || line.includes('---')) continue;
      const parts = line.split('|').map(part => part.trim());
      if (parts.length < 5) continue;
      const entryNumber = Number.parseInt(parts[1], 10);
      if (!Number.isFinite(entryNumber)) continue;
      const company = normalizeCompany(parts[3]);
      const role = normalizeRole(parts[4]);
      if (company && role && company !== 'company' && role !== 'role') {
        seen.push({ company, role });
      }
    }
  }
  return seen;
}

// ── Pipeline writer ─────────────────────────────────────────────────

function appendToPipeline(offers) {
  if (offers.length === 0) return;

  let text = readFileSync(PIPELINE_PATH, 'utf-8');

  // Find "## Pending" section and append after it
  const marker = text.includes('## Pending') ? '## Pending' : '## Pendientes';
  const idx = text.indexOf(marker);
  if (idx === -1) {
    // No Pending section — append at end before Processed
    let procIdx = text.indexOf('## Processed');
    if (procIdx === -1) procIdx = text.indexOf('## Procesadas');
    const insertAt = procIdx === -1 ? text.length : procIdx;
    const block = `\n${marker}\n\n` + offers.map(o =>
      `- [ ] ${o.url} | ${o.company} | ${o.title}`
    ).join('\n') + '\n\n';
    text = text.slice(0, insertAt) + block + text.slice(insertAt);
  } else {
    // Find the end of existing Pending content (next ## or end)
    const afterMarker = idx + marker.length;
    const nextSection = text.indexOf('\n## ', afterMarker);
    const insertAt = nextSection === -1 ? text.length : nextSection;

    const block = '\n' + offers.map(o =>
      `- [ ] ${o.url} | ${o.company} | ${o.title}`
    ).join('\n') + '\n';
    text = text.slice(0, insertAt) + block + text.slice(insertAt);
  }

  writeFileSync(PIPELINE_PATH, text, 'utf-8');
}

function appendToScanHistory(offers, date) {
  // Ensure file + header exist
  if (!existsSync(SCAN_HISTORY_PATH)) {
    writeFileSync(SCAN_HISTORY_PATH, 'url\tfirst_seen\tportal\ttitle\tcompany\tstatus\n', 'utf-8');
  }

  const lines = offers.map(o =>
    `${o.url}\t${date}\t${o.source}\t${o.title}\t${o.company}\tadded`
  ).join('\n') + '\n';

  appendFileSync(SCAN_HISTORY_PATH, lines, 'utf-8');
}

// ── Parallel fetch with concurrency limit ───────────────────────────

async function parallelFetch(tasks, limit) {
  const results = [];
  let i = 0;

  async function next() {
    while (i < tasks.length) {
      const task = tasks[i++];
      results.push(await task());
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => next());
  await Promise.all(workers);
  return results;
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const companyFlag = args.indexOf('--company');
  const filterCompany = companyFlag !== -1 ? args[companyFlag + 1]?.toLowerCase() : null;

  // 1. Read portals.yml
  if (!existsSync(PORTALS_PATH)) {
    console.error('Error: portals.yml not found. Run onboarding first.');
    process.exit(1);
  }

  const config = parseYaml(readFileSync(PORTALS_PATH, 'utf-8'));
  const companies = config.tracked_companies || [];
  const searchQueries = config.search_queries || [];
  const discoveryBacklog = config.discovery_backlog || [];
  const titleFilter = buildTitleFilter(config.title_filter);
  const locationFilter = buildLocationFilter(config.location_filter);
  const freshnessFilter = buildFreshnessFilter(config.freshness);
  const linkValidator = buildLinkValidator(config.link_validation);

  // 2. Filter to enabled companies with detectable APIs
  const targets = companies
    .filter(c => c.enabled !== false)
    .filter(c => !filterCompany || c.name.toLowerCase().includes(filterCompany))
    .map(c => ({ ...c, _api: detectApi(c) }))
    .filter(c => c._api !== null);

  const skippedCount = companies.filter(c => c.enabled !== false).length - targets.length;

  if (targets.length === 0) {
    if (discoveryBacklog.length > 0 || searchQueries.length > 0) {
      const queryLabel = searchQueries.length === 1 ? "query" : "queries";
      const companyLabel = discoveryBacklog.length === 1 ? "company" : "companies";
      console.error('Error: no locally scannable companies are available in portals.yml.');
      console.error(`Codex-assisted discovery is available with ${searchQueries.length} ${queryLabel} and ${discoveryBacklog.length} backlog ${companyLabel}.`);
      console.error('Use the generated search queries and backlog companies in Codex to continue hybrid discovery.');
      process.exit(1);
    }

    console.error('Error: no tracked companies are configured. Confirm target companies and rebuild portals.yml first.');
    process.exit(1);
  }

  console.log(`Scanning ${targets.length} companies via API (${skippedCount} skipped — no API detected)`);
  if (dryRun) console.log('(dry run — no files will be written)\n');

  // 3. Load dedup sets
  const seenUrls = loadSeenUrls();
  const seenCompanyRoles = loadSeenCompanyRoles();

  // 4. Fetch all APIs
  const date = new Date().toISOString().slice(0, 10);
  let totalFound = 0;
  let totalFiltered = 0;
  let totalLocationFiltered = 0;
  let totalAgeFiltered = 0;
  let totalInvalidLinks = 0;
  let totalDupes = 0;
  const newOffers = [];
  const errors = [];

  const tasks = targets.map(company => async () => {
    const { type, url } = company._api;
    try {
      const json = await fetchJson(url);
      const jobs = PARSERS[type](json, company.name);
      totalFound += jobs.length;

      for (const job of jobs) {
        if (!titleFilter(job.title)) {
          totalFiltered++;
          continue;
        }
        if (!locationFilter(job.location)) {
          totalLocationFiltered++;
          continue;
        }
        if (!freshnessFilter(job.postedAt)) {
          totalAgeFiltered++;
          continue;
        }
        const canonicalUrl = canonicalizeJobUrl(job.url);
        if (!canonicalUrl || seenUrls.has(canonicalUrl)) {
          totalDupes++;
          continue;
        }
        if (hasSeenCompanyRole(seenCompanyRoles, job.company, job.title)) {
          totalDupes++;
          continue;
        }
        if (!(await linkValidator(canonicalUrl))) {
          totalInvalidLinks++;
          continue;
        }
        // Mark as seen to avoid intra-scan dupes
        seenUrls.add(canonicalUrl);
        seenCompanyRoles.push({ company: normalizeCompany(job.company), role: normalizeRole(job.title) });
        newOffers.push({ ...job, url: canonicalUrl, source: `${type}-api` });
      }
    } catch (err) {
      errors.push({ company: company.name, error: err.message });
    }
  });

  await parallelFetch(tasks, CONCURRENCY);

  // 5. Write results
  if (!dryRun && newOffers.length > 0) {
    appendToPipeline(newOffers);
    appendToScanHistory(newOffers, date);
  }

  // 6. Print summary
  console.log(`\n${'━'.repeat(45)}`);
  console.log(`Portal Scan — ${date}`);
  console.log(`${'━'.repeat(45)}`);
  console.log(`Companies scanned:     ${targets.length}`);
  console.log(`Total jobs found:      ${totalFound}`);
  console.log(`Filtered by title:     ${totalFiltered} removed`);
  console.log(`Filtered by location:  ${totalLocationFiltered} removed`);
  console.log(`Filtered by age:       ${totalAgeFiltered} removed`);
  console.log(`Invalid links:         ${totalInvalidLinks} removed`);
  console.log(`Duplicates:            ${totalDupes} skipped`);
  console.log(`New offers added:      ${newOffers.length}`);

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    for (const e of errors) {
      console.log(`  ✗ ${e.company}: ${e.error}`);
    }
  }

  if (discoveryBacklog.length > 0 || searchQueries.length > 0) {
    console.log(`\nHybrid discovery backlog: ${discoveryBacklog.length} unsupported compan${discoveryBacklog.length === 1 ? 'y' : 'ies'}, ${searchQueries.length} Codex quer${searchQueries.length === 1 ? 'y' : 'ies'}.`);
  }

  if (newOffers.length > 0) {
    console.log('\nNew offers:');
    for (const o of newOffers) {
      console.log(`  + ${o.company} | ${o.title} | ${o.location || 'N/A'}`);
    }
    if (dryRun) {
      console.log('\n(dry run — run without --dry-run to save results)');
    } else {
      console.log(`\nResults saved to ${PIPELINE_PATH} and ${SCAN_HISTORY_PATH}`);
    }
  }

  console.log(`\n→ Review data/pipeline.md in Codex to evaluate new offers.`);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
