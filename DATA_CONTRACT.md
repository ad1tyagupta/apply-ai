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
- `config/profile.yml`
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

## Reusable Engine Files

- `career_ops_core/*.mjs`
- `career_ops_core/lib/*`
- `career_ops_core/dashboard/*`
- `career_ops_core/templates/*`
- `career_ops_core/fonts/*`
- `modes/*`
- `AGENTS.md`
- `README.md`
