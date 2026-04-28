# German ATS Registry for Job Discovery

## Executive summary

I researched 26 companies in detail for a first-pass Germany/DACH scanning registry. Of these, 21 are strong Tier 1 candidates for direct ATS/API-led discovery right now, and 5 are better treated as Tier 2 browser-discovery candidates until you do per-site reverse engineering. The strongest patterns for v1 are Greenhouse, Ashby, Lever, and SmartRecruiters, because the hosted board slug is discoverable from the public careers surface and the vendor pattern is comparatively stable. Greenhouse’s Job Board API is explicitly public for GET requests, Ashby’s Job Postings API is public, Lever’s Postings API is public for published jobs, and SmartRecruiters documents a public job board API keyed by company identifier. citeturn23view0turn42view2turn24view0turn37view1

Within the detailed registry below, the strongest breakdown is 9 Greenhouse-family boards, 9 Ashby boards, 2 Lever boards, 1 SmartRecruiters board, and 5 Tier 2 custom/browser-discovery cases. The main caveats are important for scanner design. First, Ashby’s public job-board docs clearly expose `jobUrl`, `applyUrl`, and `publishedAt`, but in the excerpt I could verify they do **not** expose a guaranteed separate top-level job ID field, so the safest external key is to parse the UUID from `jobUrl`. Second, Lever clearly documents `id`, `hostedUrl`, and `applyUrl`, but you should not make your freshness logic depend on a date field unless the live response for that site actually contains one. Third, Workday, Personio, Teamtailor, Softgarden, JOIN, BambooHR, and many custom pages either require auth for the richer API path or need per-tenant browser discovery. citeturn42view1turn42view2turn43view2turn43view3turn40view2turn38view6turn38view7turn38view5turn38view3turn41search3

I use the **Real job link field** column below as the practical display-link recommendation for your UI, and the **Recommended dedup key** column as the key you should store in your scanner output.

## Methodology and caveats

I marked a company as **Tier 1** when the public careers surface made the ATS slug or company identifier discoverable and the vendor has a documented or clearly documented public job-board pattern. I marked a company as **Tier 2** when the employer is valuable for Germany/DACH but the public surface is custom, redirect-heavy, or likely needs browser/network discovery to get a robust feed. For the first version of your tool, I would strongly bias crawling budget to Greenhouse, Ashby, Lever, and SmartRecruiters before touching Workday, custom React job boards, or HTML-heavy careers pages. citeturn23view0turn42view2turn24view0turn37view1

The stale-listing strategy should also be provider-specific. For Greenhouse, `updated_at` is available and the board API only exposes published jobs, so stale risk is low. For Ashby, `publishedAt` is available and `isListed` is explicit, so scanners can ignore hidden direct-link-only jobs unless intentionally collecting them. For SmartRecruiters, `releasedDate` is available. For Lever, published jobs are exposed cleanly, but because the public field documentation excerpt I verified does not guarantee a date field, your own `first_seen_at` and `last_seen_at` bookkeeping matters more. Workable is a special case: the authenticated SPI API is richer, but Workable also documents public account endpoints for published jobs, which makes it a potentially good Tier 1 provider once you know the account subdomain. citeturn23view0turn42view2turn37view2turn43view2turn39view1turn39view2

## Table 1: API-ready company registry

