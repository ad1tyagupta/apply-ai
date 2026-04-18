# Codex Operating Guide

This workspace is the public ApplyAI repository.

## First-Run Behavior

When a new user opens this repository in Codex, start with onboarding instead of job scanning.

Ask for these items in order:

1. target country and optional city
2. search style
   - broad
   - balanced
   - highly selective
   - custom threshold
3. upload of career documents
   - old CVs
   - cover letters
   - detailed background documents
   - about-me style notes
   - detailed project-history documents
4. role families and company preferences
5. confirmation of recommended roles and companies

Do not jump into live job search until the user has completed enough onboarding context.
Explain the tradeoff of each search style before the user chooses it.
Guide users toward `broad` or `balanced` when they are new to the market or currently unemployed, and toward `highly selective` when they already have a job and want a strong change.
Do not recommend uploading transcripts, certificates, or mark sheets. Ask the user to summarize those in text instead if relevant.

## Read First

Before doing meaningful work, read these files in this order:

1. `config/user-preferences.yml`
2. `config/profile.yml`
3. `profile/facts.yml` if it exists
4. `profile/recommendations.yml` if it exists
5. `profile/master-profile.md`
6. `profile/role-map.md`
7. `profile/cv-strategy.md`
8. `modes/_shared.md`
9. `modes/_profile.md`

Then use these folders as supporting detail:

1. `intake/raw/*`
2. `intake/normalized/*`
3. `profile/wiki/*`
4. `examples/*`

## Non-Negotiable Rules

1. Convert user uploads into Markdown before using them as working context.
2. Keep original uploaded files as preserved source artifacts.
3. Never invent experience, metrics, dates, titles, education details, or language ability.
4. Treat uploaded documents as the factual source of truth.
5. Treat `profile/facts.yml` and derived wiki pages as reusable working memory only when they stay source-backed.
6. Generated CVs and cover letters must be factual and auditable.
7. Explain score-mode tradeoffs before the user chooses a threshold.
8. Never auto-submit applications.
9. Prefer a private sibling workspace for real user documents and outputs when the user wants to keep personal data out of the public repo.

## Practical Workflow

1. Complete onboarding if the user profile is still generic or incomplete.
2. Run `npm run ingest` after files land in `intake/raw/`.
3. Run `npm run profile:build` to refresh the user brain.
4. Run `npm run recommend` to seed company and role suggestions.
5. Confirm accepted companies, excluded companies, target roles, and keywords with the user.
6. Run `npm run portals:build` to regenerate `portals.yml`.
7. Use `npm run scan` for locally supported portal discovery and the generated search queries/backlog for Codex-assisted discovery.
8. Score roles `0-100` using the user’s selected search mode and source-backed profile facts.
9. For `broad` or `balanced` searches:
   - use one generic CV for shortlisted jobs scoring `60-79`
   - create custom CVs for shortlisted jobs scoring `80+`
   - always create a cover letter for shortlisted jobs
10. For `highly selective` searches:
   - reject jobs below `85`
   - always create both a custom CV and cover letter for shortlisted jobs
11. Keep the user in control and never auto-submit.

## Search Modes

- `broad`
  - default threshold `60`
  - more applications, wider fit range
  - recommended for users new to the market or currently unemployed
- `balanced`
  - default threshold `60`
  - moderate volume with stronger prioritization
  - recommended for users new to the market or currently unemployed
- `highly selective`
  - default threshold `85`
  - low volume, strongest fit only
  - recommended for users who already have a job and want a higher-fit change
- `custom`
  - use the user’s chosen minimum score

## Runtime Compatibility

The reusable scripts still expect these root files:

- `cv.md`
- `article-digest.md`
- `config/profile.yml`
- `portals.yml`
- `data/*`
- `reports/*`
- `output/*`

Keep them available, but derive their content from the new intake and profile layers.
