export type ListRef =
  | { source: "mdblist"; path: string; url: string }
  | { source: "trakt"; path: string; url: string };

const SLUG = /^[a-zA-Z0-9_-]+$/;

function hostOf(value: string): URL | null {
  try {
    const u = new URL(value.trim());
    if (u.protocol !== "https:" || u.username || u.password || u.port) return null;
    return u;
  } catch {
    return null;
  }
}

// https://mdblist.com/lists/<user>/<slug>  or  https://mdblist.com/lists/<numeric id>
function parseMdblist(u: URL): ListRef | null {
  if (!["mdblist.com", "www.mdblist.com"].includes(u.hostname)) return null;
  const parts = u.pathname.split("/").filter(Boolean);
  if (parts[0] !== "lists" || parts.length < 2 || parts.length > 3) return null;
  const rest = parts.slice(1);
  if (!rest.every((p) => SLUG.test(p))) return null;
  if (rest.length === 1 && !/^\d+$/.test(rest[0])) return null;
  const path = rest.join("/");
  return { source: "mdblist", path, url: `https://mdblist.com/lists/${path}` };
}

// https://trakt.tv/users/<user>/lists/<slug>  or  https://trakt.tv/lists/<numeric id>
function parseTrakt(u: URL): ListRef | null {
  if (!["trakt.tv", "www.trakt.tv", "app.trakt.tv"].includes(u.hostname)) return null;
  const parts = u.pathname.split("/").filter(Boolean);
  if (!parts.every((p) => SLUG.test(p))) return null;
  const personal = parts.length === 4 && parts[0] === "users" && parts[2] === "lists";
  const global = parts.length === 2 && parts[0] === "lists" && /^\d+$/.test(parts[1]);
  if (!personal && !global) return null;
  const path = parts.join("/");
  return { source: "trakt", path, url: `https://trakt.tv/${path}` };
}

export function parseListUrl(value: string): ListRef | null {
  const u = hostOf(value);
  return u ? (parseMdblist(u) ?? parseTrakt(u)) : null;
}

// Cover images are rendered in <img>, so only https URLs and small inline images pass.
export function validCoverImage(value: string): boolean {
  if (!value) return true;
  if (/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(value)) return value.length < 500_000;
  const u = hostOf(value);
  return u != null;
}
