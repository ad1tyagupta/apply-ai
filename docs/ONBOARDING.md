# Onboarding

Codex should guide onboarding through conversation, then use the helper scripts in this order.

## Step 1

Collect:

- target geography
- limitations
  - countries the user cannot work in
  - work authorization or visa limits
  - language ceilings
  - rejected job-posting languages
- search mode
- explanation of broad vs balanced vs highly selective vs custom
- guide `broad` or `balanced` for users new to the market or unemployed
- guide `highly selective` for users already employed and looking for a change
- target role breadth
- target seniorities
- internship preference
- preferred and excluded priority companies
- manually added priority companies

Use concrete examples when asking for limitations:

- "If you speak German at A2 and are learning B1, should roles requiring German above B1 be rejected?"
- "If a German-language job post should be treated as requiring fluent German, should German job postings be rejected?"

Use concrete examples when asking for role level:

- "Even with many years of experience, are you entering a new market and therefore targeting junior or mid-level roles?"
- "Should internships be included or rejected?"

## Step 2

Create or confirm the upload folder, then give the user the full absolute path.

```bash
mkdir -p intake/raw
npm run uploads:check
```

`npm run uploads:check` prints the absolute upload folder. After the user uploads files, run it again, list the detected documents, and ask the user to confirm these are the intended uploads before ingesting.

Recommended uploads:

- old CVs
- old cover letters
- detailed background notes
- about-me documents
- project-history documents

Do not ask users to upload transcripts, certificates, or mark sheets. Ask them to summarize those in text if relevant.

## Step 3

Convert documents into Markdown.

```bash
npm run ingest
```

## Step 4

Build the user brain.

```bash
npm run profile:build
```

This now generates:

- `profile/facts.yml`
- `profile/wiki/*`

## Step 5

Generate starter recommendations.

```bash
npm run recommend
```

## Step 6

After the user confirms target roles, seniority, internship preference, and priority companies, build `portals.yml`.

```bash
npm run portals:build
```

Selected companies are priority companies, not the search boundary. If some companies are unsupported by the deterministic scanner, keep using the generated backlog and market-wide search queries in Codex.

## Step 7

Discover at least 10 relevant live jobs when available. Verify links before presenting them. Ask the user to open a few links and confirm the job set looks relevant before bulk scoring and material generation.

## Step 8

Score jobs against the user’s strategy, limitations, language blockers, seniority intent, and source-backed profile facts.

For the first shortlisted job only, create a CV PDF and cover-letter PDF for formatting approval when `applicationMaterials.formattingApproved` is false. Once approved, set it to `true` and do not ask again.