| Tier | Company | Germany/DACH relevance | Target role relevance | Careers page | ATS provider | ATS board URL | Public API URL | API status | Real job link field | Job ID field | Date fields | Recommended dedup key | Suggested filters | Confidence | Verification sources | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Tier 1 | Aleph Alpha — aleph-alpha.com | Germany company; Heidelberg | AI; ML; applied research; product | https://jobs.ashbyhq.com/AlephAlpha | Ashby | https://jobs.ashbyhq.com/AlephAlpha | https://api.ashbyhq.com/posting-api/job-board/AlephAlpha?includeCompensation=true | verified public | jobUrl | parse UUID from jobUrl path | publishedAt | ashby:AlephAlpha:{jobUrl_path_uuid} | AI; Research; ML; Applied; Product | High | Ashby board + live role pages citeturn32search0turn32search2 | Low stale risk; use Ashby job URL as canonical. |
| Tier 1 | DeepL — deepl.com | Germany company; Cologne | AI; ML; product; customer-facing tech | https://jobs.ashbyhq.com/DeepL | Ashby | https://jobs.ashbyhq.com/DeepL | https://api.ashbyhq.com/posting-api/job-board/DeepL?includeCompensation=true | verified public | jobUrl | parse UUID from jobUrl path | publishedAt | ashby:DeepL:{jobUrl_path_uuid} | AI; Product; Solutions; Engineering | High | Official Ashby board citeturn1view0 | Strong v1 candidate for Germany coverage. |
| Tier 1 | Black Forest Labs — blackforestlabs.ai | Germany company; Freiburg | AI; ML; applied research; product | https://job-boards.greenhouse.io/blackforestlabs | Greenhouse | https://job-boards.greenhouse.io/blackforestlabs | https://boards-api.greenhouse.io/v1/boards/blackforestlabs/jobs?content=true | verified public | absolute_url | id | updated_at | greenhouse:blackforestlabs:{id} | AI; Applied AI; Research; Infra | High | Greenhouse board + official careers surface citeturn1view1turn0search9 | Very low stale risk; Greenhouse is ideal here. |
| Tier 1 | Helsing — helsing.ai | Berlin; Munich | AI; deployed engineering; product; customer engineering | https://job-boards.greenhouse.io/helsing | Greenhouse | https://job-boards.greenhouse.io/helsing | https://boards-api.greenhouse.io/v1/boards/helsing/jobs?content=true | verified public | absolute_url | id | updated_at | greenhouse:helsing:{id} | AI; Deployed; Product; Safety; Robotics | High | Live Greenhouse openings and DE locations citeturn33search2turn33search4 | Good match for forward-deployed and AI systems roles. |
| Tier 1 | Parloa — parloa.com | Berlin; Germany | AI; solutions; forward deployed; product | https://job-boards.greenhouse.io/parloa | Greenhouse | https://job-boards.greenhouse.io/parloa | https://boards-api.greenhouse.io/v1/boards/parloa/jobs?content=true | verified public | absolute_url | id | updated_at | greenhouse:parloa:{id} | AI; Solutions; FDE; Product; Security | High | Live Greenhouse openings incl AI/customer-facing roles citeturn9search8turn9search10turn9search14 | Excellent role fit for your target profile. |
| Tier 1 | Taxfix — taxfix.com | Berlin; Germany | product; data; platform; internal ops | https://jobs.ashbyhq.com/taxfix.com | Ashby | https://jobs.ashbyhq.com/taxfix.com | https://api.ashbyhq.com/posting-api/job-board/taxfix.com?includeCompensation=true | verified public | jobUrl | parse UUID from jobUrl path | publishedAt | ashby:taxfix.com:{jobUrl_path_uuid} | Product; Data; Platform; Finance-tech | High | Official careers surface + Ashby board citeturn11search2turn11search14 | Good German fintech source with low stale risk. |
| Tier 1 | n8n — n8n.io | Berlin; remote Europe | automation; internal tools; GTM engineering; solutions | https://jobs.ashbyhq.com/n8n | Ashby | https://jobs.ashbyhq.com/n8n | https://api.ashbyhq.com/posting-api/job-board/n8n?includeCompensation=true | verified public | jobUrl | parse UUID from jobUrl path | publishedAt | ashby:n8n:{jobUrl_path_uuid} | Automation; AI; Solutions; GTM; Support | High | Official careers page + Ashby job pages citeturn11search0turn19search2 | Very strong v1 source for automation-adjacent roles. |
| Tier 1 | Lakera — lakera.ai | Germany-focused roles; DACH | AI security; solutions; GTM; product | https://jobs.ashbyhq.com/lakera.ai | Ashby | https://jobs.ashbyhq.com/lakera.ai | https://api.ashbyhq.com/posting-api/job-board/lakera.ai?includeCompensation=true | verified public | jobUrl | parse UUID from jobUrl path | publishedAt | ashby:lakera.ai:{jobUrl_path_uuid} | AI Security; Solutions; GTM; Product | High | Ashby roles incl Germany and solutions architecture citeturn9search5turn9search19turn9search11 | High role relevance; use country/location filters carefully. |
| Tier 1 | Celonis — celonis.com | Munich; Aachen; Germany | AI; product; solutions; enterprise architecture | https://careers.celonis.com/join-us/open-positions | Greenhouse | https://job-boards.greenhouse.io/celonis | https://boards-api.greenhouse.io/v1/boards/celonis/jobs?content=true | verified public | absolute_url | id | updated_at | greenhouse:celonis:{id} | Applied AI; Product; Solutions; Value; Enterprise Arch | High | Official careers + Greenhouse job pages in Munich/Aachen citeturn34search6turn34search5turn34search11turn34search9 | Strong Germany enterprise-tech source. |
| Tier 1 | Trade Republic — traderepublic.com | Berlin; Germany | product; data; ops; internal systems | https://job-boards.greenhouse.io/traderepublic | Greenhouse | https://job-boards.greenhouse.io/traderepublic | https://boards-api.greenhouse.io/v1/boards/traderepublic/jobs?content=true | verified public | absolute_url | id | updated_at | greenhouse:traderepublic:{id} | Product; Ops; Data; Finance-tech | Medium | Live Greenhouse board / job pages citeturn7view1turn6search15 | Board looked smaller than some peers; still clean for API-led discovery. |
| Tier 1 | Raisin — raisin.com | Berlin; Frankfurt; Hamburg; Munich | product; tooling; analytics; customer ops | https://job-boards.greenhouse.io/raisin | Greenhouse | https://job-boards.greenhouse.io/raisin | https://boards-api.greenhouse.io/v1/boards/raisin/jobs?content=true | verified public | absolute_url | id | updated_at | greenhouse:raisin:{id} | Product; Tooling; Analytics; Ops | High | Greenhouse board with multiple German locations citeturn20search10turn20search8turn20search2 | Good dedup characteristics because GH IDs are stable. |
| Tier 1 | GetYourGuide — getyourguide.com | Berlin; Germany | product; data; AI-adjacent content; engineering | https://www.getyourguide.careers/open-roles | Greenhouse | https://job-boards.greenhouse.io/getyourguide | https://boards-api.greenhouse.io/v1/boards/getyourguide/jobs?content=true | verified public | absolute_url | id | updated_at | greenhouse:getyourguide:{id} | Product; Engineering; Data; Content AI | High | Official careers + Greenhouse board/job pages citeturn11search3turn11search7turn10search2 | Low stale risk and good Berlin relevance. |
| Tier 1 | IDnow — idnow.io | Munich; Germany | AI; ML; transformation; product | https://job-boards.eu.greenhouse.io/idnow | Greenhouse EU | https://job-boards.eu.greenhouse.io/idnow | https://boards-api.greenhouse.io/v1/boards/idnow/jobs?content=true | verified public | absolute_url | id | updated_at | greenhouse:idnow:{id} | AI; ML; Product; Transformation | High | EU Greenhouse job pages for AI/ML roles citeturn35search2turn35search17 | Same API pattern as Greenhouse; EU-only hosted board domain. |
| Tier 1 | Vercel — vercel.com | Remote Germany | support; solutions; customer engineering; platform | https://vercel.com/careers | Greenhouse | https://job-boards.greenhouse.io/vercel | https://boards-api.greenhouse.io/v1/boards/vercel/jobs?content=true | verified public | absolute_url | id | updated_at | greenhouse:vercel:{id} | Support; Solutions; Platform; Customer Eng | High | Official careers + Greenhouse board with Germany remote role citeturn16search7turn16search3 | Strong international source for Germany-remote technical roles. |
| Tier 1 | Supabase — supabase.com | Remote Europe | product; solutions; support; GTM engineering | https://jobs.ashbyhq.com/supabase | Ashby | https://jobs.ashbyhq.com/supabase | https://api.ashbyhq.com/posting-api/job-board/supabase?includeCompensation=true | verified public | jobUrl | parse UUID from jobUrl path | publishedAt | ashby:supabase:{jobUrl_path_uuid} | Solutions; Support; GTM; Product | High | Ashby board + EMEA/customer solution roles citeturn17search1turn17search9turn17search11 | Excellent remote-Europe source. |
| Tier 1 | Cohere — cohere.com | Europe / UK/EU/ME remote | AI; forward deployed; security ops; customer engineering | https://jobs.ashbyhq.com/cohere | Ashby | https://jobs.ashbyhq.com/cohere | https://api.ashbyhq.com/posting-api/job-board/cohere?includeCompensation=true | verified public | jobUrl | parse UUID from jobUrl path | publishedAt | ashby:cohere:{jobUrl_path_uuid} | AI; FDE; Security; Customer Eng | High | Cohere Ashby board + Europe/EMEA remote roles citeturn14search3turn14search23turn14search19 | Very good fit for AI and forward-deployed searches. |
| Tier 1 | ElevenLabs — elevenlabs.io | Germany / Europe remote | AI; customer engineering; forward deployed; GTM | https://jobs.ashbyhq.com/elevenlabs | Ashby | https://jobs.ashbyhq.com/elevenlabs | https://api.ashbyhq.com/posting-api/job-board/elevenlabs?includeCompensation=true | verified public | jobUrl | parse UUID from jobUrl path | publishedAt | ashby:elevenlabs:{jobUrl_path_uuid} | AI; Solutions; FDE; Customer Success | High | Ashby board + Germany/Europe roles citeturn18search0turn18search13turn18search19 | High-value source for German-speaking solutions roles. |
| Tier 1 | Synthesia — synthesia.io | Berlin; Munich; Europe remote | AI; solutions; customer success; product | https://jobs.ashbyhq.com/synthesia | Ashby | https://jobs.ashbyhq.com/synthesia | https://api.ashbyhq.com/posting-api/job-board/synthesia?includeCompensation=true | verified public | jobUrl | parse UUID from jobUrl path | publishedAt | ashby:synthesia:{jobUrl_path_uuid} | AI; Solutions; CSM; Product | High | Ashby board + Berlin/Munich/Germany-facing roles citeturn19search3turn19search6turn19search25 | Strong DACH signal and good role relevance. |
| Tier 1 | Sport Alliance — sportalliance.com | Remote Germany | customer ops; data; RevOps; legal/AI | https://jobs.eu.lever.co/sportalliance | Lever EU | https://jobs.eu.lever.co/sportalliance | https://api.eu.lever.co/v0/postings/sportalliance?mode=json | verified public | hostedUrl | id | verify live response; do not assume date | lever:sportalliance:{id} | RevOps; Data; Ops; AI-adjacent | High | Lever EU board with remote Germany roles citeturn22search13 | Good Lever EU example for Germany-remote hiring. |
| Tier 1 | Saviynt — saviynt.com | Munich; Stuttgart; Frankfurt; remote Germany | solutions; customer engineering; GTM | https://jobs.lever.co/saviynt | Lever | https://jobs.lever.co/saviynt | https://api.lever.co/v0/postings/saviynt?mode=json | verified public | hostedUrl | id | verify live response; do not assume date | lever:saviynt:{id} | Solutions Engineer; DACH; GTM | High | Lever board with DACH solutions-engineering roles citeturn22search4turn22search0 | Strong role fit for v1. |
| Tier 1 | sennder — sennder.com | Berlin; Germany | product; ops; analytics; logistics tech | https://www.sennder.com/open-positions | SmartRecruiters | https://careers.smartrecruiters.com/SennderGmbH | https://api.smartrecruiters.com/v1/companies/SennderGmbH/postings | verified public | applyUrl after detail fetch | id | releasedDate | smartrecruiters:SennderGmbH:{id} | Product; Ops; Analytics; Logistics AI | High | Official careers + SmartRecruiters board identifier citeturn21search2turn21search10 | Fetch list, then follow `ref` for detail/apply URL. |
| Tier 2 | N26 — n26.com | Berlin; Germany | product; platform; data; internal systems | https://n26.com/en-eu/careers | Greenhouse embedded/custom | https://job-boards.greenhouse.io/n26 | https://boards-api.greenhouse.io/v1/boards/n26/jobs?content=true | inferred public | absolute_url | id | updated_at | greenhouse:n26:{id} | Product; Platform; Data; Fintech | Medium | Official careers page surfaced via GH-hosted result citeturn6search2turn7view2 | Valuable employer, but I would verify the API via browser/network before enabling at scale. |
| Tier 2 | Delivery Hero — deliveryhero.com | Berlin; Germany | product; ops; data; engineering | https://careers.deliveryhero.com/ | Custom company page | https://careers.deliveryhero.com/deliveryhero-jobs | needs browser discovery | unknown | onsite job URL | Reference UUID on page | Expiry Date visible but often junk/default | canonical_url or deliveryhero:{reference_uuid} | Product; Ops; Growth; Data; Eng | Medium | Official careers + jobs page citeturn13search4turn13search0 | Good employer, but page-level data quality is mixed; do not trust `Expiry Date` blindly. |
| Tier 2 | SumUp — sumup.com | Berlin; Germany | product; data; engineering; IT | https://www.sumup.com/careers/ | Custom company page | https://www.sumup.com/careers/positions/ | needs browser discovery | unknown | onsite job URL | parse numeric URL suffix | none obvious | canonical_url or sumup:{url_numeric_id} | Product; Data; Eng; IT | Medium | Official careers and position listings citeturn21search8turn21search20turn21search16 | Valuable German fintech; needs network discovery for a reliable feed. |
| Tier 2 | Forto — forto.com | Berlin; Hamburg; Germany | data; SRE; analytics; product | https://careers.forto.com/ | Custom company page | https://careers.forto.com/forto-jobs/ | needs browser discovery | unknown | onsite job URL | parse UUID slug from URL | none obvious | canonical_url or forto:{url_uuid} | Data; SRE; Product; Analytics | Medium | Official careers + jobs index + live job pages citeturn21search1turn21search5turn21search9 | Good target company, but API/feed not evident from surface. |
| Tier 2 | Personio — personio.com | Munich; Berlin; Germany | product; internal tools; business systems; RevOps | https://www.personio.com/about-personio/careers/ | Custom / Personio | https://www.personio.com/about-personio/careers/ | Recruiting API requires auth; XML feed optional if enabled | no public API found | onsite job URL | unknown from public surface | public page dates not obvious | canonical_url or company+title+location | Product; Biz Systems; RevOps; Internal Tools | Medium | Official careers + Recruiting API docs + career-page docs citeturn13search7turn38view6turn38view7 | Important DACH employer, but not a clean no-auth v1 source. |

