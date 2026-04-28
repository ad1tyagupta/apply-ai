import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { isSafePublicHttpUrl } from "./url-safety.mjs";

const RESULT_START = "APPLYAI_BROWSER_RESULTS_START";
const RESULT_END = "APPLYAI_BROWSER_RESULTS_END";
const SECRET_KEY_RE = /(cookie|session|token|secret|password|credential|authorization)/i;

export const DEFAULT_BROWSER_DISCOVERY = {
  enabled: true,
  max_queries: 2,
  max_backlog_companies: 5,
};

export function browserDiscoveryConfig(config = {}) {
  return {
    ...DEFAULT_BROWSER_DISCOVERY,
    ...(config.browser_discovery || {}),
  };
}

export function buildBrowserDiscoveryTargets(config = {}) {
  const browserConfig = browserDiscoveryConfig(config);
  if (browserConfig.enabled === false) {
    return { browserConfig, queries: [], backlog: [] };
  }

  const queries = (config.search_queries || [])
    .filter((query) => query.enabled !== false)
    .slice(0, Number(browserConfig.max_queries || DEFAULT_BROWSER_DISCOVERY.max_queries));
  const backlog = (config.discovery_backlog || [])
    .filter((company) => company.enabled !== false)
    .filter((company) => !company.careers_url || isSafePublicHttpUrl(company.careers_url, { allowLocal: allowLocalUrls() }))
    .slice(0, Number(browserConfig.max_backlog_companies || DEFAULT_BROWSER_DISCOVERY.max_backlog_companies));

  return { browserConfig, queries, backlog };
}

export function allowLocalUrls(env = process.env) {
  return env.APPLYAI_ALLOW_LOCAL_URLS === "1";
}

export function isBrowserHarnessAllowed(env = process.env) {
  return env.BROWSER_USE_API_KEY || env.APPLYAI_ALLOW_REAL_CHROME === "1";
}

export function browserHarnessBin(env = process.env) {
  return env.APPLYAI_BROWSER_HARNESS_BIN || "browser-harness";
}

export function extractHarnessJson(stdout = "") {
  const text = String(stdout || "");
  const start = text.indexOf(RESULT_START);
  const end = text.indexOf(RESULT_END);

  if (start !== -1 && end !== -1 && end > start) {
    const jsonText = text.slice(start + RESULT_START.length, end).trim();
    return JSON.parse(jsonText);
  }

  return JSON.parse(text.trim());
}

function assertNoSecretKeys(value, path = "$") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSecretKeys(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const [key, nested] of Object.entries(value)) {
    if (SECRET_KEY_RE.test(key)) {
      throw new Error(`unsafe browser-harness output: secret-like field at ${path}.${key}`);
    }
    assertNoSecretKeys(nested, `${path}.${key}`);
  }
}

function inferCompanyFromUrl(rawUrl = "") {
  try {
    const host = new URL(rawUrl).hostname.replace(/^www\./, "");
    return host.split(".").slice(0, -1).join(".") || host;
  } catch {
    return "";
  }
}

export function normalizeBrowserHarnessJobs(payload, { allowLocal = allowLocalUrls() } = {}) {
  assertNoSecretKeys(payload);

  const rawJobs = Array.isArray(payload) ? payload : payload?.jobs;
  if (!Array.isArray(rawJobs)) {
    throw new Error("browser-harness output must be an array or an object with a jobs array");
  }

  return rawJobs
    .map((job) => {
      const url = String(job.url || job.href || job.link || "").trim();
      if (!isSafePublicHttpUrl(url, { allowLocal })) return null;

      const title = String(job.title || job.text || job.name || "").replace(/\s+/g, " ").trim();
      if (!title) return null;

      return {
        title,
        company: String(job.company || inferCompanyFromUrl(url)).replace(/\s+/g, " ").trim(),
        location: String(job.location || job.snippet || job.text || "").replace(/\s+/g, " ").trim(),
        url,
        postedAt: job.postedAt || job.posted_at || job.date || "",
      };
    })
    .filter(Boolean);
}

function browserExtractionScript({ queries, backlog, useRemote }) {
  const queriesJson = JSON.stringify(queries.map((query) => ({
    name: query.name || "query",
    query: query.query || "",
  })));
  const backlogJson = JSON.stringify(backlog.map((company) => ({
    name: company.name || "",
    careers_url: company.careers_url || "",
    query: company.query || "",
  })));

  return `
import json
from urllib.parse import quote_plus

queries = ${queriesJson}
backlog = ${backlogJson}
jobs = []

${useRemote ? 'start_remote_daemon("applyai-discovery", proxyCountryCode="de", timeout=30)' : ""}

def emit_job(title, company, location, href):
    if not href or not href.startswith(("http://", "https://")):
        return
    lowered = href.lower()
    if any(blocked in lowered for blocked in ["login", "signin", "sign-in", "captcha"]):
        return
    jobs.append({
        "title": (title or "").strip()[:220],
        "company": (company or "").strip()[:120],
        "location": (location or "").strip()[:220],
        "url": href.strip(),
    })

def read_links(company, context):
    try:
        links = js("""
Array.from(document.querySelectorAll('a[href]')).slice(0, 120).map((a) => {
  const text = [a.innerText, a.getAttribute('aria-label'), a.getAttribute('title')]
    .filter(Boolean).join(' ').replace(/\\s+/g, ' ').trim();
  return { text, href: a.href };
})
""")
        for link in links:
            text = link.get("text") or ""
            href = link.get("href") or ""
            if not text:
                continue
            emit_job(text.split("\\n")[0], company, context + " " + text, href)
    except Exception:
        return

for item in queries:
    query = item.get("query") or ""
    if not query:
        continue
    new_tab("https://duckduckgo.com/html/?q=" + quote_plus(query))
    wait_for_load()
    read_links("", query)

for company in backlog:
    url = company.get("careers_url") or ""
    if not url:
        query = company.get("query") or company.get("name") or ""
        if query:
            new_tab("https://duckduckgo.com/html/?q=" + quote_plus(query))
    else:
        new_tab(url)
    wait_for_load()
    read_links(company.get("name") or "", company.get("query") or company.get("name") or "")

print("${RESULT_START}")
print(json.dumps({"jobs": jobs[:80]}))
print("${RESULT_END}")
`;
}

export function runBrowserHarness({ queries, backlog, env = process.env } = {}) {
  const bin = browserHarnessBin(env);
  const useRemote = Boolean(env.BROWSER_USE_API_KEY && env.APPLYAI_ALLOW_REAL_CHROME !== "1");
  const script = browserExtractionScript({ queries, backlog, useRemote });

  if (env.APPLYAI_BROWSER_HARNESS_BIN && !existsSync(env.APPLYAI_BROWSER_HARNESS_BIN)) {
    return {
      skipped: true,
      reason: `Browser Harness binary not found at ${env.APPLYAI_BROWSER_HARNESS_BIN}`,
    };
  }

  const result = spawnSync(bin, ["-c", script], {
    encoding: "utf8",
    env: {
      ...env,
      BU_NAME: env.BU_NAME || "applyai-discovery",
    },
    timeout: 120_000,
    maxBuffer: 10 * 1024 * 1024,
  });

  if (result.error?.code === "ENOENT") {
    return {
      skipped: true,
      reason: "Browser Harness is not installed. Install browser-use/browser-harness or set APPLYAI_BROWSER_HARNESS_BIN.",
    };
  }
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `browser-harness exited with status ${result.status}`);
  }

  return { stdout: result.stdout, stderr: result.stderr };
}
