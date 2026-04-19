# CV Strategy

## Rule

Only prepare or tailor a CV after a role reaches the active minimum score.

## Threshold Behavior

- for `broad` and `balanced`
  - below `60`
    - reject the role and log the reason
  - `60-79`
    - use one reusable generic CV
    - still create a cover letter
  - `80+`
    - create a custom CV
    - create a cover letter
- for `highly selective`
  - below `85`
    - reject the role and log the reason
  - `85+`
    - always create a custom CV
    - always create a cover letter

## First Formatting Approval

Application assets should be PDFs.

When `applicationMaterials.formattingApproved` is false, create one CV PDF and one cover-letter PDF for the first approved job only. Ask the user to check formatting. If they approve, set `applicationMaterials.formattingApproved: true` and reuse that decision in future runs.

## Fact Rule

Every CV bullet must be supportable by uploaded documents or profile wiki content that is itself source-backed.