## Table 2: ATS provider patterns

| ATS provider | How to recognize | API pattern | Auth required? | Primary job URL field | Job ID field | Date fields | German/EU caveats | Reliability notes |
|---|---|---|---|---|---|---|---|---|
| Greenhouse | `job-boards.greenhouse.io/{board_token}` or `boards.greenhouse.io/{board_token}` | `https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true` | No for GET; Basic Auth only for application POST | `absolute_url` | `id` | `updated_at` | Some companies wrap GH in branded careers pages; still prefer direct board token where possible | Best v1 target: published jobs only, stable IDs, direct canonical URLs. citeturn23view0 |
| Greenhouse EU | `job-boards.eu.greenhouse.io/{board_token}` | Same API as Greenhouse: `https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true` | No for GET | `absolute_url` | `id` | `updated_at` | Hosted board domain changes, but the API pattern remains the Greenhouse boards API; verify token from EU board URL | Excellent for DACH employers that host on EU subdomain. citeturn23view0turn35search17turn35search19 |
| Ashby | `jobs.ashbyhq.com/{JOB_BOARD_NAME}` | `https://api.ashbyhq.com/posting-api/job-board/{JOB_BOARD_NAME}?includeCompensation=true` | No | `jobUrl` | Parse UUID from `jobUrl` path; no separate top-level ID was visible in the docs excerpt I verified | `publishedAt` | `isListed=false` means direct-link-only postings; decide whether to exclude them | Very strong v1 target, but key off URL UUID unless your live response exposes a dedicated ID. citeturn42view0turn42view1turn42view2 |
| Lever | `jobs.lever.co/{site}` | `https://api.lever.co/v0/postings/{site}?mode=json` | No for GET lists/details; POST apply requires API key | `hostedUrl` | `id` | Not guaranteed in the docs excerpt used here; verify live response before relying on dates | Good for DACH/EMEA remote jobs; public surface only includes published postings | Strong provider for clean IDs and URLs; do your own freshness tracking if date fields are absent. citeturn24view0turn43view1turn43view2turn43view3 |
| Lever EU | `jobs.eu.lever.co/{site}` | `https://api.eu.lever.co/v0/postings/{site}?mode=json` | No for GET lists/details | `hostedUrl` | `id` | Not guaranteed in the docs excerpt used here; verify live response before relying on dates | Common for Europe-based hiring pages; same model as global Lever | Good v1 source once the site slug is known. citeturn24view0turn43view1turn22search13 |
| Teamtailor | Branded Teamtailor job pages or company Teamtailor careers surfaces | No simple universal no-auth company discovery API; partner flows use webhooks, unique XML feeds, and API-keyed endpoints | Yes for API-keyed resources; feeds are partner-specific | Usually the job/ad URL exposed in XML/webhook payloads; `external-url` exists in job-board resources | Varies by integration | `created-at` appears in Teamtailor job-board changelog/resources | Partner-oriented, not ideal for anonymous broad discovery; per-board feed URLs are unique | Better as a backlog provider unless you have direct feed access or known feed URLs. citeturn40view2turn40view0 |
| Workday | `*.wd*.myworkdayjobs.com/.../recruiting/{tenant}/{site}` and similar public Workday careers URLs | No universal official no-auth jobs API pattern was documented in the sources I checked; public sites are tenant-specific and browser discovery is usually required | Varies; official Workday APIs are generally integration-oriented | Canonical Workday job page URL | Usually requisition/job slug from page URL or internal JSON after discovery | Usually shown on the page, but not standardised across tenants | Localisation, POST-based facets, and tenant-specific routes make this higher effort for v1 | Lowest-return ATS for v1 unless you have a specific high-value employer to reverse engineer. citeturn26search15turn27search19turn27search4 |
| SmartRecruiters | `careers.smartrecruiters.com/{companyIdentifier}` | `https://api.smartrecruiters.com/v1/companies/{companyIdentifier}/postings` and `/postings/{postingId}` | No for Job Board API | `applyUrl` on detail object; use `ref` from list to fetch detail | `id`, `uuid`, `jobId` | `releasedDate` | Company identifier comes directly from the careers URL; very good for EU employers using SR | Strong alternative to GH/Ashby/Lever when the company uses it. citeturn37view1turn37view2 |
| Personio | `*.jobs.personio.de` careers pages, or branded Personio career sites | Recruiting API exists but is auth-oriented; XML feed is optional and must be enabled per account | Yes for Recruiting API; XML availability varies by employer | Public career-page URL | Not reliably exposed on public pages | Usually not exposed on the public page | Good DACH presence, but poor as a blind no-auth registry source unless XML is enabled and discoverable | Treat as Tier 2 unless you can confirm XML or a known partner feed. citeturn38view6turn38view7turn28search4 |
| Recruitee | Branded Recruitee careers pages | Careers Site API exists; verify company-scoped endpoints from the live careers site before assuming no-auth access | Varies; ATS API is auth-oriented | Varies by careers endpoint | Varies by endpoint | Varies | Useful provider, but I would not put it in v1 without company-level verification | Needs company-level testing before broad rollout. citeturn38view2turn39view0 |
| Workable | Workable-hosted job pages, public job shortlinks, or account subdomains | Authenticated SPI API: `https://{subdomain}.workable.com/spi/v3/jobs`; public published-job endpoints also documented at `https://www.workable.com/api/accounts/<account_subdomain>?details=true` plus `/locations` and `/departments` | SPI API yes; public account endpoints no | `url` or `shortlink` | `id` / `shortcode` | `created_at` | Subdomain discovery is the main challenge; once known, Workable can be quite good | Potentially Tier 1 if you know the right account subdomain. citeturn39view1turn39view2 |
| BambooHR | BambooHR ATS/careers surfaces | `https://{companyDomain}.bamboohr.com/api/v1/applicant_tracking/jobs` | Yes; ATS/API key access required | Not cleanly documented as a public display-link source in the material checked | Job-opening IDs via ATS API | Not confirmed from public job-feed documentation checked | Fine for direct integrations with known employers, poor for anonymous public scanning | Not recommended for no-auth v1 discovery. citeturn41search3turn41search4 |
| Join.com | Public company pages at `join.com/companies/{company}` and public job pages under that path | JOIN API v2 exists, but requires API token | Yes | Public JOIN job page URL | Usually in API; public page slugs also carry stable identifiers | Public pages often show publish date | Strong Germany footprint, but richer access needs token | Good HTML fallback provider; not first choice for API-first v1. citeturn38view3turn29search0turn29search1 |
| Softgarden | `*.softgarden.io` or branded Softgarden boards | Career Websites API / Jobs API exist, but are OAuth2-based | Yes | Public Softgarden vacancy URL | Internal API objects after auth | Dates are visible on boards | Strong Germany/DACH footprint; useful once you do HTML crawling or obtain API access | Good backlog provider, especially for German employers outside startup ATSs. citeturn38view5turn38view4turn30search1 |
| Custom company pages | Branded careers pages with no obvious ATS-hosted board | No standard pattern; use browser discovery, structured data, sitemaps, and canonical URLs | Varies | Canonical page URL | URL slug / page ID / structured-data identifier | Varies widely | Highest stale and duplication risk; often still worth it for Germany unicorns and public companies | Keep these Tier 2 or Tier 3 until you reverse engineer each site. citeturn13search0turn21search20turn21search5 |

