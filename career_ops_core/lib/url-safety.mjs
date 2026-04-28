import { isIP } from "node:net";

function parseUrl(rawUrl = "") {
  try {
    return new URL(String(rawUrl || "").trim());
  } catch {
    return null;
  }
}

function isPrivateIpv4(hostname) {
  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a === 169 && b === 254 ||
    a === 172 && b >= 16 && b <= 31 ||
    a === 192 && b === 168
  );
}

function isPrivateIpv6(hostname) {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
}

export function isHttpUrl(rawUrl = "") {
  const parsed = parseUrl(rawUrl);
  return parsed !== null && ["http:", "https:"].includes(parsed.protocol);
}

export function isPrivateOrLocalHostname(hostname = "") {
  const normalized = String(hostname || "").trim().toLowerCase().replace(/\.$/, "");
  if (!normalized) return true;
  if (normalized === "localhost" || normalized.endsWith(".localhost")) return true;

  const ipKind = isIP(normalized.replace(/^\[|\]$/g, ""));
  if (ipKind === 4) return isPrivateIpv4(normalized);
  if (ipKind === 6) return isPrivateIpv6(normalized);

  return false;
}

export function isSafePublicHttpUrl(rawUrl = "", { allowLocal = false } = {}) {
  const parsed = parseUrl(rawUrl);
  if (!parsed || !["http:", "https:"].includes(parsed.protocol)) return false;
  if (!allowLocal && isPrivateOrLocalHostname(parsed.hostname)) return false;
  return true;
}
