# German Market Discovery

ApplyAI now has a first-class Germany market pack at `market/germany`.

The integration uses the cleaned research in `docs/Research/normalized/` to prioritize direct ATS APIs over search-engine results. Version 1 focuses on Greenhouse, Ashby, and Lever because those providers expose stable public job-board data and reliable posting links. The raw pasted research outputs are retained under `docs/Research/raw/` only as audit history.

## How It Works

1. `config/user-preferences.yml` selects `market.active: germany`.
2. `npm run recommend` loads `market/germany/companies.yml` and `market/germany/role-families.yml`.
3. After target companies are accepted in user preferences, `npm run portals:build` preserves ATS metadata such as `ats_provider`, `api_url`, `job_url_field`, and `dedup_key`.
4. If no companies have been accepted yet, `npm run portals:build` can seed the scan plan from the top companies in `profile/recommendations.yml`.
5. `npm run scan` can scan official company-owned career URLs when `api_url` is present, rather than requiring the `careers_url` itself to be an ATS-hosted URL.
6. `npm run scan` uses token-aware title matching, stricter Germany/Europe location matching, freshness filtering, duplicate checks, and optional final URL validation before writing jobs.

## Source Quality

Tier 1 companies in `companies.yml` are API-first candidates. Higher-risk companies are retained under `backlog_companies` until provider-specific support is added or manually verified.

The normalized research pack removes repeated company rows, broken research-tool citation tokens, and conflicting duplicate table formats before future contributors or tools read the data.

The scanner should continue to treat direct ATS APIs as the preferred discovery path:

1. Public ATS API.
2. Company career page with browser discovery.
3. Search query only for missing company/slugs or source discovery.

## Caveats

- The two research reports sometimes disagree on provider details. Disputed entries are marked with lower confidence or kept in backlog.
- SmartRecruiters, Workday, Softgarden, Personio custom pages, and custom career pages are not enabled as v1 direct scanner providers.
- Live API availability can change when companies migrate ATS vendors. Revalidate suspicious endpoints before treating a source as broken.
- Generic `Remote` or `Hybrid` text is not enough to pass a Germany-market scan when a country, city, DACH, Europe, EU, or EMEA target is configured.
