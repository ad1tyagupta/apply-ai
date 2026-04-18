import { getConfirmedCompanies, getConfirmedRoleKeywords, getSearchStrategy } from "./workflow-state.mjs";

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function includesAny(text, values = []) {
  const lower = text.toLowerCase();
  return values.some((value) => lower.includes(String(value).toLowerCase()));
}

function countMatches(text, values = []) {
  const lower = text.toLowerCase();
  return values.reduce((count, value) => (
    lower.includes(String(value).toLowerCase()) ? count + 1 : count
  ), 0);
}

function normalizeSeniority(value = "") {
  const lower = String(value || "").toLowerCase();
  if (/\b(principal|staff|head|director|lead)\b/.test(lower)) return "lead";
  if (/\bsenior\b/.test(lower)) return "senior";
  if (/\b(mid|manager|specialist|consultant)\b/.test(lower)) return "mid";
  if (/\b(junior|intern|graduate|entry)\b/.test(lower)) return "entry";
  return "unknown";
}

function geographyMismatch(opportunity = {}, preferences = {}) {
  const countries = (preferences.geography?.countries || []).map((item) => String(item).toLowerCase());
  const cities = (preferences.geography?.cities || []).map((item) => String(item).toLowerCase());
  const remotePolicy = String(preferences.geography?.remotePolicy || "remote").toLowerCase();
  const location = `${opportunity.location || ""} ${opportunity.description || ""}`.toLowerCase();

  if (remotePolicy === "remote" && /\bremote\b/.test(location)) return false;
  if (countries.length === 0 && cities.length === 0) return false;
  if (cities.some((city) => location.includes(city))) return false;
  if (countries.some((country) => location.includes(country))) return false;
  return true;
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

function buildAssetPlan({ score, decision, strategy }) {
  if (decision !== "shortlist") {
    return {
      cvMode: "none",
      coverLetterMode: "none",
      reuseGenericCv: false,
    };
  }

  if (strategy.mode === "highly selective") {
    return {
      cvMode: "custom",
      coverLetterMode: "required",
      reuseGenericCv: false,
    };
  }

  if (score >= 80) {
    return {
      cvMode: "custom",
      coverLetterMode: "required",
      reuseGenericCv: false,
    };
  }

  return {
    cvMode: "generic",
    coverLetterMode: "required",
    reuseGenericCv: true,
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
  const skills = (profileFacts.skills || []).map((item) => String(item));
  const roleSignals = (profileFacts.inferred?.roleSignals || []).map((item) => item.name);
  const profileSeniority = profileFacts.inferred?.seniority?.level || "unknown";
  const opportunitySeniority = normalizeSeniority(opportunity.seniority || opportunity.title);
  const roleIntentMatches = countMatches(text, roleKeywords);
  const skillMatches = countMatches(text, skills);
  const roleSignalMatches = countMatches(text, roleSignals);

  let score = 24;
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

  if (languageMismatch(opportunity, profileFacts)) {
    score -= 25;
    reasons.push("Rejected on language realism.");
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
  const decision = finalScore >= strategy.minimumScore ? "shortlist" : "reject";
  return {
    score: finalScore,
    threshold: strategy.minimumScore,
    decision,
    assetPlan: buildAssetPlan({ score: finalScore, decision, strategy }),
    reasons,
  };
}
