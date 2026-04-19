import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";

function loadYamlFile(path) {
  return yaml.load(readFileSync(path, "utf8")) || {};
}

function loadMarketPart(projectRoot, marketName, filename, fallbackName = "default") {
  const activePath = join(projectRoot, "market", marketName, filename);
  if (existsSync(activePath)) return loadYamlFile(activePath);

  const fallbackPath = join(projectRoot, "market", fallbackName, filename);
  if (existsSync(fallbackPath)) return loadYamlFile(fallbackPath);

  return {};
}

export function resolveMarketName(preferences = {}) {
  return preferences.market?.active || "default";
}

export function loadMarketData(projectRoot, preferences = {}) {
  const name = resolveMarketName(preferences);
  const companies = loadMarketPart(projectRoot, name, "companies.yml").companies || [];
  const backlogCompanies = loadMarketPart(projectRoot, name, "companies.yml").backlog_companies || [];
  const queries = loadMarketPart(projectRoot, name, "queries.yml").queries || [];
  const roleFamilies = loadMarketPart(projectRoot, name, "role-families.yml").role_families || [];
  const filters = loadMarketPart(projectRoot, name, "filters.yml");

  return {
    name,
    companies,
    backlogCompanies,
    queries,
    roleFamilies,
    filters,
  };
}
