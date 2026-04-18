import test from "node:test";
import assert from "node:assert/strict";

import { buildPortalsConfig } from "../career_ops_core/lib/portals-builder.mjs";

test("buildPortalsConfig merges preferences with accepted companies and role keywords", () => {
  const preferences = {
    geography: {
      countries: ["Germany"],
      cities: ["Berlin"],
      remotePolicy: "hybrid",
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
  assert.equal(config.tracked_companies.length, 1);
  assert.equal(config.tracked_companies[0].name, "Notion");
  assert.equal(config.discovery_backlog.length, 1);
  assert.equal(config.discovery_backlog[0].name, "User Added");
  assert.equal(config.search_queries.length, 2);
  assert.match(config.search_queries[0].query, /Germany OR Berlin/);
  assert.match(config.search_queries[0].query, /Product Marketing/);
});
