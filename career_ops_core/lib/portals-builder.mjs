import { buildHybridDiscoveryPlan, mergeDiscoveryQueries } from "./discovery.mjs";
import { getConfirmedRoleKeywords, getUserLimitations } from "./workflow-state.mjs";

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

function excludedCompanySet(preferences = {}) {
  return new Set(
    uniqueStrings(preferences.companyPreferences?.excludedCompanies || []).map((value) => value.toLowerCase()),
  );
}

function withRoleFit(company) {
  return {
    ...company,
    role_fit: company.role_fit || company.roleKeywords || [],
  };
}

function remoteTerms(remotePolicy) {
  if (remotePolicy === "remote") return ["Remote"];
  if (remotePolicy === "hybrid") return ["Remote", "Hybrid"];
  if (remotePolicy === "onsite") return [];
  return ["Remote"];
}

function expandLocationTerms(preferences, terms) {
  if (preferences.market?.active !== "germany") return terms;

  return uniqueStrings([
    ...terms,
    "Deutschland",
    "DACH",
    "Europe",
    "EU",
    "EMEA",
    "Remote Germany",
    "Remote EU",
    "Remote Europe",
    "Remote EMEA",
  ]);
}

function buildQuery(template, locationTerms, roleKeywords) {
  return template
    .replace("{{location_terms}}", locationTerms.join(" OR "))
    .replace("{{role_keyword_1}}", roleKeywords[0] || "Product Marketing")
    .replace("{{role_keyword_2}}", roleKeywords[1] || roleKeywords[0] || "Growth");
}

export function selectCompaniesForPortals({
  preferences = {},
  companies = [],
  recommendations = null,
}) {
  const excludedCompanies = excludedCompanySet(preferences);
  const companyPreferences = preferences.companyPreferences || {};
  const acceptedNames = uniqueStrings(companyPreferences.acceptedCompanies || []);
  const marketCompaniesByName = new Map(
    companies.map((company) => [String(company.name || "").toLowerCase(), company]),
  );

  if (acceptedNames.length > 0) {
    return {
      source: "accepted",
      recommendationFallbackCount: 0,
      companies: companies
        .filter((company) => acceptedNames.some((name) => name.toLowerCase() === String(company.name).toLowerCase()))
        .filter((company) => !excludedCompanies.has(String(company.name).toLowerCase()))
        .map(withRoleFit),
    };
  }

  if (companyPreferences.autoTrackRecommendedCompanies === false) {
    return {
      source: "none",
      recommendationFallbackCount: 0,
      companies: [],
    };
  }

  const configuredLimit = Number(companyPreferences.recommendationFallbackLimit || 10);
  const limit = Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : 10;
  const selected = [];
  const seen = new Set();

  for (const recommendation of recommendations?.companies || []) {
    const name = String(recommendation.name || "").toLowerCase();
    if (!name || seen.has(name) || excludedCompanies.has(name)) continue;

    const marketCompany = marketCompaniesByName.get(name);
    if (!marketCompany) continue;

    selected.push(withRoleFit(marketCompany));
    seen.add(name);
    if (selected.length >= limit) break;
  }

  return {
    source: selected.length > 0 ? "recommendations" : "none",
    recommendationFallbackCount: selected.length,
    companies: selected,
  };
}

export function buildPortalsConfig({
  preferences,
  acceptedCompanies = [],
  queryTemplates = [],
  companySelectionSource = "accepted",
  recommendationFallbackCount = 0,
}) {
  const countries = preferences.geography?.countries || [];
  const cities = preferences.geography?.cities || [];
  const limitations = getUserLimitations(preferences);
  const roleKeywords = uniqueStrings(getConfirmedRoleKeywords(preferences));
  const excludedKeywords = uniqueStrings(preferences.rolePreferences?.excludedKeywords || []);
  const excludedCompanies = excludedCompanySet(preferences);

  const companyPool = [
    ...acceptedCompanies,
    ...(preferences.companyPreferences?.customCompanies || []),
  ]
    .filter((company) => !excludedCompanies.has(String(company.name).toLowerCase()))
    .map((company) => ({
      ...company,
      name: company.name,
      careers_url: company.careers_url,
      enabled: true,
      role_fit: company.role_fit || [],
    }));

  const baseLocationTerms = uniqueStrings([
    ...countries,
    ...cities,
    ...remoteTerms(preferences.geography?.remotePolicy),
  ]);
  const locationTerms = expandLocationTerms(preferences, baseLocationTerms);

  const templatedQueries = queryTemplates.map((template, index) => ({
    name: template.name || `Generated query ${index + 1}`,
    query: buildQuery(template.template, locationTerms, roleKeywords),
    enabled: true,
  }));

  const { trackedCompanies, discoveryBacklog } = buildHybridDiscoveryPlan(companyPool, {
    locationTerms,
    roleKeywords,
  });
  const searchQueries = mergeDiscoveryQueries(templatedQueries, discoveryBacklog);

  return {
    metadata: {
      market: preferences.market?.active || "default",
      discovery_mode: "hybrid",
      generated_from_confirmed_targets: true,
      market_wide_discovery: true,
      priority_companies_only: false,
      company_selection: companySelectionSource,
      recommendation_fallback_count: recommendationFallbackCount,
    },
    title_filter: {
      positive: roleKeywords,
      negative: excludedKeywords,
    },
    location_filter: {
      include: locationTerms,
      exclude: limitations.unavailableCountries,
    },
    freshness: {
      max_age_days: preferences.discovery?.maxJobAgeDays || 60,
    },
    link_validation: {
      enabled: true,
      reject_statuses: [404, 410],
    },
    tracked_companies: trackedCompanies,
    discovery_backlog: discoveryBacklog,
    search_queries: searchQueries,
  };
}
