import { invoke } from "@tauri-apps/api/core";
import { isIncognito, setIncognito } from "./index";

/** First call turns incognito on and wipes scratch files; a second call turns it off. */
export async function togglePanic(): Promise<boolean> {
  if (isIncognito()) {
    setIncognito(false);
    return false;
  }
  setIncognito(true);
  try {
    await invoke("temp_clear");
  } catch {
    // Not running under Tauri (web build) or nothing to clear.
  }
  return true;
}
