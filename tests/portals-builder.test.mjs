import test from "node:test";
import assert from "node:assert/strict";

import { buildPortalsConfig, selectCompaniesForPortals } from "../career_ops_core/lib/portals-builder.mjs";

test("buildPortalsConfig merges preferences with accepted companies and role keywords", () => {
  const preferences = {
    geography: {
      countries: ["Germany"],
      cities: ["Berlin"],
      remotePolicy: "hybrid",
    },
    limitations: {
      confirmed: true,
      unavailableCountries: ["United States"],
    },
    rolePreferences: {
      includedKeywords: ["Product Marketing", "Growth"],
      excludedKeywords: ["Intern"],
    },
    companyPreferences: {
      preferredCompanies: ["Notion"],
      excludedCompanies: ["Bad Co"],
      customCompanies: [
        {
          name: "User Added",
          careers_url: "https://careers.user-added.example/jobs",
        },
      ],
    },
  };

  const acceptedCompanies = [
    {
      name: "Notion",
      careers_url: "https://jobs.ashbyhq.com/notion",
      ats_provider: "ashby",
      ats_slug: "notion",
      api_url: "https://api.ashbyhq.com/posting-api/job-board/notion?includeCompensation=true",
      dedup_key: "ashby:notion:{id}",
      role_fit: ["Product Marketing", "Growth"],
    },
    {
      name: "Bad Co",
      careers_url: "https://jobs.ashbyhq.com/bad-co",
      role_fit: ["Product Marketing"],
    },
  ];

  const queryTemplates = [
    {
      name: "Starter search",
      template: 'site:jobs.ashbyhq.com {{location_terms}} "{{role_keyword_1}}"',
    },
  ];

  const config = buildPortalsConfig({
    preferences,
    acceptedCompanies,
    queryTemplates,
  });

  assert.deepEqual(config.location_filter.include, ["Germany", "Berlin", "Remote", "Hybrid"]);
  assert.deepEqual(config.location_filter.exclude, ["United States"]);
  assert.equal(config.metadata.market, "default");
  assert.equal(config.freshness.max_age_days, 60);
  assert.equal(config.tracked_companies.length, 1);
  assert.equal(config.tracked_companies[0].name, "Notion");
  assert.equal(config.tracked_companies[0].ats_provider, "ashby");
  assert.equal(config.tracked_companies[0].api_url, "https://api.ashbyhq.com/posting-api/job-board/notion?includeCompensation=true");
  assert.equal(config.tracked_companies[0].dedup_key, "ashby:notion:{id}");
  assert.equal(config.discovery_backlog.length, 1);
  assert.equal(config.discovery_backlog[0].name, "User Added");
  assert.equal(config.search_queries.length, 2);
  assert.match(config.search_queries[0].query, /Germany OR Berlin/);
  assert.match(config.search_queries[0].query, /Product Marketing/);
});

test("buildPortalsConfig keeps market-wide discovery even without confirmed companies", () => {
  const config = buildPortalsConfig({
    preferences: {
      geography: {
        countries: ["Germany"],
        cities: ["Berlin"],
        remotePolicy: "hybrid",
      },
      rolePreferences: {
        includedKeywords: ["Product Marketing", "Growth"],
      },
      companyPreferences: {
        acceptedCompanies: [],
        customCompanies: [],
      },
    },
    acceptedCompanies: [],
    queryTemplates: [
      {
        name: "Market-wide search",
        template: 'site:jobs.ashbyhq.com OR site:boards.greenhouse.io {{location_terms}} "{{role_keyword_1}}"',
      },
    ],
  });

  assert.equal(config.metadata.market_wide_discovery, true);
  assert.equal(config.tracked_companies.length, 0);
  assert.equal(config.discovery_backlog.length, 0);
  assert.equal(config.search_queries.length, 1);
  assert.match(config.search_queries[0].query, /Germany OR Berlin/);
});

test("selectCompaniesForPortals falls back to top recommendations when no companies are accepted", () => {
  const companies = [
    {
      name: "Alpha",
      careers_url: "https://jobs.ashbyhq.com/alpha",
      roleKeywords: ["AI"],
    },
    {
      name: "Beta",
      careers_url: "https://jobs.ashbyhq.com/beta",
      roleKeywords: ["Automation"],
    },
    {
      name: "Gamma",
      careers_url: "https://jobs.ashbyhq.com/gamma",
      roleKeywords: ["RevOps"],
    },
  ];

  const selection = selectCompaniesForPortals({
    preferences: {
      companyPreferences: {
        acceptedCompanies: [],
        excludedCompanies: ["Gamma"],
        recommendationFallbackLimit: 2,
      },
    },
    companies,
    recommendations: {
      companies: [
        { name: "Gamma" },
        { name: "Beta" },
        { name: "Alpha" },
      ],
    },
  });

  assert.equal(selection.source, "recommendations");
  assert.equal(selection.recommendationFallbackCount, 2);
  assert.deepEqual(selection.companies.map((company) => company.name), ["Beta", "Alpha"]);
  assert.deepEqual(selection.companies.map((company) => company.role_fit), [["Automation"], ["AI"]]);
});
