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
  const roleName = role.name || "";
  const directMatch = targetRoles.some((target) => roleName.toLowerCase().includes(String(target).toLowerCase()));
  return (role.starterPriority || 0) + (directMatch ? 10 : 0);
}

function scoreCompany(company, profile) {
  const roleScore = overlapScore(profile.targetRoles, company.roleKeywords);
  const industryScore = overlapScore(profile.preferredIndustries, company.industries);
  const stageScore = overlapScore(profile.preferredCompanyStages, company.stages);
  return roleScore * 4 + industryScore * 2 + stageScore * 2;
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
      score: scoreRole(role, profile),
      reason: `Matched role signals from target roles: ${(profile.targetRoles || []).join(", ") || "starter defaults"}`,
    }))
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
    .slice(0, roleLimit);

  const rankedCompanies = [...companies]
    .map((company) => ({
      ...company,
      score: scoreCompany(company, profile),
      reason: `Matched industries, stages, and role fit from your profile for ${company.name}.`,
    }))
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
    .slice(0, companyLimit);

  return {
    roles: rankedRoles,
    companies: rankedCompanies,
  };
}
