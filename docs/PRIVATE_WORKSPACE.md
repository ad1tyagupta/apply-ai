# Private Workspace Pattern

ApplyAI is designed to be publishable as a clean public repository while still being practical for real job-search use.

## Recommended Setup

- public template repo: `apply-ai`
- private working copy: `apply-ai-private`

Use the public repo for code, generic examples, documentation, and public-safe defaults.

Use the private workspace for real uploads in `intake/raw/`, active tracker data, generated outputs, and personal experiments.

Runtime files such as `config/profile.yml`, `config/user-preferences.yml`, `portals.yml`, `data/*`, and generated `profile/*` pages are ignored by Git. `npm run doctor` can recreate the local config files from the checked-in examples.

When Codex asks for documents, it should create or confirm `intake/raw/`, print the full absolute path, and run `npm run uploads:check` after upload so the user can confirm the file list.

## Why This Split Exists

- keeps personal data out of the public repository
- lets the public repo stay reusable for other users
- prevents private working state from polluting defaults
- makes it easier to contribute product changes without leaking personal search history

## Operational Rule

If a user is evaluating the product or contributing to the public repo, the public repo is fine.

If a user is running a real job search with personal documents, the private workspace is the recommended operating environment.
