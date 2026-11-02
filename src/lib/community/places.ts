import { readPublicJson, type PublicRequest } from "./public-json";

export type CommunityPlace = {
  id: string;
  name: string;
  country: string;
  countryCode: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  population: number | null;
  source: "geonames" | "manual" | "purulia-pilot";
};

export type CommunityLink = { title: string; url: string; description: string };
export type CommunityAdapter = {
  id: string;
  label: string;
  supports: (place: CommunityPlace) => boolean;
  links: readonly CommunityLink[];
};

export const PURULIA_PILOT: CommunityPlace = {
  id: "purulia-pilot",
  name: "Purulia",
  country: "India",
  countryCode: "IN",
  region: "West Bengal",
  latitude: 23.332,
  longitude: 86.3654,
  population: null,
  source: "purulia-pilot",
};

// Jurisdiction coverage is explicit. A similarly named place must never inherit a local service.
export const COMMUNITY_ADAPTERS: readonly CommunityAdapter[] = [
  {
    id: "purulia",
    label: "Parishkar / Purulia pilot",
    supports: (p) =>
      p.source === "purulia-pilot" ||
      (p.countryCode === "IN" &&
        /^(purulia|puruliya)$/i.test(p.name) &&
        p.region === "West Bengal"),
    links: [],
  },
  {
    id: "nyc",
    label: "New York City official services",
    supports: (p) =>
      p.source === "geonames" && p.id === "geonames:5128581" && p.countryCode === "US",
    links: [
      {
        title: "NYC311",
        url: "https://portal.311.nyc.gov/",
        description: "Official city service directory and service-request tracking.",
      },
      {
        title: "NYC311 report problems",
        url: "https://portal.311.nyc.gov/report-problems/",
        description: "Choose the relevant non-emergency reporting service on the city's website.",
      },
    ],
  },
  {
    id: "slovakia",
    label: "Slovakia national municipal-service directory",
    supports: (p) => p.countryCode === "SK" && p.source === "geonames",
    links: [
      {
        title: "Slovensko.sk municipal services",
        url: "https://navody.slovensko.sk/sk/services",
        description:
          "Official directory: select your Slovak town or village to find its available electronic forms. Directory coverage can vary.",
      },
    ],
  },
];

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function label(value: unknown): string | null {
  return typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= 120 &&
    [...value].every((character) => character.charCodeAt(0) >= 32)
    ? value.trim()
    : null;
}
function coordinate(value: unknown, max: number): number | null {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= max
    ? value
    : null;
}

export function parsePlaces(input: unknown): CommunityPlace[] {
  if (input === null || typeof input !== "object" || Array.isArray(input))
    throw new Error("Invalid place results.");
  const payload = object(input);
  if (payload.error === true) throw new Error("Place search unavailable.");
  if (payload.results === undefined) return [];
  if (!Array.isArray(payload.results) || payload.results.length > 100)
    throw new Error("Invalid place results.");
  const places = new Map<string, CommunityPlace>();
  for (const item of payload.results) {
    const row = object(item);
    const name = label(row.name),
      country = label(row.country);
    const lat = coordinate(row.latitude, 90),
      lon = coordinate(row.longitude, 180);
    if (
      !Number.isSafeInteger(row.id) ||
      (row.id as number) <= 0 ||
      !name ||
      !country ||
      lat === null ||
      lon === null ||
      typeof row.country_code !== "string" ||
      !/^[A-Z]{2}$/.test(row.country_code) ||
      typeof row.feature_code !== "string" ||
      !/^(PPL|ADM)/.test(row.feature_code)
    )
      continue;
    const id = `geonames:${row.id}`;
    if (places.has(id)) continue;
    places.set(id, {
      id,
      name,
      country,
      countryCode: row.country_code,
      region: label(row.admin1),
      latitude: lat,
      longitude: lon,
      population:
        typeof row.population === "number" &&
        Number.isSafeInteger(row.population) &&
        row.population > 0
          ? row.population
          : null,
      source: "geonames",
    });
    if (places.size === 10) break;
  }
  return [...places.values()];
}

export async function searchCommunityPlaces(
  query: string,
  countryCode: string,
  request: PublicRequest,
): Promise<CommunityPlace[]> {
  const name = label(query);
  const country = countryCode.trim().toUpperCase();
  if (!name || name.length < 2 || (country && !/^[A-Z]{2}$/.test(country)))
    throw new Error("Enter a place name and optional two-letter country code.");
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", name);
  url.searchParams.set("count", "10");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  if (country) url.searchParams.set("countryCode", country);
  return parsePlaces(await readPublicJson(url.href, request));
}

/** Unlisted settlements still get a workspace; manual names confer no jurisdiction or authority. */
export function manualCommunityPlace(name: string, country: string): CommunityPlace {
  const cleanName = label(name),
    cleanCountry = label(country);
  if (!cleanName || !cleanCountry) throw new Error("Enter the place and country names.");
  return {
    id: "manual",
    name: cleanName,
    country: cleanCountry,
    countryCode: null,
    region: null,
    latitude: null,
    longitude: null,
    population: null,
    source: "manual",
  };
}

export function placeLinks(place: CommunityPlace): CommunityLink[] {
  if (
    place.source !== "geonames" ||
    !/^geonames:[1-9][0-9]*$/.test(place.id) ||
    place.latitude === null ||
    place.longitude === null
  )
    return [];
  const lat = coordinate(place.latitude, 90),
    lon = coordinate(place.longitude, 180);
  if (lat === null || lon === null) return [];
  return [
    {
      title: "GeoNames place record",
      url: `https://www.geonames.org/${place.id.split(":")[1]}/`,
      description:
        "Public place record. Population observation date is not supplied by this search API.",
    },
    {
      title: "OpenStreetMap",
      url: `https://www.openstreetmap.org/#map=13/${lat}/${lon}`,
      description:
        "Explore the settlement's public map. This point is the place centre, not your device location.",
    },
  ];
}
