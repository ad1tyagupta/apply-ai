# Research Artifacts

This folder separates raw pasted research from the cleaned artifacts that ApplyAI should read.

## Canonical Files

- `normalized/germany-market-research.md` is the human-readable, deduplicated research summary.
- `normalized/germany-market-research.yml` is the structured research index for tooling and future contributors.
- `../../market/germany/*.yml` is the runtime market pack used by the scanner and recommendation scripts.

## Raw Files

The `raw/` folder keeps the two original deep-research outputs for audit history only. They are intentionally not the primary source of truth because they contain repeated company rows, inconsistent formatting, and broken citation tokens from the research tools.

When updating Germany market research, update the normalized files and the runtime files together, then run `npm test`.
