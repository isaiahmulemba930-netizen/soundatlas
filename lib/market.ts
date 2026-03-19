import "server-only";

type HeaderGetter = {
  get(name: string): string | null;
};

const SUPPORTED_MARKETS = new Set([
  "us",
  "gb",
  "ca",
  "au",
  "de",
  "fr",
  "es",
  "it",
  "jp",
  "kr",
  "mx",
  "br",
  "ng",
  "za",
  "se",
  "nl",
  "ie",
  "ch",
  "at",
  "be",
  "no",
  "dk",
  "fi",
  "in",
  "sg",
  "nz",
]);

export type MarketContext = {
  country: string;
  countryName: string;
  detectionSource: "vercel-ip-country" | "cloudflare-country" | "accept-language" | "fallback";
  fallbackCountry: string;
};

function normalizeCountry(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.trim().toLowerCase();
}

export function getCountryName(country: string) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(country.toUpperCase()) ?? country.toUpperCase();
  } catch {
    return country.toUpperCase();
  }
}

function parseAcceptLanguageCountry(value: string | null) {
  if (!value) {
    return "";
  }

  const match = value.match(/\b[a-z]{2}-([A-Z]{2})\b/);
  return normalizeCountry(match?.[1] ?? "");
}

function pickSupportedCountry(country: string | null | undefined) {
  const normalized = normalizeCountry(country);
  if (SUPPORTED_MARKETS.has(normalized)) {
    return normalized;
  }

  return "";
}

export function detectMarketFromHeaders(headers: HeaderGetter): MarketContext {
  const vercelCountry = pickSupportedCountry(headers.get("x-vercel-ip-country"));
  if (vercelCountry) {
    return {
      country: vercelCountry,
      countryName: getCountryName(vercelCountry),
      detectionSource: "vercel-ip-country",
      fallbackCountry: "us",
    };
  }

  const cloudflareCountry = pickSupportedCountry(headers.get("cf-ipcountry"));
  if (cloudflareCountry) {
    return {
      country: cloudflareCountry,
      countryName: getCountryName(cloudflareCountry),
      detectionSource: "cloudflare-country",
      fallbackCountry: "us",
    };
  }

  const languageCountry = pickSupportedCountry(parseAcceptLanguageCountry(headers.get("accept-language")));
  if (languageCountry) {
    return {
      country: languageCountry,
      countryName: getCountryName(languageCountry),
      detectionSource: "accept-language",
      fallbackCountry: "us",
    };
  }

  return {
    country: "us",
    countryName: getCountryName("us"),
    detectionSource: "fallback",
    fallbackCountry: "us",
  };
}
