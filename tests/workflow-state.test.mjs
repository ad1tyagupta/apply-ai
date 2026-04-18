import test from "node:test";
import assert from "node:assert/strict";

import {
  assessOnboardingState,
  getConfirmedRoleKeywords,
  getSearchStrategy,
} from "../career_ops_core/lib/workflow-state.mjs";

test("getSearchStrategy returns default thresholds and explanations for built-in modes", () => {
  const broad = getSearchStrategy({ searchMode: { mode: "broad" } });
  const balanced = getSearchStrategy({ searchMode: { mode: "balanced" } });
  const selective = getSearchStrategy({ searchMode: { mode: "highly selective" } });
  const custom = getSearchStrategy({ searchMode: { mode: "custom", minimumScore: 82 } });

  assert.equal(broad.minimumScore, 60);
  assert.match(broad.tradeoff, /more jobs/i);
  assert.match(broad.recommendedFor, /new to the market|currently unemployed/i);

  assert.equal(balanced.minimumScore, 60);
  assert.match(balanced.tradeoff, /relevant/i);
  assert.match(balanced.recommendedFor, /new to the market|currently unemployed/i);

  assert.equal(selective.minimumScore, 85);
  assert.match(selective.tradeoff, /fewer jobs/i);
  assert.match(selective.recommendedFor, /already have a job|looking for a change/i);

  assert.equal(custom.minimumScore, 82);
  assert.match(custom.tradeoff, /custom/i);
});

test("getConfirmedRoleKeywords merges explicit keywords with confirmed role families", () => {
  const preferences = {
    rolePreferences: {
      preferredRoleFamilies: ["Product Marketing", "Growth Marketing"],
      includedKeywords: ["Lifecycle", "Product Marketing"],
    },
  };

  assert.deepEqual(
    getConfirmedRoleKeywords(preferences),
    ["Lifecycle", "Product Marketing", "Growth Marketing"],
  );
});

test("assessOnboardingState blocks discovery until geography, documents, brain, and targets exist", () => {
  const incomplete = assessOnboardingState(
    {
      geography: { countries: [] },
      searchMode: { mode: "balanced", minimumScore: 75 },
      rolePreferences: { preferredRoleFamilies: [], includedKeywords: [] },
      companyPreferences: { acceptedCompanies: [], customCompanies: [] },
    },
    {
      rawDocumentCount: 0,
      normalizedDocumentCount: 0,
      hasProfileFacts: false,
    },
  );

  assert.equal(incomplete.readyForDiscovery, false);
  assert.deepEqual(
    incomplete.missingSteps,
    [
      "Confirm a target country or city.",
      "Upload source documents into intake/raw/.",
      "Run the brain build so profile facts exist.",
      "Confirm at least one target role family or keyword.",
      "Confirm or add at least one target company.",
    ],
  );

  const complete = assessOnboardingState(
    {
      geography: { countries: ["Germany"], cities: ["Berlin"] },
      searchMode: { mode: "balanced", minimumScore: 75 },
      rolePreferences: {
        preferredRoleFamilies: ["Product Marketing"],
        includedKeywords: ["Product Marketing", "Lifecycle"],
      },
      companyPreferences: {
        acceptedCompanies: ["Notion"],
        customCompanies: [],
      },
    },
    {
      rawDocumentCount: 2,
      normalizedDocumentCount: 2,
      hasProfileFacts: true,
    },
  );

  assert.equal(complete.readyForDiscovery, true);
  assert.deepEqual(complete.missingSteps, []);
});
