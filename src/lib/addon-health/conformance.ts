/**
 * Structural checks for Stremio addon protocol responses. A response that parses as JSON but
 * breaks the protocol (a stream with no source, a manifest with no resources) fails later in ways
 * that look like a broken player, so the probe records these as addon failures instead.
 */

export type ConformanceKind = "manifest" | "stream" | "catalog" | "meta" | "subtitles";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isText = (value: unknown): boolean => typeof value === "string" && value.trim() !== "";

// A stream needs somewhere to play from. nzbUrl and rarUrls are the newer Usenet and archive sources.
const STREAM_SOURCES = ["url", "ytId", "infoHash", "externalUrl", "nzbUrl", "rarUrls", "zipUrls"];

function checkResource(resource: unknown, index: number): string[] {
  if (typeof resource === "string") return isText(resource) ? [] : [`resources[${index}] is empty`];
  if (!isObject(resource)) return [`resources[${index}] is neither a name nor an object`];
  const issues: string[] = [];
  if (!isText(resource.name)) issues.push(`resources[${index}] has no name`);
  if (resource.types !== undefined && !Array.isArray(resource.types))
    issues.push(`resources[${index}].types is not an array`);
  if (resource.idPrefixes !== undefined && !Array.isArray(resource.idPrefixes))
    issues.push(`resources[${index}].idPrefixes is not an array`);
  return issues;
}

export function checkManifest(body: unknown): string[] {
  if (!isObject(body)) return ["manifest is not an object"];
  const issues: string[] = [];
  for (const field of ["id", "version", "name"] as const)
    if (!isText(body[field])) issues.push(`manifest.${field} is missing`);
  if (!Array.isArray(body.resources)) issues.push("manifest.resources is not an array");
  else body.resources.forEach((resource, index) => issues.push(...checkResource(resource, index)));
  if (!Array.isArray(body.types)) issues.push("manifest.types is not an array");
  if (!Array.isArray(body.catalogs)) issues.push("manifest.catalogs is not an array");
  else
    body.catalogs.forEach((catalog, index) => {
      if (!isObject(catalog) || !isText(catalog.id) || !isText(catalog.type))
        issues.push(`catalogs[${index}] needs an id and a type`);
    });
  return issues;
}

export function checkStreams(body: unknown): string[] {
  if (!isObject(body) || !Array.isArray(body.streams)) return ["response has no streams array"];
  const issues: string[] = [];
  body.streams.forEach((stream, index) => {
    if (!isObject(stream)) {
      issues.push(`streams[${index}] is not an object`);
      return;
    }
    if (!STREAM_SOURCES.some((field) => stream[field] !== undefined && stream[field] !== ""))
      issues.push(`streams[${index}] has no source`);
    else if (stream.url !== undefined && !isText(stream.url))
      issues.push(`streams[${index}].url is not text`);
  });
  return issues;
}

export function checkCatalog(body: unknown): string[] {
  if (!isObject(body) || !Array.isArray(body.metas)) return ["response has no metas array"];
  const issues: string[] = [];
  body.metas.forEach((meta, index) => {
    if (!isObject(meta) || !isText(meta.id) || !isText(meta.type) || !isText(meta.name))
      issues.push(`metas[${index}] needs an id, a type and a name`);
  });
  return issues;
}

export function checkMeta(body: unknown): string[] {
  if (!isObject(body) || !isObject(body.meta)) return ["response has no meta object"];
  const { meta } = body;
  return isText(meta.id) && isText(meta.type) && isText(meta.name)
    ? []
    : ["meta needs an id, a type and a name"];
}

export function checkSubtitles(body: unknown): string[] {
  if (!isObject(body) || !Array.isArray(body.subtitles)) return ["response has no subtitles array"];
  const issues: string[] = [];
  body.subtitles.forEach((subtitle, index) => {
    if (!isObject(subtitle) || !isText(subtitle.url) || !isText(subtitle.lang))
      issues.push(`subtitles[${index}] needs a url and a lang`);
  });
  return issues;
}

/** Returns every protocol violation found in a response; an empty list means it conforms. */
export function checkConformance(kind: ConformanceKind, body: unknown): string[] {
  switch (kind) {
    case "manifest":
      return checkManifest(body);
    case "stream":
      return checkStreams(body);
    case "catalog":
      return checkCatalog(body);
    case "meta":
      return checkMeta(body);
    case "subtitles":
      return checkSubtitles(body);
  }
}
