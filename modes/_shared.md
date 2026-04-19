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

Language and limitation blockers:

- reject roles that require language ability above the user's stated ceiling
- reject job postings written in a language the user marked as a no-go
- treat user-stated limitations as stronger than inferred profile facts

Seniority intent:

- respect the user's chosen target levels even when their past experience is higher
- reject internships unless the user explicitly opts in

## Search Modes

- `broad` uses default threshold `60`
- `balanced` uses default threshold `60`
- `highly selective` uses default threshold `85`
- `custom` uses the user-selected threshold

Explain the tradeoff before using the threshold:

- lower threshold means more applications with mixed fit
- higher threshold means fewer applications with tighter fit
- recommend `broad` or `balanced` when the user is new to the market or unemployed
- recommend `highly selective` when the user already has a job and wants a high-fit change

## CV Rules

- for `broad` and `balanced`:
  - scores `60-79` use one reusable generic CV plus a cover letter
  - scores `80+` use a custom CV plus a cover letter
- for `highly selective`:
  - reject anything below `85`
  - always use a custom CV plus a cover letter for shortlisted roles
- generate application materials as PDFs
- if `applicationMaterials.formattingApproved` is false, create one CV PDF and one cover-letter PDF for the first shortlisted job and ask for formatting approval before generating more
- once formatting is approved, set `applicationMaterials.formattingApproved: true` and do not ask again

## Output Rules

- never invent facts
- never auto-submit applications
- keep CV and cover-letter language direct and supported
- keep generated documents Workday-safe when asked to produce final materials
