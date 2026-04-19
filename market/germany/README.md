# Germany Market Pack

API-first company and role data for Germany, DACH, EU, and EMEA job discovery.

The pack is derived from the normalized research files in `docs/Research/normalized/` and is intentionally conservative. The original pasted research is kept under `docs/Research/raw/` for audit history only:

- `companies.yml` enables Greenhouse, Ashby, and Lever sources where the research found usable public job-board APIs.
- `backlog_companies` keeps valuable but higher-maintenance sources such as Workday, SmartRecruiters, Softgarden, and custom career pages out of the v1 scanner path.
- `queries.yml` is only for Codex-assisted discovery and gap filling. The scanner should prefer direct ATS APIs.
- `role-families.yml` and `filters.yml` tune recommendations and evaluation toward AI, automation, product, solutions, GTM engineering, RevOps, and internal tools roles.

To use this market, set:

```yaml
market:
  active: "germany"
```
