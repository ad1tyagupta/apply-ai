# ApplyAI

ApplyAI is a Codex-first workspace for job-search operations. It helps a user onboard their career documents, convert them into Markdown, build a source-backed profile wiki, generate target-role and company recommendations, scan live jobs, score those jobs against a chosen search style, and prepare factual application assets.

ApplyAI was inspired by CareerOps and LLM Wiki, but designed as a distinct Codex-first workflow focused on source-backed profile building, structured job discovery, and factual application materials.

## What ApplyAI Does

- runs a chat-driven onboarding flow in Codex
- converts uploaded career documents into Markdown
- keeps raw uploads separate from working Markdown files
- builds a source-backed profile wiki for later CV and cover-letter work
- recommends 20 to 30 companies and 10 to 20 role families
- lets the user add their own target companies
- builds `portals.yml` from the user’s preferences
- scans live jobs through the existing career-ops engine
- keeps final application submission manual

## Core Promise

ApplyAI is designed to stay factual.

- no invented experience
- no invented metrics
- no inflated language ability
- no unsupported claims in CVs or cover letters

## First Run

1. Install dependencies.
2. Open Codex in this repository.
3. Let Codex guide the onboarding conversation.
4. Upload documents into `intake/raw/`.
5. Run the helper scripts when Codex asks for them.

## Setup

```bash
npm install
npx playwright install chromium
npm run doctor
```

## Recommended Workflow

```bash
npm run ingest
npm run profile:build
npm run recommend
npm run portals:build
npm run scan
```

## Search Modes

- `broad`
  - default minimum score `60`
  - best for entering a market or exploring adjacent roles
- `balanced`
  - default minimum score `75`
  - best for most users
- `highly selective`
  - default minimum score `90`
  - best for specialized or targeted searches
- `custom`
  - user-defined threshold

Codex should explain these tradeoffs before the user chooses one.

## Supported Upload Formats

- `md`
- `txt`
- `pdf`
- `docx`
- common image formats with OCR fallback

## Repository Layout

- `intake/raw/`
  - preserved uploads
- `intake/normalized/`
  - Markdown conversions plus provenance manifests
- `profile/wiki/`
  - source-backed working memory for Codex
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
- first-run onboarding is implemented through `AGENTS.md` and prompt routing
- the included engine scans jobs and prepares assets, but the user always decides whether to submit
- the public GitHub slug for this project is intended to be `apply-ai`
