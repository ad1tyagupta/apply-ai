import {
  getConfirmedCompanies,
  getConfirmedRoleKeywords,
  getSearchStrategy,
  getUserLimitations,
} from "./workflow-state.mjs";

const CEFR_LEVELS = {
  a1: 1,
  a2: 2,
  b1: 3,
  b2: 4,
  c1: 5,
  c2: 6,
  fluent: 5,
  native: 6,
};

const LANGUAGE_NAMES = [
  "German",
  "English",
  "French",
  "Spanish",
  "Italian",
  "Dutch",
  "Portuguese",
  "Hindi",
];

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function uniqueStrings(values = []) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

function countMatches(text, values = []) {
  return values.reduce((count, value) => (
    keywordMatches(text, value) ? count + 1 : count
  ), 0);
}

function normalizeMatchText(value = "") {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function keywordMatches(text = "", keyword = "") {
  const normalizedText = normalizeMatchText(text);
  const normalizedKeyword = normalizeMatchText(keyword);
  if (!normalizedText || !normalizedKeyword) return false;

  return ` ${normalizedText} `.includes(` ${normalizedKeyword} `);
}

function expandedGeographyTerms(countries = [], cities = []) {
  const terms = [...countries, ...cities];
  const normalizedCountries = countries.map((country) => normalizeMatchText(country));
  if (normalizedCountries.includes("germany") || normalizedCountries.includes("deutschland")) {
    terms.push(
      "Deutschland",
      "DACH",
      "Europe",
      "EU",
      "EMEA",
      "Remote Germany",
      "Remote EU",
      "Remote Europe",
      "Remote EMEA",
    );
  }
  return uniqueStrings(terms);
}

function normalizeSeniority(value = "") {
  const lower = String(value || "").toLowerCase();
  if (/\b(intern|internship|working student)\b/.test(lower)) return "internship";
  if (/\b(principal|staff|head|director|lead)\b/.test(lower)) return "lead";
  if (/\bsenior\b/.test(lower)) return "senior";
  if (/\b(mid|manager|specialist|consultant)\b/.test(lower)) return "mid";
  if (/\b(junior|intern|graduate|entry)\b/.test(lower)) return "entry";
  return "unknown";
}

function normalizeLevel(value = "") {
  const lower = String(value || "").trim().toLowerCase();
  const match = lower.match(/\b(a1|a2|b1|b2|c1|c2|fluent|native)\b/);
  return match?.[1] || "";
}

function levelRank(value = "") {
  return CEFR_LEVELS[normalizeLevel(value)] || 0;
}

function languageName(value = "") {
  const lower = String(value || "").toLowerCase();
  return LANGUAGE_NAMES.find((language) => lower.includes(language.toLowerCase())) || "";
}

function detectPostingLanguage(opportunity = {}) {
  const explicit = [
    opportunity.postingLanguage,
    opportunity.jobPostingLanguage,
    opportunity.language,
    opportunity.locale,
  ].filter(Boolean).join(" ").toLowerCase();

  if (/\b(de|de-de|german|deutsch)\b/.test(explicit)) return "German";
  if (/\b(en|en-us|en-gb|english)\b/.test(explicit)) return "English";

  const text = `${opportunity.title || ""} ${opportunity.description || ""}`.toLowerCase();
  if (/[äöüß]/.test(text) || /\b(und|oder|der|die|das|fuer|für|mit|verantwortlich|kenntnisse|bewerbung|deutsch)\b/.test(text)) {
    return "German";
  }

  return "";
}

function extractLanguageRequirements(opportunity = {}, limitations = {}) {
  const limitedLanguages = (limitations.languageLimits || []).map((limit) => limit.language).filter(Boolean);
  const languages = uniqueStrings([...LANGUAGE_NAMES, ...limitedLanguages]);
  const sources = [
    ...(opportunity.languages || []),
    opportunity.description || "",
    opportunity.requirements || "",
  ].map((source) => String(source));

  const requirements = [];

  for (const source of sources) {
    for (const language of languages) {
      const escaped = language.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const languageThenLevel = new RegExp(`\\b${escaped}\\b.{0,24}\\b(A1|A2|B1|B2|C1|C2|fluent|native)\\b`, "i");
      const levelThenLanguage = new RegExp(`\\b(A1|A2|B1|B2|C1|C2|fluent|native)\\b.{0,24}\\b${escaped}\\b`, "i");
      const fluentLanguage = new RegExp(`\\b(fluent|native)\\s+${escaped}\\b`, "i");
      const match = source.match(languageThenLevel) || source.match(levelThenLanguage) || source.match(fluentLanguage);
      if (match) {
        requirements.push({
          language,
          level: normalizeLevel(match[1]),
        });
      }
    }
  }

  return requirements;
}

function geographyMismatch(opportunity = {}, preferences = {}) {
  const countries = preferences.geography?.countries || [];
  const cities = preferences.geography?.cities || [];
  const remotePolicy = String(preferences.geography?.remotePolicy || "remote").toLowerCase();
  const location = `${opportunity.location || ""} ${opportunity.description || ""}`;

  if (countries.length === 0 && cities.length === 0) return false;
  if (expandedGeographyTerms(countries, cities).some((term) => keywordMatches(location, term))) return false;
  if (remotePolicy === "remote" && /\bremote\b/i.test(location) && countries.length === 0 && cities.length === 0) return false;
  return true;
}

function unavailableCountryMismatch(opportunity = {}, limitations = {}) {
  const unavailableCountries = (limitations.unavailableCountries || []).map((item) => String(item).toLowerCase());
  if (unavailableCountries.length === 0) return false;

  const location = `${opportunity.location || ""} ${opportunity.description || ""}`;
  return unavailableCountries.some((country) => keywordMatches(location, country));
}

function languageMismatch(opportunity = {}, profileFacts = {}) {
  const required = [
    ...(opportunity.languages || []),
    ...((String(opportunity.description || "").match(/\b(?:fluent|native)\s+[A-Z][a-z]+/g) || []).map((item) => item.replace(/\b(?:fluent|native)\s+/i, ""))),
  ].map((item) => String(item).toLowerCase());

  if (required.length === 0) return false;

  const available = (profileFacts.languages || []).map((item) => String(item).toLowerCase());
  return !required.some((language) => available.some((known) => known.includes(language)));
}

function languageLimitMismatch(opportunity = {}, limitations = {}) {
  const requirements = extractLanguageRequirements(opportunity, limitations);

  for (const limit of limitations.languageLimits || []) {
    const maxRank = levelRank(limit.maxRoleRequirement);
    if (!maxRank) continue;

    const requirement = requirements.find((item) => item.language.toLowerCase() === String(limit.language).toLowerCase());
    if (requirement && levelRank(requirement.level) > maxRank) {
      return true;
    }
  }

  return false;
}

function postingLanguageBlocked(opportunity = {}, limitations = {}) {
  const blocked = (limitations.rejectPostingLanguages || []).map((item) => item.toLowerCase());
  if (blocked.length === 0) return false;

  const detected = detectPostingLanguage(opportunity);
  return detected ? blocked.includes(detected.toLowerCase()) : false;
}

function buildAssetPlan({ score, decision, strategy, preferences }) {
  const outputFormat = String(preferences.applicationMaterials?.outputFormat || "pdf").toLowerCase();
  const formattingApproved = preferences.applicationMaterials?.formattingApproved === true;

  if (decision !== "shortlist") {
    return {
      cvMode: "none",
      coverLetterMode: "none",
      reuseGenericCv: false,
      outputFormat,
      formattingApprovalRequired: false,
      sampleOnlyUntilApproved: false,
    };
  }

  if (strategy.mode === "highly selective") {
    return {
      cvMode: "custom",
      coverLetterMode: "required",
      reuseGenericCv: false,
      outputFormat,
      formattingApprovalRequired: !formattingApproved,
      sampleOnlyUntilApproved: !formattingApproved,
    };
  }

  if (score >= 80) {
    return {
      cvMode: "custom",
      coverLetterMode: "required",
      reuseGenericCv: false,
      outputFormat,
      formattingApprovalRequired: !formattingApproved,
      sampleOnlyUntilApproved: !formattingApproved,
    };
  }

  return {
    cvMode: "generic",
    coverLetterMode: "required",
    reuseGenericCv: true,
    outputFormat,
    formattingApprovalRequired: !formattingApproved,
    sampleOnlyUntilApproved: !formattingApproved,
  };
}

export function scoreOpportunity({ opportunity, preferences = {}, profileFacts = {} }) {
  const text = [
    opportunity.title,
    opportunity.company,
    opportunity.location,
    opportunity.description,
  ].filter(Boolean).join(" ");

  const strategy = getSearchStrategy(preferences);
  const roleKeywords = getConfirmedRoleKeywords(preferences);
  const acceptedCompanies = getConfirmedCompanies(preferences);
  const limitations = getUserLimitations(preferences);
  const skills = (profileFacts.skills || []).map((item) => String(item));
  const roleSignals = (profileFacts.inferred?.roleSignals || []).map((item) => item.name);
  const profileSeniority = profileFacts.inferred?.seniority?.level || "unknown";
  const opportunitySeniority = normalizeSeniority(opportunity.seniority || opportunity.title);
  const roleIntentMatches = countMatches(text, roleKeywords);
  const skillMatches = countMatches(text, skills);
  const roleSignalMatches = countMatches(text, roleSignals);
  const targetSeniorities = (preferences.rolePreferences?.targetSeniorities || [])
    .map((item) => normalizeSeniority(item))
    .filter((item) => item !== "unknown");
  const openToInternships = preferences.rolePreferences?.openToInternships === true
    || targetSeniorities.includes("internship");

  let score = 24;
  let forceReject = false;
  const reasons = [];

  if (roleIntentMatches > 0) {
    score += Math.min(24, roleIntentMatches * 8);
    reasons.push("Matched confirmed role intent.");
  }

  if (skillMatches > 0) {
    score += Math.min(12, skillMatches * 4);
    reasons.push("Matched source-backed skills or tools.");
  }

  if (roleSignalMatches > 0) {
    score += Math.min(8, roleSignalMatches * 4);
    reasons.push("Matched inferred role signals from the user brain.");
  }

  if (acceptedCompanies.some((company) => String(opportunity.company || "").toLowerCase().includes(company.toLowerCase()))) {
    score += 10;
    reasons.push("Matched a user-confirmed target company.");
  }

  if (
    profileSeniority !== "unknown"
    && opportunitySeniority !== "unknown"
    && profileSeniority === opportunitySeniority
  ) {
    score += 6;
    reasons.push("Aligned with realistic seniority for the user.");
  }

  if (roleIntentMatches + skillMatches >= 4) {
    score += 6;
    reasons.push("Strong narrative fit across the role description.");
  }

  if (geographyMismatch(opportunity, preferences)) {
    score -= 35;
    reasons.push("Rejected on geography realism.");
  }

  if (unavailableCountryMismatch(opportunity, limitations)) {
    score -= 40;
    forceReject = true;
    reasons.push("Rejected because the role is in an unavailable country.");
  }

  if (languageMismatch(opportunity, profileFacts)) {
    score -= 25;
    reasons.push("Rejected on language realism.");
  }

  if (languageLimitMismatch(opportunity, limitations)) {
    score -= 40;
    forceReject = true;
    reasons.push("Rejected because the role exceeds the user's language limit.");
  }

  if (postingLanguageBlocked(opportunity, limitations)) {
    score -= 40;
    forceReject = true;
    reasons.push("Rejected because the job posting language is blocked by the user's limitations.");
  }

  if (opportunitySeniority === "internship" && !openToInternships) {
    score -= 40;
    forceReject = true;
    reasons.push("Rejected because internships are not in the user's target role level.");
  }

  if (
    targetSeniorities.length > 0
    && opportunitySeniority !== "unknown"
    && !targetSeniorities.includes(opportunitySeniority)
  ) {
    score -= 18;
    reasons.push("Reduced because the role seniority is outside the user's target level.");
  }

  if ((profileSeniority === "mid" || profileSeniority === "entry") && opportunitySeniority === "lead") {
    score -= 18;
    reasons.push("Reduced for seniority realism.");
  }
  if (profileSeniority === "entry" && opportunitySeniority === "senior") {
    score -= 12;
    reasons.push("Reduced for seniority realism.");
  }

  const finalScore = clampScore(score);
  const decision = !forceReject && finalScore >= strategy.minimumScore ? "shortlist" : "reject";
  return {
    score: finalScore,
    threshold: strategy.minimumScore,
    decision,
    assetPlan: buildAssetPlan({ score: finalScore, decision, strategy, preferences }),
    reasons,
  };
}
