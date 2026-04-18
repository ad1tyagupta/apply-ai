# Shared Rules

## Source Priority

Always use this order:

1. `intake/raw/*`
2. `intake/normalized/*`
3. `profile/wiki/*`
4. `config/profile.yml`
5. `examples/*`

## Scoring Rules

Use a `0-100` score after location, language, and evidence realism checks.

- below the active threshold
  - reject and record a reason
- at or above the active threshold
  - shortlist and prepare factual assets

## Search Modes

- `broad` uses default threshold `60`
- `balanced` uses default threshold `75`
- `highly selective` uses default threshold `90`
- `custom` uses the user-selected threshold

Explain the tradeoff before using the threshold:

- lower threshold means more applications with mixed fit
- higher threshold means fewer applications with tighter fit

## Output Rules

- never invent facts
- never auto-submit applications
- keep CV and cover-letter language direct and supported
- keep generated documents Workday-safe when asked to produce final materials
