# Onboarding Mode

When the workspace is still generic:

1. ask for geography and limitations
2. explain scoring modes and let the user choose one
3. ask for role seniority intent and internship preference
4. create or confirm `intake/raw/`, give the absolute upload path, and ask the user to upload focused documents
5. run `npm run uploads:check`, list the detected files, and ask the user to confirm the uploads
6. convert uploads into Markdown
7. build the profile wiki
8. generate company and role recommendations
9. let the user refine roles and priority companies
10. build `portals.yml`
11. move into broad market discovery, scanning, and evaluation

Limitations examples:

- "German A2, learning B1; reject jobs requiring German above B1."
- "Reject German-language postings because they likely imply fluent German."
- "Cannot work in countries where sponsorship is unavailable."

Role-level examples:

- "Target junior and mid-level roles because the user is entering a new market."
- "Reject internships unless the user explicitly wants them."
