# Codex Operating Guide

This workspace is the public ApplyAI repository.

## First-Run Behavior

When a new user opens this repository in Codex, start with onboarding instead of job scanning.

Ask for these items in order:

1. target country, optional city, and limitations
   - countries the user cannot work in
   - visa or work authorization constraints
   - language ceilings
   - job-posting languages to reject
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
4. role families, seniority intent, internship preference, and company preferences
5. confirmation of recommended roles and priority companies

Do not jump into live job search until the user has completed enough onboarding context.
Explain the tradeoff of each search style before the user chooses it.
Guide users toward `broad` or `balanced` when they are new to the market or currently unemployed, and toward `highly selective` when they already have a job and want a strong change.
When asking limitations, give examples. Example: "If you speak German at A2 and are learning B1, should roles requiring German above B1 be rejected? If German-language job posts should be treated as fluent-German roles, should German postings be rejected?"
Do not recommend uploading transcripts, certificates, or mark sheets. Ask the user to summarize those in text instead if relevant.
After the user agrees to upload documents, create or confirm the upload folder, give the full absolute folder path, and run `npm run uploads:check` after they upload. List the detected files and ask the user to confirm they are the intended documents before running `npm run ingest`.
When asking role intent, give examples. Example: "Even with many years of experience, a user entering a new country may prefer junior and mid-level roles and may reject internships."
Treat selected companies as priority companies, not as the full search boundary. The search should still cover the broader selected market when the role, geography, and limitations fit.

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
2. Create or confirm the upload folder and give the user its absolute path.
3. Run `npm run uploads:check` after the user says files are uploaded, then confirm the detected file list with the user.
4. Run `npm run ingest` after the user confirms the uploads.
5. Run `npm run profile:build` to refresh the user brain.
6. Run `npm run recommend` to seed company and role suggestions.
7. Confirm target roles, seniority intent, internship preference, keywords, exclusions, and priority companies with the user.
8. Run `npm run portals:build` to regenerate `portals.yml`.
9. Use `npm run scan` for locally supported portal discovery and the generated search queries/backlog for Codex-assisted discovery.
10. During Codex-assisted discovery, collect at least 10 live jobs when available, verify their links, and ask the user to open a few links to confirm relevance before scoring in bulk.
11. Score roles `0-100` using the user’s selected search mode, limitations, seniority intent, and source-backed profile facts.
12. For `broad` or `balanced` searches:
   - use one generic CV for shortlisted jobs scoring `60-79`
   - create custom CVs for shortlisted jobs scoring `80+`
   - always create a cover letter for shortlisted jobs
13. For `highly selective` searches:
   - reject jobs below `85`
   - always create both a custom CV and cover letter for shortlisted jobs
14. On the first shortlisted job only, generate one CV PDF and one cover-letter PDF as a formatting sample when `applicationMaterials.formattingApproved` is false.
15. Ask the user to approve the PDF formatting. If approved, set `applicationMaterials.formattingApproved: true` and do not ask again in later runs.
16. Keep the user in control and never auto-submit.

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

## Link And Formatting Checks

Before presenting jobs to the user, verify that each job link opens and points to the intended role. If fewer than 10 relevant live jobs are available, explain the shortfall and continue discovery rather than padding with weak or stale links.

Application materials should be generated as PDFs for user review. The formatting approval gate is one-time per workspace: ask only while `applicationMaterials.formattingApproved` is false.
