function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

function remoteTerms(remotePolicy) {
  if (remotePolicy === "remote") return ["Remote"];
  if (remotePolicy === "hybrid") return ["Remote", "Hybrid"];
  if (remotePolicy === "onsite") return [];
  return ["Remote"];
}

function buildQuery(template, locationTerms, roleKeywords) {
  return template
    .replace("{{location_terms}}", locationTerms.join(" OR "))
    .replace("{{role_keyword_1}}", roleKeywords[0] || "Product Marketing")
    .replace("{{role_keyword_2}}", roleKeywords[1] || roleKeywords[0] || "Growth");
}

export function buildPortalsConfig({
  preferences,
  acceptedCompanies = [],
  queryTemplates = [],
}) {
  const countries = preferences.geography?.countries || [];
  const cities = preferences.geography?.cities || [];
  const roleKeywords = uniqueStrings(preferences.rolePreferences?.includedKeywords || []);
  const excludedKeywords = uniqueStrings(preferences.rolePreferences?.excludedKeywords || []);
  const excludedCompanies = new Set(
    uniqueStrings(preferences.companyPreferences?.excludedCompanies || []).map((value) => value.toLowerCase()),
  );

  const trackedCompanies = [
    ...acceptedCompanies,
    ...(preferences.companyPreferences?.customCompanies || []),
  ]
    .filter((company) => !excludedCompanies.has(String(company.name).toLowerCase()))
    .map((company) => ({
      name: company.name,
      careers_url: company.careers_url,
      enabled: true,
      role_fit: company.role_fit || [],
    }));

  const locationTerms = uniqueStrings([
    ...countries,
    ...cities,
    ...remoteTerms(preferences.geography?.remotePolicy),
  ]);

  const searchQueries = queryTemplates.map((template, index) => ({
    name: template.name || `Generated query ${index + 1}`,
    query: buildQuery(template.template, locationTerms, roleKeywords),
    enabled: true,
  }));

  return {
    title_filter: {
      positive: roleKeywords,
      negative: excludedKeywords,
    },
    location_filter: {
      include: locationTerms,
      exclude: [],
    },
    tracked_companies: trackedCompanies,
    search_queries: searchQueries,
  };
}
