import test from "node:test";
import assert from "node:assert/strict";

import { scoreOpportunity } from "../career_ops_core/lib/opportunity-scoring.mjs";

const profileFacts = {
  skills: ["SQL", "Product Marketing", "Lifecycle"],
  languages: ["English (Fluent)", "German (B2)"],
  inferred: {
    seniority: { level: "senior" },
    roleSignals: [{ name: "Product Marketing", score: 18 }],
  },
};

test("scoreOpportunity respects search strategy thresholds", () => {
  const opportunity = {
    title: "Senior Product Marketing Manager",
    company: "Notion",
    location: "Berlin, Germany",
    description: "Own go-to-market launches, lifecycle programs, and messaging.",
  };

  const broad = scoreOpportunity({
    opportunity,
    preferences: {
      geography: { countries: ["Germany"] },
      searchMode: { mode: "broad" },
      rolePreferences: { preferredRoleFamilies: ["Product Marketing"], includedKeywords: ["Product Marketing"] },
      companyPreferences: { acceptedCompanies: ["Notion"] },
    },
    profileFacts,
  });
  const selective = scoreOpportunity({
    opportunity,
    preferences: {
      geography: { countries: ["Germany"] },
      searchMode: { mode: "highly selective" },
      rolePreferences: { preferredRoleFamilies: ["Product Marketing"], includedKeywords: ["Product Marketing"] },
      companyPreferences: { acceptedCompanies: ["Notion"] },
    },
    profileFacts,
  });

  assert.equal(broad.threshold, 60);
  assert.equal(selective.threshold, 85);
  assert.equal(broad.score >= selective.score, true);
});

test("scoreOpportunity penalizes geography and language mismatches and records reasons", () => {
  const result = scoreOpportunity({
    opportunity: {
      title: "Product Marketing Manager",
      company: "Paris Co",
      location: "Paris, France",
      description: "Fluent French required for this role.",
      languages: ["French"],
      seniority: "mid",
    },
    preferences: {
      geography: { countries: ["Germany"], cities: ["Berlin"], remotePolicy: "onsite" },
      searchMode: { mode: "balanced" },
      rolePreferences: { preferredRoleFamilies: ["Product Marketing"], includedKeywords: ["Product Marketing"] },
      companyPreferences: { acceptedCompanies: [] },
    },
    profileFacts,
  });

  assert.equal(result.decision, "reject");
  assert.equal(result.reasons.some((reason) => /geography/i.test(reason)), true);
  assert.equal(result.reasons.some((reason) => /language/i.test(reason)), true);
});

test("scoreOpportunity uses generic CVs for broad and balanced searches from 60 to 79", () => {
  const result = scoreOpportunity({
    opportunity: {
      title: "Product Marketing Specialist",
      company: "Acme",
      location: "Berlin, Germany",
      description: "Product marketing, lifecycle, and SQL collaboration.",
    },
    preferences: {
      geography: { countries: ["Germany"] },
      searchMode: { mode: "balanced" },
      rolePreferences: { preferredRoleFamilies: ["Product Marketing"], includedKeywords: ["Product Marketing", "Lifecycle"] },
      companyPreferences: { acceptedCompanies: [] },
    },
    profileFacts,
  });

  assert.equal(result.score >= 60 && result.score <= 79, true);
  assert.equal(result.assetPlan.cvMode, "generic");
  assert.equal(result.assetPlan.coverLetterMode, "required");
  assert.equal(result.assetPlan.reuseGenericCv, true);
});

test("scoreOpportunity uses custom CVs above 80 for broad and balanced searches", () => {
  const result = scoreOpportunity({
    opportunity: {
      title: "Senior Product Marketing Manager",
      company: "Notion",
      location: "Berlin, Germany",
      description: "Product Marketing SQL Lifecycle Product Marketing SQL Lifecycle Product Marketing",
    },
    preferences: {
      geography: { countries: ["Germany"] },
      searchMode: { mode: "broad" },
      rolePreferences: { preferredRoleFamilies: ["Product Marketing"], includedKeywords: ["Product Marketing", "Lifecycle", "SQL"] },
      companyPreferences: { acceptedCompanies: ["Notion"] },
    },
    profileFacts,
  });

  assert.equal(result.score >= 80, true);
  assert.equal(result.assetPlan.cvMode, "custom");
  assert.equal(result.assetPlan.coverLetterMode, "required");
  assert.equal(result.assetPlan.reuseGenericCv, false);
});

test("scoreOpportunity rejects highly selective searches below 85 and always uses custom materials above 85", () => {
  const rejected = scoreOpportunity({
    opportunity: {
      title: "Product Marketing Specialist",
      company: "Acme",
      location: "Berlin, Germany",
      description: "Product marketing collaboration.",
    },
    preferences: {
      geography: { countries: ["Germany"] },
      searchMode: { mode: "highly selective" },
      rolePreferences: { preferredRoleFamilies: ["Product Marketing"], includedKeywords: ["Product Marketing"] },
      companyPreferences: { acceptedCompanies: [] },
    },
    profileFacts,
  });

  assert.equal(rejected.threshold, 85);
  assert.equal(rejected.decision, "reject");
  assert.equal(rejected.assetPlan.cvMode, "none");

  const shortlisted = scoreOpportunity({
    opportunity: {
      title: "Senior Product Marketing Manager",
      company: "Notion",
      location: "Berlin, Germany",
      description: "Product Marketing SQL Lifecycle Product Marketing SQL Lifecycle Product Marketing",
    },
    preferences: {
      geography: { countries: ["Germany"] },
      searchMode: { mode: "highly selective" },
      rolePreferences: { preferredRoleFamilies: ["Product Marketing"], includedKeywords: ["Product Marketing", "Lifecycle", "SQL"] },
      companyPreferences: { acceptedCompanies: ["Notion"] },
    },
    profileFacts,
  });

  assert.equal(shortlisted.score >= 85, true);
  assert.equal(shortlisted.assetPlan.cvMode, "custom");
  assert.equal(shortlisted.assetPlan.coverLetterMode, "required");
});
