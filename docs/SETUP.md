# Setup

```bash
npm install
npx playwright install chromium
npm run doctor
```

Optional checks:

```bash
npm test
npm run sync-check
```

Recommended for real use:

- keep the public template repo clean
- use a private sibling workspace for real uploads and active job-search data
- keep uploads focused on CVs, cover letters, background notes, and project-history documents
- run `npm run uploads:check` after uploading documents so Codex can confirm the detected file list before ingest
- record language, geography, visa, seniority, and internship limitations in `config/user-preferences.yml` before discovery
