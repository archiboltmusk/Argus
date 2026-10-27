/**
 * ARX (Argus Recipe & Relay eXchange) Specification
 *
 * ARX decouples media scraping and resolution from centralized addon web services.
 * Recipes are lightweight, self-contained, client-side scripts executed inside
 * a memory-safe, sandboxed Web Worker / QuickJS isolate on the user's local machine.
 *
 * Legal Precedent:
 * Like web browsers executing userscripts or RSS readers parsing feeds, Argus is
 * strictly a general-purpose execution runtime. No scraping servers or central databases
 * exist for copyright enforcers to target.
 */

export const ARX_SCHEMA = "arx.recipe/1";

export type ArxMediaType = "movie" | "series" | "anime" | "live";

export interface ArxRecipeManifest {
  schema: typeof ARX_SCHEMA;
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  homepage?: string;
  icon?: string;
  types: ArxMediaType[];
  hosts: string[];
  code: string;
  sha256?: string;
  settings?: Record<string, {
    label: string;
    type: "text" | "password" | "boolean" | "select";
    default?: string | boolean;
    options?: Array<{ label: string; value: string }>;
  }>;
}

export function isArxRecipe(v: unknown): v is ArxRecipeManifest {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    o.schema === ARX_SCHEMA &&
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    typeof o.code === "string"
  );
}

export function parseArxRecipe(v: unknown): ArxRecipeManifest {
  if (!isArxRecipe(v)) {
    throw new Error("invalid-recipe: missing-fields or unsupported schema");
  }
  const o = v as unknown as ArxRecipeManifest;
  return {
    schema: ARX_SCHEMA,
    id: o.id.trim(),
    name: o.name.trim(),
    version: o.version ? String(o.version).trim() : "1.0.0",
    description: o.description?.trim(),
    author: o.author?.trim() || "Community",
    homepage: o.homepage?.trim(),
    icon: o.icon?.trim(),
    types: Array.isArray(o.types) ? (o.types as ArxMediaType[]) : ["movie", "series"],
    hosts: Array.isArray(o.hosts) ? o.hosts.map((h) => String(h).toLowerCase().trim()) : [],
    code: o.code.trim(),
    sha256: o.sha256?.trim(),
    settings: o.settings,
  };
}
