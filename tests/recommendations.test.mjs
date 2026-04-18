import test from "node:test";
import assert from "node:assert/strict";

import { recommendTargets } from "../career_ops_core/lib/recommendations.mjs";

test("recommendTargets ranks roles and companies from user preferences and seeded market data", () => {
  const profile = {
    targetRoles: ["Product Marketing", "Growth Marketing", "Marketing Operations"],
    preferredIndustries: ["SaaS", "AI"],
    preferredCompanyStages: ["growth", "enterprise"],
    inferredRoleSignals: [{ name: "Product Marketing", score: 14 }],
    skills: ["Lifecycle", "SQL"],
  };

  const roleFamilies = [
    { name: "Product Marketing", keywords: ["product marketing", "positioning"], starterPriority: 10 },
    { name: "Growth Marketing", keywords: ["growth", "acquisition"], starterPriority: 9 },
    { name: "RevOps", keywords: ["ops", "crm"], starterPriority: 5 },
  ];

  const companies = [
    { name: "Notion", industries: ["SaaS"], stages: ["growth"], roleKeywords: ["product marketing", "growth"] },
    { name: "OpenAI", industries: ["AI"], stages: ["enterprise"], roleKeywords: ["product marketing"] },
    { name: "Legacy Co", industries: ["Manufacturing"], stages: ["enterprise"], roleKeywords: ["ops"] },
  ];

  const result = recommendTargets({
    profile,
    roleFamilies,
    companies,
    roleLimit: 2,
    companyLimit: 2,
  });

  assert.equal(result.roles.length, 2);
  assert.equal(result.companies.length, 2);
  assert.equal(result.roles[0].name, "Product Marketing");
  assert.equal(result.companies[0].name, "Notion");
  assert.match(result.companies[0].reason, /Matched/);
  assert.equal(typeof result.roles[0].confidence, "number");
  assert.equal(typeof result.companies[0].confidence, "number");
});
