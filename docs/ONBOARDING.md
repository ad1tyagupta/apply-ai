# Onboarding

Codex should guide onboarding through conversation, then use the helper scripts in this order.

## Step 1

Collect:

- target geography
- search mode
- target role breadth
- preferred and excluded companies

## Step 2

Place user uploads into `intake/raw/`.

## Step 3

Convert documents into Markdown.

```bash
npm run ingest
```

## Step 4

Build the profile wiki.

```bash
npm run profile:build
```

## Step 5

Generate starter recommendations.

```bash
npm run recommend
```

## Step 6

After the user confirms target companies, build `portals.yml`.

```bash
npm run portals:build
```
