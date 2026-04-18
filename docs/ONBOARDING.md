# Onboarding

Codex should guide onboarding through conversation, then use the helper scripts in this order.

## Step 1

Collect:

- target geography
- search mode
- explanation of broad vs balanced vs highly selective vs custom
- guide `broad` or `balanced` for users new to the market or unemployed
- guide `highly selective` for users already employed and looking for a change
- target role breadth
- preferred and excluded companies
- manually added target companies

## Step 2

Place user uploads into `intake/raw/`.

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

After the user confirms target roles and companies, build `portals.yml`.

```bash
npm run portals:build
```

If some companies are unsupported by the deterministic scanner, keep using the generated backlog and search queries in Codex.