## Table 3: German-market seed list

| Company | Category | Germany/DACH reason | Careers page | Detected ATS/provider | API readiness | Priority | Why include/exclude |
|---|---|---|---|---|---|---|---|
| Aleph Alpha | German AI / foundation models | German AI company | https://jobs.ashbyhq.com/AlephAlpha | Ashby | High | P0 | Include: clean Ashby board and strong AI-role fit. citeturn32search0turn32search2 |
| DeepL | German AI / language tech | Germany-based language AI leader | https://jobs.ashbyhq.com/DeepL | Ashby | High | P0 | Include: clean public Ashby board and strong DACH relevance. citeturn1view0 |
| Black Forest Labs | German AI / generative media | Germany AI company | https://job-boards.greenhouse.io/blackforestlabs | Greenhouse | High | P0 | Include: Greenhouse is ideal for reliable active-job scanning. citeturn1view1turn0search9 |
| Helsing | German AI / defence tech | Berlin and Munich roles visible | https://job-boards.greenhouse.io/helsing | Greenhouse | High | P0 | Include: excellent AI and deployed-engineering fit. citeturn33search2turn33search4 |
| Parloa | German AI / conversational AI | Berlin-based role signal | https://job-boards.greenhouse.io/parloa | Greenhouse | High | P0 | Include: one of the best role-fit companies in the set. citeturn9search8turn9search10 |
| Celonis | German B2B SaaS / process intelligence | Munich and Aachen jobs visible | https://careers.celonis.com/join-us/open-positions | Greenhouse | High | P0 | Include: strong German enterprise-tech source with high-value product and AI-adjacent roles. citeturn34search6turn34search5 |
| Taxfix | German fintech | Berlin careers surface | https://jobs.ashbyhq.com/taxfix.com | Ashby | High | P0 | Include: clean Ashby and high DACH relevance. citeturn11search2turn11search14 |
| n8n | German automation / workflow | Berlin and Europe remote | https://n8n.io/careers/ | Ashby | High | P0 | Include: near-perfect target-role fit for automation/internal-tools searches. citeturn11search0turn19search2 |
| Lakera | AI security | Germany-facing solutions roles | https://jobs.ashbyhq.com/lakera.ai | Ashby | High | P1 | Include: strong AI security + DACH sales/solutions signal. citeturn9search11turn9search19 |
| Trade Republic | German fintech | Berlin jobs via Greenhouse | https://job-boards.greenhouse.io/traderepublic | Greenhouse | High | P1 | Include: clean API path, even if current volume fluctuates. citeturn7view1turn6search15 |
| Raisin | German fintech | Berlin/Frankfurt/Hamburg/Munich roles | https://job-boards.greenhouse.io/raisin | Greenhouse | High | P1 | Include: good Germany coverage and stable GH IDs. citeturn20search10turn20search2 |
| GetYourGuide | German/DACH consumer tech | Berlin careers signal | https://www.getyourguide.careers/open-roles | Greenhouse | High | P1 | Include: broad product/data/engineering hiring surface in Berlin. citeturn11search3turn11search7 |
| IDnow | German ID / fintech infra | Munich AI and transformation roles | https://job-boards.eu.greenhouse.io/idnow | Greenhouse EU | High | P1 | Include: strong Germany relevance and good Greenhouse EU fit. citeturn35search2turn35search17 |
| Vercel | International devtools hiring in Germany | Remote Germany role visible | https://vercel.com/careers | Greenhouse | High | P1 | Include: direct remote-Germany hiring signal and strong customer/platform role fit. citeturn16search7turn16search3 |
| Supabase | International devtools / database | Europe remote roles | https://jobs.ashbyhq.com/supabase | Ashby | High | P1 | Include: strong support/solutions/customer architecture pipeline for remote Europe. citeturn17search1turn17search9 |
| Cohere | International AI | Europe / UK/EU/ME remote roles | https://jobs.ashbyhq.com/cohere | Ashby | High | P1 | Include: strong AI and forward-deployed role fit; remote Europe signal. citeturn14search3turn14search23 |
| ElevenLabs | International AI / voice | Germany and Europe remote roles | https://jobs.ashbyhq.com/elevenlabs | Ashby | High | P1 | Include: high-value solutions/FDE/GTM role mix for Germany. citeturn18search0turn18search13 |
| Synthesia | International AI / video | Berlin/Munich/Europe roles | https://jobs.ashbyhq.com/synthesia | Ashby | High | P1 | Include: strong DACH-facing commercial and product roles. citeturn19search3turn19search6turn19search25 |
| Sport Alliance | German/EU SaaS | Remote Germany roles visible | https://jobs.eu.lever.co/sportalliance | Lever EU | High | P1 | Include: clean Lever EU source and Germany-remote signal. citeturn22search13 |
| Saviynt | International enterprise software | Munich/Stuttgart/Frankfurt/remote Germany | https://jobs.lever.co/saviynt | Lever | High | P1 | Include: high-quality DACH solutions-engineering signal. citeturn22search4turn22search0 |
| sennder | German logistics tech | Berlin official careers, SmartRecruiters board | https://www.sennder.com/open-positions | SmartRecruiters | High | P1 | Include: strong German company plus documented public board API. citeturn21search2turn21search10 |
| N26 | German fintech | Berlin careers surface | https://n26.com/en-eu/careers | Greenhouse embedded/custom | Medium | P2 | Include, but only after browser verification of the inferred GH feed. citeturn6search2turn7view2 |
| Delivery Hero | German public tech company | Berlin HQ and job volume | https://careers.deliveryhero.com/deliveryhero-jobs | Custom | Low | P2 | Include as backlog: valuable employer, but public page data is messy and likely needs reverse engineering. citeturn13search0turn13search4 |
| SumUp | German fintech | Berlin hiring surface | https://www.sumup.com/careers/positions/ | Custom | Low | P2 | Include as backlog: good employer, but not yet an API-first source. citeturn21search20turn21search16 |
| Forto | German logistics tech | Berlin/Hamburg roles | https://careers.forto.com/forto-jobs/ | Custom | Low | P2 | Include as backlog: valuable and relevant, but feed/API not obvious. citeturn21search5turn21search9 |
| Personio | German HR software | Munich/Berlin relevance | https://www.personio.com/about-personio/careers/ | Custom / Personio | Low | P2 | Include as backlog: major DACH employer, but richer API paths are auth/XML-dependent. citeturn13search7turn38view6turn38view7 |
| Babbel | German edtech | Berlin careers surface | https://jobs.babbel.com/en | Custom | Low | P3 | Include only after browser discovery; good Berlin relevance but unclear feed. citeturn13search1turn13search9 |
| Scout24 | German digital marketplace | Germany relevance; custom careers | https://www.scout24.com/en/career/jobs | Custom | Low | P3 | Include as backlog, not v1. Official jobs page exists but ATS/API was not clear from the surface I checked. citeturn21search3turn21search7 |
| OpenAI | International AI | EMEA hiring exists; not Germany-first | https://openai.com/careers/search/ | Custom | Low | P3 | Include in seed universe, but not as v1 API-first source. Careers page is active, yet the ATS/feed pattern is not exposed cleanly in the sources checked. citeturn16search0turn16search8 |
| Anthropic | International AI | Europe expansion and London/Dublin hiring | https://www.anthropic.com/careers/jobs | Custom | Low | P3 | Include in seed universe, but not as a direct ATS/API v1 priority. citeturn16search1turn16search9turn16news42 |
| Mistral AI | International AI | Europe hiring, but weaker Germany specificity | https://mistral.ai/careers | Lever | Medium | P3 | Include if you later widen to France/EU-heavy hiring; not a first Germany-only target. citeturn16search2turn16search6 |

