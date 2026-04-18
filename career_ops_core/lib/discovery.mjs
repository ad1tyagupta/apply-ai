function uniqueStrings(values = []) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

export function detectApi(company = {}) {
  if (company.api && String(company.api).includes("greenhouse")) {
    return { type: "greenhouse", url: company.api };
  }

  const url = company.careers_url || "";

  const ashbyMatch = url.match(/jobs\.ashbyhq\.com\/([^/?#]+)/);
  if (ashbyMatch) {
    return {
      type: "ashby",
      url: `https://api.ashbyhq.com/posting-api/job-board/${ashbyMatch[1]}?includeCompensation=true`,
    };
  }

  const leverMatch = url.match(/jobs\.lever\.co\/([^/?#]+)/);
  if (leverMatch) {
    return {
      type: "lever",
      url: `https://api.lever.co/v0/postings/${leverMatch[1]}`,
    };
  }

  const greenhouseMatch = url.match(/job-boards(?:\.eu)?\.greenhouse\.io\/([^/?#]+)/);
  if (greenhouseMatch) {
    return {
      type: "greenhouse",
      url: `https://boards-api.greenhouse.io/v1/boards/${greenhouseMatch[1]}/jobs`,
    };
  }

  return null;
}

function inferHost(company = {}) {
  try {
    return new URL(company.careers_url).hostname;
  } catch {
    return null;
  }
}

export function buildCompanyDiscoveryBacklog(company = {}, { locationTerms = [], roleKeywords = [] } = {}) {
  const host = inferHost(company);
  const primaryKeyword = roleKeywords[0] || company.role_fit?.[0] || company.name || "jobs";
  const secondaryKeyword = roleKeywords[1] || company.role_fit?.[1] || primaryKeyword;
  const locationClause = locationTerms.length > 0 ? ` ${locationTerms.join(" OR ")}` : "";
  const baseHost = host ? `site:${host}` : `"${company.name}" careers`;

  return {
    name: company.name,
    careers_url: company.careers_url || "",
    reason: "no supported api detected",
    query: `${baseHost}${locationClause} "${primaryKeyword}" OR "${secondaryKeyword}"`,
  };
}

export function buildHybridDiscoveryPlan(companies = [], { locationTerms = [], roleKeywords = [] } = {}) {
  const trackedCompanies = [];
  const discoveryBacklog = [];

  for (const company of companies) {
    const api = detectApi(company);
    if (api) {
      trackedCompanies.push({
        name: company.name,
        careers_url: company.careers_url,
        enabled: company.enabled !== false,
        role_fit: company.role_fit || [],
        api: company.api,
      });
      continue;
    }

    discoveryBacklog.push(buildCompanyDiscoveryBacklog(company, { locationTerms, roleKeywords }));
  }

  return {
    trackedCompanies,
    discoveryBacklog,
  };
}

export function mergeDiscoveryQueries(templateQueries = [], discoveryBacklog = []) {
  const generalQueries = templateQueries.map((query) => ({
    name: query.name,
    query: query.query,
    enabled: query.enabled !== false,
    source: "template",
  }));
  const backlogQueries = discoveryBacklog.map((company) => ({
    name: `company-${company.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    query: company.query,
    enabled: true,
    source: "company-backlog",
  }));

  return uniqueStrings([...generalQueries.map((item) => JSON.stringify(item)), ...backlogQueries.map((item) => JSON.stringify(item))])
    .map((item) => JSON.parse(item));
}
