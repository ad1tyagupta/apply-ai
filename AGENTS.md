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
   - background documents
   - transcripts or certificates if useful
4. role families and company preferences
5. confirmation of recommended roles and companies

Do not jump into live job search until the user has completed enough onboarding context.

## Read First

Before doing meaningful work, read these files in this order:

1. `config/user-preferences.yml`
2. `config/profile.yml`
3. `profile/master-profile.md`
4. `profile/role-map.md`
5. `profile/cv-strategy.md`
6. `modes/_shared.md`
7. `modes/_profile.md`

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
5. Treat derived wiki pages as reusable working memory only when they stay source-backed.
6. Generated CVs and cover letters must be factual and auditable.
7. Explain score-mode tradeoffs before the user chooses a threshold.
8. Never auto-submit applications.

## Practical Workflow

1. Complete onboarding if the user profile is still generic or incomplete.
2. Run `npm run ingest` after files land in `intake/raw/`.
3. Run `npm run profile:build` to refresh the profile wiki.
4. Run `npm run recommend` to seed company and role suggestions.
5. Confirm accepted companies, excluded companies, and target roles with the user.
6. Run `npm run portals:build` to regenerate `portals.yml`.
7. Scan roles with `npm run scan`.
8. Score roles `0-100` using the user’s selected search mode.
9. Reject jobs below the active threshold with a recorded reason.
10. Prepare factual CV and cover-letter assets for shortlisted roles.

## Search Modes

- `broad`
  - default threshold `60`
  - more applications, wider fit range
- `balanced`
  - default threshold `75`
  - moderate volume with stronger relevance
- `highly selective`
  - default threshold `90`
  - low volume, strongest fit only
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