## YAML output

The YAML below is a first-draft scanner config derived from the cited registry above.

```yaml
market: germany
generated_at: 2026-04-19
freshness:
  max_age_days: 60

title_filter:
  positive:
    - AI
    - ML
    - LLM
    - GenAI
    - Agent
    - Agentic
    - Automation
    - Product Manager
    - Technical Product Manager
    - Solutions Architect
    - Solutions Engineer
    - Forward Deployed
    - Customer Engineer
    - GTM Engineer
    - RevOps
    - Business Systems
    - Internal Tools
  negative:
    - Intern
    - Working Student
    - Werkstudent
    - Praktikum
    - Junior
    - SAP ABAP
    - Mainframe
    - Embedded
    - iOS
    - Android
    - PHP

location_filter:
  include:
    - Germany
    - Deutschland
    - Berlin
    - Munich
    - München
    - Hamburg
    - Cologne
    - Köln
    - Frankfurt
    - Stuttgart
    - Remote
    - Remote Germany
    - Remote EU
    - EMEA
    - Europe
  exclude:
    - United States only
    - US only

tracked_companies:
  - name: Aleph Alpha
    market: Germany
    careers_url: https://jobs.ashbyhq.com/AlephAlpha
    ats_provider: ashby
    ats_region: global
    ats_slug: AlephAlpha
    api_url: https://api.ashbyhq.com/posting-api/job-board/AlephAlpha?includeCompensation=true
    job_url_field: jobUrl
    job_id_field: jobUrl_path_uuid
    date_fields:
      - publishedAt
    dedup_key: ashby:AlephAlpha:{jobUrl_path_uuid}
    enabled: true
    confidence: high
    notes: Verified public Ashby board on 2026-04-19. Parse UUID from jobUrl path.

  - name: DeepL
    market: Germany
    careers_url: https://jobs.ashbyhq.com/DeepL
    ats_provider: ashby
    ats_region: global
    ats_slug: DeepL
    api_url: https://api.ashbyhq.com/posting-api/job-board/DeepL?includeCompensation=true
    job_url_field: jobUrl
    job_id_field: jobUrl_path_uuid
    date_fields:
      - publishedAt
    dedup_key: ashby:DeepL:{jobUrl_path_uuid}
    enabled: true
    confidence: high
    notes: Verified public Ashby board on 2026-04-19.

  - name: Black Forest Labs
    market: Germany
    careers_url: https://job-boards.greenhouse.io/blackforestlabs
    ats_provider: greenhouse
    ats_region: global
    ats_slug: blackforestlabs
    api_url: https://boards-api.greenhouse.io/v1/boards/blackforestlabs/jobs?content=true
    job_url_field: absolute_url
    job_id_field: id
    date_fields:
      - updated_at
    dedup_key: greenhouse:blackforestlabs:{id}
    enabled: true
    confidence: high
    notes: Verified public Greenhouse board on 2026-04-19.

  - name: Helsing
    market: Germany
    careers_url: https://job-boards.greenhouse.io/helsing
    ats_provider: greenhouse
    ats_region: global
    ats_slug: helsing
    api_url: https://boards-api.greenhouse.io/v1/boards/helsing/jobs?content=true
    job_url_field: absolute_url
    job_id_field: id
    date_fields:
      - updated_at
    dedup_key: greenhouse:helsing:{id}
    enabled: true
    confidence: high
    notes: Verified public Greenhouse board on 2026-04-19.

  - name: Parloa
    market: Germany
    careers_url: https://job-boards.greenhouse.io/parloa
    ats_provider: greenhouse
    ats_region: global
    ats_slug: parloa
    api_url: https://boards-api.greenhouse.io/v1/boards/parloa/jobs?content=true
    job_url_field: absolute_url
    job_id_field: id
    date_fields:
      - updated_at
    dedup_key: greenhouse:parloa:{id}
    enabled: true
    confidence: high
    notes: High-value source for AI, solutions, and forward-deployed roles.

  - name: Taxfix
    market: Germany
    careers_url: https://jobs.ashbyhq.com/taxfix.com
    ats_provider: ashby
    ats_region: global
    ats_slug: taxfix.com
    api_url: https://api.ashbyhq.com/posting-api/job-board/taxfix.com?includeCompensation=true
    job_url_field: jobUrl
    job_id_field: jobUrl_path_uuid
    date_fields:
      - publishedAt
    dedup_key: ashby:taxfix.com:{jobUrl_path_uuid}
    enabled: true
    confidence: high
    notes: German fintech source with clean Ashby structure.

  - name: n8n
    market: Germany
    careers_url: https://jobs.ashbyhq.com/n8n
    ats_provider: ashby
    ats_region: global
    ats_slug: n8n
    api_url: https://api.ashbyhq.com/posting-api/job-board/n8n?includeCompensation=true
    job_url_field: jobUrl
    job_id_field: jobUrl_path_uuid
    date_fields:
      - publishedAt
    dedup_key: ashby:n8n:{jobUrl_path_uuid}
    enabled: true
    confidence: high
    notes: Strong fit for automation, internal tools, and solutions roles.

  - name: Lakera
    market: Germany
    careers_url: https://jobs.ashbyhq.com/lakera.ai
    ats_provider: ashby
    ats_region: global
    ats_slug: lakera.ai
    api_url: https://api.ashbyhq.com/posting-api/job-board/lakera.ai?includeCompensation=true
    job_url_field: jobUrl
    job_id_field: jobUrl_path_uuid
    date_fields:
      - publishedAt
    dedup_key: ashby:lakera.ai:{jobUrl_path_uuid}
    enabled: true
    confidence: high
    notes: Use country/location filters because geographies vary across roles.

  - name: Celonis
    market: Germany
    careers_url: https://careers.celonis.com/join-us/open-positions
    ats_provider: greenhouse
    ats_region: global
    ats_slug: celonis
    api_url: https://boards-api.greenhouse.io/v1/boards/celonis/jobs?content=true
    job_url_field: absolute_url
    job_id_field: id
    date_fields:
      - updated_at
    dedup_key: greenhouse:celonis:{id}
    enabled: true
    confidence: high
    notes: Strong enterprise-tech source for Munich/Aachen and applied-AI-adjacent roles.

  - name: Trade Republic
    market: Germany
    careers_url: https://job-boards.greenhouse.io/traderepublic
    ats_provider: greenhouse
    ats_region: global
    ats_slug: traderepublic
    api_url: https://boards-api.greenhouse.io/v1/boards/traderepublic/jobs?content=true
    job_url_field: absolute_url
    job_id_field: id
    date_fields:
      - updated_at
    dedup_key: greenhouse:traderepublic:{id}
    enabled: true
    confidence: medium
    notes: Board appeared live but compact; monitor current volume.

  - name: Raisin
    market: Germany
    careers_url: https://job-boards.greenhouse.io/raisin
    ats_provider: greenhouse
    ats_region: global
    ats_slug: raisin
    api_url: https://boards-api.greenhouse.io/v1/boards/raisin/jobs?content=true
    job_url_field: absolute_url
    job_id_field: id
    date_fields:
      - updated_at
    dedup_key: greenhouse:raisin:{id}
    enabled: true
    confidence: high
    notes: Good German location coverage.

  - name: GetYourGuide
    market: Germany
    careers_url: https://www.getyourguide.careers/open-roles
    ats_provider: greenhouse
    ats_region: global
    ats_slug: getyourguide
    api_url: https://boards-api.greenhouse.io/v1/boards/getyourguide/jobs?content=true
    job_url_field: absolute_url
    job_id_field: id
    date_fields:
      - updated_at
    dedup_key: greenhouse:getyourguide:{id}
    enabled: true
    confidence: high
    notes: Strong Berlin travel-tech source.

  - name: IDnow
    market: Germany
    careers_url: https://job-boards.eu.greenhouse.io/idnow
    ats_provider: greenhouse
    ats_region: eu
    ats_slug: idnow
    api_url: https://boards-api.greenhouse.io/v1/boards/idnow/jobs?content=true
    job_url_field: absolute_url
    job_id_field: id
    date_fields:
      - updated_at
    dedup_key: greenhouse:idnow:{id}
    enabled: true
    confidence: high
    notes: Greenhouse EU hosted board; same API pattern as global Greenhouse.

  - name: Vercel
    market: Germany
    careers_url: https://vercel.com/careers
    ats_provider: greenhouse
    ats_region: global
    ats_slug: vercel
    api_url: https://boards-api.greenhouse.io/v1/boards/vercel/jobs?content=true
    job_url_field: absolute_url
    job_id_field: id
    date_fields:
      - updated_at
    dedup_key: greenhouse:vercel:{id}
    enabled: true
    confidence: high
    notes: Good remote-Germany signal for support and customer engineering.

  - name: Supabase
    market: Germany
    careers_url: https://jobs.ashbyhq.com/supabase
    ats_provider: ashby
    ats_region: global
    ats_slug: supabase
    api_url: https://api.ashbyhq.com/posting-api/job-board/supabase?includeCompensation=true
    job_url_field: jobUrl
    job_id_field: jobUrl_path_uuid
    date_fields:
      - publishedAt
    dedup_key: ashby:supabase:{jobUrl_path_uuid}
    enabled: true
    confidence: high
    notes: Excellent remote-Europe source.

  - name: Cohere
    market: Germany
    careers_url: https://jobs.ashbyhq.com/cohere
    ats_provider: ashby
    ats_region: global
    ats_slug: cohere
    api_url: https://api.ashbyhq.com/posting-api/job-board/cohere?includeCompensation=true
    job_url_field: jobUrl
    job_id_field: jobUrl_path_uuid
    date_fields:
      - publishedAt
    dedup_key: ashby:cohere:{jobUrl_path_uuid}
    enabled: true
    confidence: high
    notes: Strong AI and forward-deployed role fit across Europe/EMEA.

  - name: ElevenLabs
    market: Germany
    careers_url: https://jobs.ashbyhq.com/elevenlabs
    ats_provider: ashby
    ats_region: global
    ats_slug: elevenlabs
    api_url: https://api.ashbyhq.com/posting-api/job-board/elevenlabs?includeCompensation=true
    job_url_field: jobUrl
    job_id_field: jobUrl_path_uuid
    date_fields:
      - publishedAt
    dedup_key: ashby:elevenlabs:{jobUrl_path_uuid}
    enabled: true
    confidence: high
    notes: Strong Germany and Europe remote commercial/solutions signal.

  - name: Synthesia
    market: Germany
    careers_url: https://jobs.ashbyhq.com/synthesia
    ats_provider: ashby
    ats_region: global
    ats_slug: synthesia
    api_url: https://api.ashbyhq.com/posting-api/job-board/synthesia?includeCompensation=true
    job_url_field: jobUrl
    job_id_field: jobUrl_path_uuid
    date_fields:
      - publishedAt
    dedup_key: ashby:synthesia:{jobUrl_path_uuid}
    enabled: true
    confidence: high
    notes: DACH-facing roles and Berlin/Munich presence make this a strong scanner target.

  - name: Sport Alliance
    market: Germany
    careers_url: https://jobs.eu.lever.co/sportalliance
    ats_provider: lever
    ats_region: eu
    ats_slug: sportalliance
    api_url: https://api.eu.lever.co/v0/postings/sportalliance?mode=json
    job_url_field: hostedUrl
    job_id_field: id
    date_fields: []
    dedup_key: lever:sportalliance:{id}
    enabled: true
    confidence: high
    notes: Good Lever EU source for remote Germany roles. Do not depend on dates unless present in live response.

  - name: sennder
    market: Germany
    careers_url: https://www.sennder.com/open-positions
    ats_provider: smartrecruiters
    ats_region: global
    ats_slug: SennderGmbH
    api_url: https://api.smartrecruiters.com/v1/companies/SennderGmbH/postings
    job_url_field: applyUrl
    job_id_field: id
    date_fields:
      - releasedDate
    dedup_key: smartrecruiters:SennderGmbH:{id}
    enabled: true
    confidence: high
    notes: Fetch list, then follow ref to detail for applyUrl and full payload.

discovery_backlog:
  - name: N26
    careers_url: https://n26.com/en-eu/careers
    detected_provider: greenhouse_embedded
    reason: Valuable German fintech employer; Greenhouse appears likely, but verify API and slug via browser/network before enabling.
    priority: high

  - name: Delivery Hero
    careers_url: https://careers.deliveryhero.com/deliveryhero-jobs
    detected_provider: custom
    reason: Important Berlin employer, but public surface looks custom and page metadata quality is inconsistent.
    priority: high

  - name: SumUp
    careers_url: https://www.sumup.com/careers/positions/
    detected_provider: custom
    reason: High-value German fintech source; needs browser discovery for a reliable structured feed.
    priority: high

  - name: Forto
    careers_url: https://careers.forto.com/forto-jobs/
    detected_provider: custom
    reason: Relevant Berlin/Hamburg logistics-tech employer; no direct public feed confirmed.
    priority: high

  - name: Personio
    careers_url: https://www.personio.com/about-personio/careers/
    detected_provider: personio_custom
    reason: Major DACH employer, but no clean no-auth public API was confirmed from the public careers surface; XML feed is optional.
    priority: high

  - name: Babbel
    careers_url: https://jobs.babbel.com/en
    detected_provider: custom
    reason: Relevant Berlin employer; ATS/feed unclear from surface.
    priority: medium

  - name: OpenAI
    careers_url: https://openai.com/careers/search/
    detected_provider: custom
    reason: Relevant for remote EMEA hiring, but not a v1 API-first source.
    priority: medium

  - name: Anthropic
    careers_url: https://www.anthropic.com/careers/jobs
    detected_provider: custom
    reason: Relevant for Europe expansion, but not a clean ATS-source-first company for v1.
    priority: medium

  - name: Mistral AI
    careers_url: https://mistral.ai/careers
    detected_provider: lever
    reason: Europe hiring exists, but Germany specificity is weaker than the Tier 1 set.
    priority: medium
```