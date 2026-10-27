import type { ArxRecipeManifest } from "./arx-recipe";
import type { StreamRepoEntry, StreamRepoRecord } from "@/lib/streams/plugins/types";

export const ARX_REPO_URL = "arx-recipe://local";

/**
 * Maps a standalone, zero-server ARX recipe into the native Argus stream plugin architecture.
 * This immediately gives ARX recipes all standard Argus capabilities:
 * - Direct execution inside sandboxed Web Workers
 * - Automatic background quality upgrades
 * - Display capability matching & stall recovery
 * - User-toggled settings and domain permissions
 */
export function arxRecipeToPluginEntry(recipe: ArxRecipeManifest): {
  repo: StreamRepoRecord;
  entry: StreamRepoEntry;
} {
  const repo: StreamRepoRecord = {
    url: ARX_REPO_URL,
    name: "ARX Decentralized Recipes",
    homepage: "https://github.com/archiboltmusk/Argus",
    format: "provider-script",
    entries: [],
    checkedAt: Date.now(),
    error: null,
  };

  const entry: StreamRepoEntry = {
    id: recipe.id,
    name: recipe.name,
    version: recipe.version,
    entry: `data:text/javascript;base64,${Buffer.from(recipe.code).toString("base64")}`,
    sha256: recipe.sha256,
    icon: recipe.icon,
    description: recipe.description,
    author: recipe.author,
    lang: ["en"],
    types: recipe.types,
    idPrefixes: ["tt"],
    hosts: recipe.hosts,
    settings: !!recipe.settings,
    nsfw: false,
    enabled: true,
    format: "provider-script",
  };

  return { repo, entry };
}
