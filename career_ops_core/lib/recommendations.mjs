function normalizeList(values = []) {
  return values.map((value) => String(value).toLowerCase());
}

function overlapScore(targets, candidates) {
  const targetSet = new Set(normalizeList(targets));
  const candidateSet = normalizeList(candidates);
  return candidateSet.reduce((score, item) => score + (targetSet.has(item) ? 1 : 0), 0);
}

function scoreRole(role, profile) {
  const targetRoles = profile.targetRoles || [];
  const inferredRoles = profile.inferredRoleSignals || [];
  const skillSignals = profile.skills || [];
  const roleName = role.name || "";
  const directMatch = targetRoles.some((target) => roleName.toLowerCase().includes(String(target).toLowerCase()));
  const inferredMatch = inferredRoles.find((signal) => roleName.toLowerCase() === String(signal.name).toLowerCase());
  const keywordMatches = overlapScore(role.keywords || [], skillSignals);
  const score = (role.starterPriority || 0) + (directMatch ? 10 : 0) + (inferredMatch?.score || 0) + keywordMatches * 2;
  const reasons = [
    directMatch ? `confirmed roles: ${(profile.targetRoles || []).join(", ")}` : null,
    inferredMatch ? `document signals for ${inferredMatch.name}` : null,
    keywordMatches > 0 ? `skills overlap across ${keywordMatches} keyword(s)` : null,
  ].filter(Boolean);

  return {
    score,
    reason: `Matched ${reasons.join("; ") || "starter defaults"}.`,
    confidence: Math.min(1, score / 25),
  };
}

function scoreCompany(company, profile) {
  const roleScore = overlapScore(profile.targetRoles, company.roleKeywords);
  const industryScore = overlapScore(profile.preferredIndustries, company.industries);
  const stageScore = overlapScore(profile.preferredCompanyStages, company.stages);
  const skillScore = overlapScore(profile.skills, company.roleKeywords);
  const score = roleScore * 4 + industryScore * 2 + stageScore * 2 + skillScore * 2;
  return {
    score,
    reason: `Matched industries, stages, and role fit from your profile for ${company.name}.`,
    confidence: Math.min(1, score / 20),
  };
}

export function recommendTargets({
  profile,
  roleFamilies,
  companies,
  roleLimit = 15,
  companyLimit = 25,
}) {
  const rankedRoles = [...roleFamilies]
    .map((role) => ({
      ...role,
      ...scoreRole(role, profile),
    }))
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
    .slice(0, roleLimit);

  const rankedCompanies = [...companies]
    .map((company) => ({
      ...company,
      ...scoreCompany(company, profile),
    }))
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
    .slice(0, companyLimit);

  return {
    summary: {
      recommendedRoleCount: rankedRoles.length,
      recommendedCompanyCount: rankedCompanies.length,
    },
    roles: rankedRoles,
    companies: rankedCompanies,
  };
}
