import { readPublicJson, type PublicRequest } from "./public-json";

// Adapted from Parishkar's place-facts.js (MIT); see THIRD_PARTY_NOTICES.md.
// Keep civic data separate from media identity, policy scoring, and private RPCs.
export const PURULIA_REVISION = "6e1c4aede217e91c275bf029b4c299a523994c04";
export const PURULIA_DATA_URL = `https://raw.githubusercontent.com/archiboltmusk/Purulia/${PURULIA_REVISION}/places/wb_district_facts.json`;
export const PURULIA_SITE = "https://archiboltmusk.github.io/Purulia/";

export const COMMUNITY_RESOURCES = [
  {
    id: "reports",
    page: "kasa.html",
    title: "Report and verify a civic problem",
    description: "Continue in Parishkar for live camera/GPS capture and moderated verification.",
    district: false,
  },
  {
    id: "promises",
    page: "promises.html",
    title: "Public commitments",
    description: "Read documented promises and their recorded progress.",
    district: true,
  },
  {
    id: "notices",
    page: "noticeboard.html",
    title: "Community needs",
    description: "Find local demands and opportunities to help.",
    district: true,
  },
  {
    id: "record",
    page: "record.html",
    title: "Evidence and corrections",
    description: "Explore the reviewed public record and its correction process.",
    district: false,
  },
  {
    id: "rti",
    page: "rti-letter.html",
    title: "Request public information",
    description:
      "Prepare a draft locally on Parishkar; review it before submitting to an authority.",
    district: false,
  },
] as const;

export type CommunityResourceId = (typeof COMMUNITY_RESOURCES)[number]["id"];
export type CivicSource = { name: string; url: string; read: string | null };
export type CivicMetric = {
  label: string;
  value: number | null;
  unit: "people" | "%";
  period: string;
  source: CivicSource | null;
};
export type CommunityDistrict = {
  slug: string;
  name: string;
  surveyScope: string | null;
  metrics: CivicMetric[];
};
export type CommunityFacts = { generated: string | null; districts: CommunityDistrict[] };

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown, max = 160): string | null {
  return typeof value === "string" && value.trim() && value.length <= max ? value.trim() : null;
}

function date(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    ? value
    : null;
}

function number(value: unknown, percent = false): number | null {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    (percent ? value <= 100 : Number.isSafeInteger(value))
    ? value
    : null;
}

function source(value: unknown, url: string): CivicSource | null {
  const row = record(value);
  const name = text(row.name);
  return name ? { name, url, read: date(row.read) } : null;
}

/** Project only aggregate facts. Never forward arbitrary fields, HTML, or remote URLs. */
export function parseCommunityFacts(input: unknown): CommunityFacts {
  const data = record(input);
  const entries = Object.entries(record(data.districts));
  if (entries.length === 0 || entries.length > 100) throw new Error("Invalid community dataset.");
  const sources = record(data.sources);
  const nfhs = record(record(data.nfhs).districts);
  const jjmSource = source(sources.jjm, "https://ejalshakti.gov.in/jjmreport/JJMDistrictView.aspx");
  const nfhsSource = source(
    sources.nfhs,
    "https://rchiips.org/nfhs/districtfactsheet_NFHS-5.shtml",
  );
  const districts: CommunityDistrict[] = [];
  for (const [slug, value] of entries) {
    const row = record(value);
    const name = text(row.name);
    if (!/^[a-z]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 64 || !name) continue;
    const censusSource = source(sources.wikidata, "https://www.wikidata.org/");
    const survey = text(row.nfhs_district);
    const surveyData = record(survey ? nfhs[survey] : null);
    const metrics: CivicMetric[] = [
      {
        label: "Population",
        value: censusSource ? number(record(row.census2011).population) : null,
        unit: "people",
        period: "Census 2011",
        source: censusSource,
      },
      {
        label: "Households with tap connections",
        value: jjmSource ? number(record(row.jjm).pct, true) : null,
        unit: "%",
        period: "JJM snapshot",
        source: jjmSource,
      },
      ...[
        ["water", "People with safe drinking water"],
        ["sanitation", "People with a proper toilet"],
        ["electricity", "People with electricity at home"],
      ].map(([key, label]): CivicMetric => ({
        label,
        value:
          nfhsSource && Array.isArray(surveyData[key]) ? number(surveyData[key][0], true) : null,
        unit: "%",
        period: "NFHS-5 (2019–21)",
        source: nfhsSource,
      })),
    ];
    districts.push({ slug, name, surveyScope: text(row.nfhs_part_of) ?? survey, metrics });
  }
  if (!districts.length) throw new Error("No supported districts in community dataset.");
  return {
    generated: date(data.generated),
    districts: districts.sort((a, b) => a.slug.localeCompare(b.slug)),
  };
}

export function communityResourceUrl(id: CommunityResourceId, district: string): string {
  const resource = COMMUNITY_RESOURCES.find((item) => item.id === id);
  if (!resource || !/^[a-z]+(?:-[a-z0-9]+)*$/.test(district) || district.length > 64) {
    throw new Error("Unsupported community destination.");
  }
  const url = new URL(resource.page, PURULIA_SITE);
  if (resource.district) url.searchParams.set("d", district);
  return url.href;
}

/** Fetch only the reviewed public artifact; never call private Parishkar RPCs. */
export async function loadCommunityFacts(request: PublicRequest): Promise<CommunityFacts> {
  return parseCommunityFacts(await readPublicJson(PURULIA_DATA_URL, request));
}
