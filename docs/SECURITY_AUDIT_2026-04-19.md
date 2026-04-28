# Security Audit - 2026-04-19

Scope: local ApplyAI repository, Germany market-pack changes, scanner, scoring, dashboard URL opening, runtime privacy, and dependency surface.

## Checks Run

- `npm audit --json`
- `go run golang.org/x/vuln/cmd/govulncheck@latest ./...`
- secret-pattern scan across tracked source excluding `.git`, `node_modules`, and lockfiles
- Git hygiene check for private runtime files
- scanner and scorer regression tests for token-aware matching and Germany-market location filtering
- dashboard URL-opening tests for unsupported schemes and Windows shell avoidance

## Findings Fixed

1. Private runtime files were tracked despite `.gitignore`.
   - Removed local runtime files from Git tracking while keeping them on disk.
   - Expanded `.gitignore` to cover generated `profile/*` and `data/*` state.
   - Added `data/README.md`, `profile/README.md`, and `tests/repo-hygiene.test.mjs`.

2. `profile:build` ignored the active market and always used default role families.
   - Updated `career_ops_core/build-profile-wiki.mjs` to load role families through `loadMarketData`.
   - Added `tests/profile-build-script.test.mjs`.

3. Dashboard URL opening accepted arbitrary URL schemes and used `cmd /c start` on Windows.
   - Added a strict HTTP(S)-only URL gate.
   - Replaced Windows shell launch with `rundll32 url.dll,FileProtocolHandler`.
   - Added `career_ops_core/dashboard/main_test.go`.

4. Go vulnerability scan flagged `net/url` usage through the dashboard URL gate on the installed Go standard library.
   - Removed `net/url` from the dashboard URL-opening path.
   - Re-ran `govulncheck`; no reachable vulnerabilities remain.

5. Scoring still used substring matching and loose remote geography logic.
   - Updated scoring to use token-aware matching.
   - Updated Germany geography scoring so US-only remote roles are rejected.
   - Added regressions to `tests/opportunity-scoring.test.mjs`.

## Residual Notes

- `govulncheck` reports vulnerabilities in imported or required modules that are not reached by this code path. The symbol-level result is clear.
- The scanner still fetches URLs configured by the local user. This is expected for a local CLI job-search tool, but users should not import untrusted `portals.yml` files without review.
- OCR/PDF/DOCX ingestion can be CPU-heavy for very large documents. The onboarding docs already discourage noisy uploads; future hardening could add explicit file-size limits.
