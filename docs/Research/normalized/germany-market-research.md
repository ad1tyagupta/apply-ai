# Germany Market Research - Normalized

Generated on 2026-04-19 from two deep-research outputs:

- `../raw/chatgpt-deep-research-report.md`
- `../raw/german-job-discovery-tool-registry.txt`

The raw files were readable, but they were not suitable as primary project documentation. They repeated the same company data in multiple shapes, mixed prose with pseudo-tables, and included broken citation tokens. This file is the deduplicated, contributor-friendly version.

## Canonical Sources

The runtime source of truth is the Germany market pack:

- `../../../market/germany/companies.yml`
- `../../../market/germany/queries.yml`
- `../../../market/germany/role-families.yml`
- `../../../market/germany/filters.yml`

The normalized YAML companion file, `germany-market-research.yml`, keeps a compact machine-readable index of the research decisions and validation rules. The full API URLs, dedup keys, role keywords, and backlog reasons live in `market/germany/companies.yml`.

## Consolidated Findings

Version 1 should be API-first. Direct ATS job-board APIs produce more reliable posting links and fresher records than search results or generic career page scraping.

Greenhouse, Ashby, and Lever are the supported v1 providers because they expose public job-board JSON, stable job IDs, and canonical job URL fields. Other ATS families are valuable for later coverage, but they need dedicated parsers or browser/network discovery.

German-market location matching needs broad but controlled acceptance. Include Germany, Deutschland, Berlin, Munich, Muenchen, Hamburg, Cologne, Koeln, Frankfurt, Stuttgart, DACH, EMEA, Europe, Remote Germany, Remote EU, and Remote Europe. Exclude listings that are explicitly US-only or unavailable in Europe.

Role matching should prioritize AI, ML, LLM, GenAI, automation, forward-deployed engineering, solutions engineering, customer engineering, GTM engineering, RevOps, product, internal tools, and business systems. Negative filters should remove internships, working-student roles, junior roles, SAP ABAP, mainframe, mobile-only, embedded-only, and unrelated warehouse/operator roles.

Freshness should be enforced with provider date fields where available. The Germany pack uses a 60-day freshness limit by default, and jobs should be treated as stale or closed when a full API sync no longer returns their provider ID.

Deduplication should prefer provider IDs first, canonical URLs second, and normalized company/title/location keys third. This handles repeated listings across scans and protects against future repeated job rows when URL tracking parameters or minor title formatting changes appear.

## ATS Pattern Matrix

| Provider | Detect from | Public API pattern | URL field | ID field | Date fields | v1 status |
| --- | --- | --- | --- | --- | --- | --- |
| Greenhouse | `job-boards.greenhouse.io/{board}` or `boards.greenhouse.io/{board}` | `https://boards-api.greenhouse.io/v1/boards/{board}/jobs?content=true` | `absolute_url` | `id` | `updated_at` | Supported |
| Greenhouse EU | `job-boards.eu.greenhouse.io/{board}` | Usually global API works; validate EU/global endpoint per board | `absolute_url` | `id` | `updated_at` | Supported after validation |
| Ashby | `jobs.ashbyhq.com/{board}` | `https://api.ashbyhq.com/posting-api/job-board/{board}?includeCompensation=true` | `jobUrl` | `id` | `publishedAt`, `updatedAt` | Supported |
| Lever | `jobs.lever.co/{site}` | `https://api.lever.co/v0/postings/{site}?mode=json` | `hostedUrl` | `id` | `createdAt` | Supported |
| Lever EU | `jobs.eu.lever.co/{site}` | `https://api.eu.lever.co/v0/postings/{site}?mode=json` | `hostedUrl` | `id` | `createdAt` | Supported |
| SmartRecruiters | `careers.smartrecruiters.com/{company}` | `https://api.smartrecruiters.com/v1/companies/{company}/postings` | `jobAdUrl` | `id` | `postedDate` | Backlog |
| Personio | `{company}.jobs.personio.de` | `https://{company}.jobs.personio.de/search.json` | `url` or derived HTML URL | `id` | inconsistent | Backlog |
| Recruitee | `{company}.recruitee.com` | `https://{company}.recruitee.com/api/offers` | `careers_url` | `id` | `created_at` | Backlog |
| Workable | `apply.workable.com/{company}` | `https://apply.workable.com/api/v1/widget/accounts/{company}` | `url` | `id` | `published_on` | Backlog |
| Teamtailor | careers pages marked as Teamtailor powered | Public JSON usually requires token; XML/browser path may be needed | varies | `id` | `created-at` | Backlog |
| Workday | `myworkdayjobs.com` | Deployment-specific and often blocked | varies | varies | varies | Backlog |
| Softgarden | `{company}.softgarden.io` or embedded widgets | Widget/custom parsing | HTML-derived | HTML-derived | HTML-derived | Backlog |
| Join.com | `join.com/companies/{company}` | Browser/sub-resource discovery | varies | varies | varies | Backlog |
| Custom pages | Proprietary careers pages | Browser/network discovery | varies | varies | varies | Backlog |

## Deduplicated Company Decisions

The normalized v1 registry contains 34 API-ready companies and 10 backlog companies. The complete fields are stored in `market/germany/companies.yml`.

API-ready companies:

| Company | Provider | Slug | Confidence | Notes |
| --- | --- | --- | --- | --- |
| Aleph Alpha | Ashby | `AlephAlpha` | High | German AI company; Ashby endpoint verified. |
| DeepL | Ashby | `DeepL` | High | Core Germany/Europe AI source. |
| Black Forest Labs | Greenhouse | `blackforestlabs` | High | Freiburg generative AI source. |
| Helsing | Greenhouse | `helsing` | Medium | Research disagreed on surface provider; endpoint kept with monitoring. |
| Parloa | Greenhouse | `parloa` | High | High-value AI, solutions, and forward-deployed roles. |
| Langfuse | Ashby | `langfuse` | High | Berlin/Munich LLMOps and DevTools source. |
| Lakera | Ashby | `lakera.ai` | High | AI security source; location filtering matters. |
| n8n | Ashby | `n8n` | High | Strong automation and workflow source. |
| Contentful | Greenhouse | `contentful` | High | Berlin enterprise SaaS source. |
| Celonis | Greenhouse | `celonis` | Medium | Research disagreed on provider; keep monitored. |
| Taxfix | Ashby | `taxfix.com` | High | Clean Ashby structure. |
| N26 | Greenhouse | `n26` | Medium | Useful Berlin fintech source; monitor volume. |
| Trade Republic | Greenhouse | `traderepublic` | Medium | Clean source with current-volume monitoring. |
| Raisin | Greenhouse | `raisin` | High | Berlin/Frankfurt/Hamburg/Munich coverage. |
| GetYourGuide | Greenhouse | `getyourguide` | High | Strong Berlin travel-tech source. |
| HelloFresh | Greenhouse | `hellofresh` | High | Needs negative filters for warehouse/non-target roles. |
| Scout24 | Greenhouse | `autoscout24` | High | Legacy board token. |
| IDnow | Greenhouse | `idnow` | High | EU-hosted board with validated compatible API path. |
| Vercel | Greenhouse | `vercel` | High | Strong remote-Germany signal. |
| Supabase | Ashby | `supabase` | Medium | Research disagreed on surface; Ashby endpoint kept with monitoring. |
| OpenAI | Ashby | `openai` | High | Filter for Europe, EMEA, London, Munich, or remote-Europe availability. |
| Anthropic | Greenhouse | `anthropic` | High | EU location strings may be nested. |
| Cohere | Ashby | `cohere` | High | Good remote-Europe AI source. |
| Pinecone | Ashby | `pinecone` | High | Verify EMEA listings through location fields. |
| ElevenLabs | Ashby | `elevenlabs` | High | High-value Europe/Germany AI source. |
| Synthesia | Ashby | `synthesia` | High | Strong DACH signal and AI/SaaS role fit. |
| Perplexity | Ashby | `perplexity` | High | Filter for EU timezone and remote-Europe language. |
| Miro | Greenhouse | `realtimeboardglobal` | High | Legacy Greenhouse token. |
| Upvest | Ashby | `upvest` | High | DACH embedded-finance source. |
| Clarisights | Ashby | `clarisights` | High | Analytics integrations and GTM engineering source. |
| Lovehoney Group | Lever EU | `lovehoneygroup` | High | Lever EU deployment. |
| Sport Alliance | Lever EU | `sportalliance` | High | Germany-remote Lever EU source. |
| Saviynt | Lever | `saviynt` | High | DACH solutions engineering fit. |
| Datapao | Greenhouse | `datapao` | High | Greenhouse API validated on global API host. |

Backlog companies:

| Company | Detected provider | Priority | Reason |
| --- | --- | --- | --- |
| sennder | SmartRecruiters | High | Valuable German employer; add after SmartRecruiters parser support. |
| Delivery Hero | Custom | High | Important Berlin employer; needs browser/network discovery. |
| SumUp | Custom | High | High-value fintech; needs browser/network discovery. |
| Forto | Custom | High | Logistics-tech source without confirmed direct feed. |
| Personio | Personio custom | High | Major DACH employer; public feed reliability is not confirmed. |
| Zalando | Workday | High | Large Berlin employer; Workday/custom discovery should be separate from v1. |
| Mistral AI | Custom | Medium | Important European AI source, but weaker Germany specificity and no clean v1 API surface. |
| Weights & Biases | Unknown | Medium | Research suggested Greenhouse/Lever, but live public API checks returned 404 on 2026-04-19. |
| Cognigy | Softgarden | Medium | Relevant AI automation company; requires Softgarden/browser handling. |
| Pitch | Custom | Medium | Relevant Berlin product-led company; needs custom discovery. |

## Conflict Resolutions

- The raw reports suggested Weights & Biases as API-ready, but live checks returned 404 for the tested public API paths on 2026-04-19. It is kept in backlog until a working public board is found.
- The raw reports disagreed on several provider surfaces, including Helsing, Celonis, and Supabase. They remain API-ready only where the current endpoint validated, and their confidence is set to medium when the surface is disputed.
- Datapao appeared as Greenhouse EU in the research output, but the working public API endpoint is the global Greenhouse API host. The runtime config uses the validated endpoint.
- SmartRecruiters, Workday, Softgarden, Personio custom pages, and custom pages are intentionally excluded from v1 scanning until each provider has a parser and freshness/link validation strategy.

## Validation Rules

Future updates should pass these checks:

- No duplicate company names across `companies` and `backlog_companies`.
- No duplicate `api_url` values in API-ready companies.
- Every API-ready company has `ats_provider`, `ats_slug`, `api_url`, `job_url_field`, `job_id_field`, and `dedup_key`.
- Normalized research files must not contain broken research-tool citation tokens.
- Raw research files stay in `docs/Research/raw/`; normalized files stay in `docs/Research/normalized/`.
