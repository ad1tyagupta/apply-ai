# ApplyAI

ApplyAI is a Codex-first workspace for person-first job-search operations. It helps a user onboard their career documents, convert them into Markdown, build a source-backed user brain, generate target-role and company recommendations, discover live jobs, score those jobs against a chosen search style, and prepare factual application assets.

ApplyAI was inspired by [Career Ops](https://github.com/santifer/career-ops) and [LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f), but designed as a distinct Codex-first workflow focused on source-backed profile building, structured job discovery, and factual application materials.

## What ApplyAI Does

- runs a stateful chat-driven onboarding flow in Codex
- converts uploaded career documents into Markdown
- keeps raw uploads separate from working Markdown files
- builds a source-backed user brain in `profile/facts.yml` and `profile/wiki/*`
- recommends 20 to 30 companies and 10 to 20 role families
- lets the user add their own target companies
- keeps generated suggestions separate from user-confirmed preferences
- builds `portals.yml` only from confirmed preferences
- supports hybrid discovery through local scanning plus Codex-assisted search queries
- scores jobs against the user’s selected search strategy
- keeps final application submission manual

## Core Promise

ApplyAI is designed to stay factual.

- no invented experience
- no invented metrics
- no inflated language ability
- no unsupported claims in CVs or cover letters

## First Run

1. Install dependencies.
2. Create a private sibling workspace for real job-search use if you want to keep personal files out of the public repo.
3. Open Codex in the workspace you plan to use.
4. Let Codex guide the onboarding conversation.
5. When Codex asks for uploads, use the full `intake/raw` folder path it prints.
6. Let Codex verify the uploaded file list before ingesting.
7. Run the helper scripts when Codex asks for them.

## Setup

```bash
npm install
npx playwright install chromium
npm run doctor
```

## Recommended Workflow

```bash
npm run uploads:check
npm run ingest
npm run profile:build
npm run recommend
npm run portals:build
npm run scan
```

`npm run profile:build` now generates both `profile/facts.yml` and `profile/wiki/*`.
`npm run uploads:check` prints the absolute upload folder and lists uploaded files so Codex can confirm them with the user before ingest.

## Search Modes

- `broad`
  - default minimum score `60`
  - best for users entering a market or currently unemployed
- `balanced`
  - default minimum score `60`
  - best for users entering a market or currently unemployed who still want stronger prioritization
- `highly selective`
  - default minimum score `85`
  - best for users who already have a job and are looking for a strong change
- `custom`
  - user-defined threshold

Codex should explain these tradeoffs before the user chooses one.

## Recommended Uploads

Best inputs:

- old CVs
- old cover letters
- detailed background notes
- about-me documents
- detailed project-history documents

Avoid uploading:

- transcripts
- certificates
- mark sheets

If certificates, grades, or marks matter, summarize them in text instead of uploading more files.

## Limitations And Role Level

During onboarding, ApplyAI asks for limitations before discovery starts.

Examples:

- countries or regions where the user cannot work
- visa or work authorization constraints
- language ceilings, such as "German A2, learning B1, reject roles requiring German above B1"
- posting-language blockers, such as "reject German-language postings"

ApplyAI also asks for seniority intent. This matters because users may intentionally target junior or mid-level roles in a new market even if they have more experience elsewhere, or they may want internships included or rejected.

Selected companies are priority companies, not a hard limit. ApplyAI should still use market-wide discovery queries for all matching companies in the chosen geography.

## Repository Layout

- `intake/raw/`
  - preserved uploads
- `intake/normalized/`
  - Markdown conversions plus provenance manifests
- `profile/facts.yml`
  - structured user brain for matching, discovery, and scoring
- `profile/wiki/`
  - source-backed working memory for Codex
- `profile/recommendations.yml`
  - machine-readable system suggestions before user confirmation
- `market/default/`
  - starter companies, role families, filters, and query templates
- `career_ops_core/`
  - reusable scripts and templates
- `modes/`
  - Codex behavior guides
- `examples/`
  - sample content only, no personal data

## Important Notes

- this repo cannot force a native popup when Codex opens it
- first-run onboarding is implemented through `AGENTS.md`, workflow state, and helper scripts
- the public repo is meant to stay generic; a private sibling workspace is the recommended place for real user documents and outputs
- the included engine scans supported portals locally and emits Codex-assisted discovery queries for the rest
- the user always decides whether to submit
- the public GitHub slug for this project is intended to be `apply-ai`
