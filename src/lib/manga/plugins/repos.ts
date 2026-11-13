import { fetchRepo } from "./repo";
import { loadRepoUrls, saveRepoUrl, deleteRepoUrl, installedPluginsSync } from "./store";
import { uninstallPlugin } from "./lifecycle";
import { removeMangayomiRecordsByRepo } from "../sources/mangayomi";
import type { PluginRepo } from "./types";

const DEFAULT_MANGA_REPOS = [
  "https://kodjodevf.github.io/mangayomi-extensions/index.json",
  "https://github.com/keiyoushi/extensions/raw/repo/index.pb",
  "https://raw.githubusercontent.com/hamad0original-lgtm/harbor-manga-repo/main/repo.json",
];
const SEED_KEY = "argus.manga.repos.seeded.v1";

let urls: string[] | null = null;
const listeners = new Set<() => void>();

export function subscribeRepos(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function notify(): void {
  for (const l of listeners) l();
}

export function repoUrlsSync(): string[] {
  return urls ?? [];
}

export async function loadRepos(): Promise<string[]> {
  let saved = await loadRepoUrls();
  const seeded = typeof localStorage !== "undefined" && localStorage.getItem(SEED_KEY) === "1";
  if (!seeded) {
    for (const u of DEFAULT_MANGA_REPOS) {
      if (!saved.includes(u)) {
        await saveRepoUrl(u).catch(() => {});
      }
    }
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(SEED_KEY, "1");
    }
    saved = await loadRepoUrls();
  }
  urls = saved;
  notify();
  return urls;
}

export function browseRepo(url: string): Promise<PluginRepo> {
  return fetchRepo(url);
}

export async function addRepo(url: string): Promise<PluginRepo> {
  const repo = await fetchRepo(url);
  await saveRepoUrl(repo.url);
  urls = await loadRepoUrls();
  notify();
  return repo;
}

export async function removeRepo(url: string): Promise<void> {
  await deleteRepoUrl(url);
  for (const p of installedPluginsSync().filter((x) => x.repoUrl === url)) {
    await uninstallPlugin(p.id);
  }
  await removeMangayomiRecordsByRepo(url);
  urls = await loadRepoUrls();
  notify();
}
