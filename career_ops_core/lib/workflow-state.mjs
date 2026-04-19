const SEARCH_MODE_LIBRARY = {
  broad: {
    minimumScore: 60,
    tradeoff: "Broad search favors more jobs and faster market coverage, but relevance will be more mixed.",
    recommendedFor: "Best for users who are new to the market or currently unemployed and need more opportunities.",
  },
  balanced: {
    minimumScore: 60,
    tradeoff: "Balanced search still keeps the floor open, but pushes the user to prioritize the more relevant roles first.",
    recommendedFor: "Best for users who are new to the market or currently unemployed but still want to prioritize the more relevant roles first.",
  },
  "highly selective": {
    minimumScore: 85,
    tradeoff: "Highly selective search yields fewer jobs, but fit is much tighter and easier to prioritize.",
    recommendedFor: "Best for users who already have a job and are looking for a high-fit change instead of volume.",
  },
  custom: {
    minimumScore: 75,
    tradeoff: "Custom search lets the user pick their own threshold after understanding the tradeoff.",
    recommendedFor: "Best for users who already know exactly how selective they want to be.",
  },
};

function uniqueStrings(values = []) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

function normalizeMode(mode = "balanced") {
  const normalized = String(mode || "balanced").trim().toLowerCase();
  if (normalized === "highly-selective") return "highly selective";
  return SEARCH_MODE_LIBRARY[normalized] ? normalized : "balanced";
}

export function getSearchStrategy(preferences = {}) {
  const mode = normalizeMode(preferences.searchMode?.mode);
  const library = SEARCH_MODE_LIBRARY[mode];
  const minimumScore = mode === "custom"
    ? Number(preferences.searchMode?.minimumScore || library.minimumScore)
    : library.minimumScore;

  return {
    mode,
    minimumScore,
    tradeoff: mode === "custom"
      ? `Custom search uses the user-selected minimum score of ${minimumScore}.`
      : library.tradeoff,
    recommendedFor: library.recommendedFor,
  };
}

export function getUserLimitations(preferences = {}) {
  const limitations = preferences.limitations || {};
  return {
    confirmed: limitations.confirmed === true,
    unavailableCountries: uniqueStrings(limitations.unavailableCountries || []),
    languageLimits: (limitations.languageLimits || [])
      .filter((limit) => limit?.language)
      .map((limit) => ({
        language: String(limit.language).trim(),
        currentLevel: String(limit.currentLevel || "").trim(),
        learningLevel: String(limit.learningLevel || "").trim(),
        maxRoleRequirement: String(limit.maxRoleRequirement || limit.maximumRequiredLevel || "").trim(),
      })),
    rejectPostingLanguages: uniqueStrings(limitations.rejectPostingLanguages || []),
    notes: uniqueStrings(limitations.notes || []),
  };
}

export function getConfirmedRoleFamilies(preferences = {}) {
  return uniqueStrings(preferences.rolePreferences?.preferredRoleFamilies || []);
}

export function getConfirmedRoleKeywords(preferences = {}) {
  return uniqueStrings([
    ...(preferences.rolePreferences?.includedKeywords || []),
    ...getConfirmedRoleFamilies(preferences),
  ]);
}

export function getConfirmedCompanies(preferences = {}) {
  const customCompanies = (preferences.companyPreferences?.customCompanies || [])
    .map((company) => company?.name)
    .filter(Boolean);

  return uniqueStrings([
    ...(preferences.companyPreferences?.acceptedCompanies || []),
    ...customCompanies,
  ]);
}

export function assessOnboardingState(
  preferences = {},
  {
    rawDocumentCount = 0,
    normalizedDocumentCount = 0,
    hasProfileFacts = false,
  } = {},
) {
  const countries = uniqueStrings(preferences.geography?.countries || []);
  const cities = uniqueStrings(preferences.geography?.cities || []);
  const limitations = getUserLimitations(preferences);
  const roleKeywords = getConfirmedRoleKeywords(preferences);

  const missingSteps = [];

  if (countries.length === 0 && cities.length === 0) {
    missingSteps.push("Confirm a target country or city.");
  }
  if (!limitations.confirmed) {
    missingSteps.push("Confirm work and language limitations, even if there are none.");
  }
  if (rawDocumentCount === 0) {
    missingSteps.push("Upload source documents into intake/raw/.");
  } else if (normalizedDocumentCount === 0) {
    missingSteps.push("Run document ingest so Markdown working files exist.");
  }
  if (!hasProfileFacts) {
    missingSteps.push("Run the brain build so profile facts exist.");
  }
  if (roleKeywords.length === 0) {
    missingSteps.push("Confirm at least one target role family or keyword.");
  }

  return {
    searchStrategy: getSearchStrategy(preferences),
    readyForDiscovery: missingSteps.length === 0,
    readyForRecommendations: (countries.length > 0 || cities.length > 0) && limitations.confirmed && rawDocumentCount > 0 && normalizedDocumentCount > 0 && hasProfileFacts,
    confirmedRoleKeywords: roleKeywords,
    confirmedCompanies: getConfirmedCompanies(preferences),
    limitations,
    missingSteps,
  };
}
