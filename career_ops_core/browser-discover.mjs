#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import yaml from "js-yaml";
import {
  buildFreshnessFilter,
  buildLinkValidator,
  buildLocationFilter,
  buildTitleFilter,
  createFilterState,
  filterJobs,
  loadSeenCompanyRoles,
  loadSeenUrls,
  appendToPipeline,
  appendToScanHistory,
  printFilterExamples,
} from "./lib/scan-core.mjs";
import {
  buildBrowserDiscoveryTargets,
  extractHarnessJson,
  isBrowserHarnessAllowed,
  normalizeBrowserHarnessJobs,
  runBrowserHarness,
} from "./lib/browser-discovery.mjs";

const PORTALS_PATH = "portals.yml";

mkdirSync("data", { recursive: true });

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  if (!existsSync(PORTALS_PATH)) {
    console.error("Error: portals.yml not found. Run onboarding first.");
    process.exit(1);
  }

  const config = yaml.load(readFileSync(PORTALS_PATH, "utf-8"));
  const { browserConfig, queries, backlog } = buildBrowserDiscoveryTargets(config);

  if (browserConfig.enabled === false) {
    console.log("Browser discovery disabled in portals.yml.");
    return;
  }
  if (queries.length === 0 && backlog.length === 0) {
    console.log("Browser discovery has no enabled search queries or backlog companies.");
    return;
  }
  if (!isBrowserHarnessAllowed(process.env)) {
    console.log("Browser discovery skipped: set BROWSER_USE_API_KEY for an isolated Browser Use session, or APPLYAI_ALLOW_REAL_CHROME=1 to allow local Chrome.");
    return;
  }

  const harnessResult = runBrowserHarness({ queries, backlog, env: process.env });
  if (harnessResult.skipped) {
    console.log(`Browser discovery skipped: ${harnessResult.reason}`);
    return;
  }

  const payload = extractHarnessJson(harnessResult.stdout);
  const jobs = normalizeBrowserHarnessJobs(payload);
  const seenUrls = loadSeenUrls();
  const seenCompanyRoles = loadSeenCompanyRoles();
  const filterState = createFilterState();
  const linkValidator = buildLinkValidator(config.link_validation);
  const newOffers = await filterJobs(jobs, {
    titleFilter: buildTitleFilter(config.title_filter),
    locationFilter: buildLocationFilter(config.location_filter),
    freshnessFilter: buildFreshnessFilter(config.freshness),
    linkValidator,
    seenUrls,
    seenCompanyRoles,
    source: "browser-harness",
    state: filterState,
  });

  const date = new Date().toISOString().slice(0, 10);
  if (!dryRun && newOffers.length > 0) {
    appendToPipeline(newOffers);
    appendToScanHistory(newOffers, date);
  }

  console.log(`\n${"=".repeat(45)}`);
  console.log(`Browser Discovery - ${date}`);
  console.log(`${"=".repeat(45)}`);
  console.log(`Search queries used:   ${queries.length}`);
  console.log(`Backlog pages used:    ${backlog.length}`);
  console.log(`Raw jobs found:        ${jobs.length}`);
  console.log(`Filtered by title:     ${filterState.totalFiltered} removed`);
  console.log(`Filtered by location:  ${filterState.totalLocationFiltered} removed`);
  console.log(`Filtered by age:       ${filterState.totalAgeFiltered} removed`);
  console.log(`Invalid links:         ${filterState.totalInvalidLinks} removed`);
  console.log(`Duplicates:            ${filterState.totalDupes} skipped`);
  console.log(`New offers added:      ${newOffers.length}`);

  printFilterExamples(filterState.filterExamples);

  if (newOffers.length > 0) {
    console.log("\nNew browser-discovered offers:");
    for (const offer of newOffers) {
      console.log(`  + ${offer.company} | ${offer.title} | ${offer.location || "N/A"}`);
    }
    if (dryRun) {
      console.log("\n(dry run - run without --dry-run to save results)");
    } else {
      console.log("\nResults saved to data/pipeline.md and data/scan-history.tsv");
    }
  }
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
