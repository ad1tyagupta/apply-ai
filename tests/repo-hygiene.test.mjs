import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const PRIVATE_RUNTIME_PATHS = [
  "article-digest.md",
  "config/profile.yml",
  "config/user-preferences.yml",
  "cv.md",
  "data/applications.md",
  "data/follow-ups.md",
  "data/pipeline.md",
  "data/scan-history.tsv",
  "portals.yml",
  "profile/cv-strategy.md",
  "profile/facts.yml",
  "profile/master-profile.md",
  "profile/recommendations.yml",
  "profile/role-map.md",
  "profile/target-recommendations.md",
  "profile/wiki/achievements-and-evidence.md",
  "profile/wiki/constraints.md",
  "profile/wiki/education.md",
  "profile/wiki/experience.md",
  "profile/wiki/languages.md",
  "profile/wiki/personal-summary.md",
  "profile/wiki/skills-and-tools.md",
  "profile/wiki/target-companies.md",
  "profile/wiki/target-roles.md",
];

test("private runtime files are not tracked by git", { skip: !existsSync(".git") }, () => {
  const result = spawnSync("git", ["ls-files", "--", ...PRIVATE_RUNTIME_PATHS], {
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split("\n").filter(Boolean), []);
});
