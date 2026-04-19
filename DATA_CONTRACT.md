# Data Contract

This workspace separates raw user documents, normalized Markdown, derived profile state, and generated outputs.

## Source Documents

These files must stay preserved as uploaded.

- `intake/raw/*`

## Normalized Working Documents

These files are converted from uploads into Markdown for Codex-friendly processing.

- `intake/normalized/*`

Each normalized document should have a matching manifest file with provenance details.

## Derived Profile State

These files summarize the user without becoming a new source of truth.

- `config/user-preferences.yml`
  - onboarding state, geography, limitations, search mode, role intent, priority companies, and material-format approval
- `config/profile.yml`
- `profile/facts.yml`
- `profile/recommendations.yml`
- `profile/master-profile.md`
- `profile/role-map.md`
- `profile/cv-strategy.md`
- `profile/wiki/*`
- `profile/target-recommendations.md`
- `market/default/*`

## Runtime Compatibility Files

These files keep the legacy engine usable.

- `cv.md`
- `article-digest.md`
- `portals.yml`
- `data/*`
- `reports/*`
- `output/*`

## Generated Application Assets

These files are safe to regenerate at any time.

- `output/*`
- `reports/*`

The first generated CV PDF and cover-letter PDF are used as a one-time formatting sample while `applicationMaterials.formattingApproved` is false.

## Reusable Engine Files

- `career_ops_core/*.mjs`
- `career_ops_core/lib/*`
- `career_ops_core/dashboard/*`
- `career_ops_core/templates/*`
- `career_ops_core/fonts/*`
- `modes/*`
- `AGENTS.md`
- `README.md`

## Public And Private Workspaces

The public repository should stay generic and safe to publish.

- public template workspace: `apply-ai`
- recommended private working workspace: `apply-ai-private`

Real user uploads, active tracker state, and personal outputs should live in the private working copy when the user wants a public-safe setup.
