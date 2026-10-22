import { downloadText } from "@/lib/download-text";
import { collectRuntime } from "./collect-runtime";

/** Saves a scrubbed runtime report the user can attach to a bug report. */
export function exportDiagnostics(): Promise<boolean> {
  const head = [
    `Argus ${typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev"}`,
    `Exported ${new Date().toISOString()}`,
    typeof navigator !== "undefined" ? navigator.userAgent : "",
    "",
  ].join("\n");
  const stamp = new Date().toISOString().slice(0, 10);
  return downloadText(`argus-diagnostics-${stamp}.txt`, head + collectRuntime(), ["txt"], "Argus diagnostics");
}
