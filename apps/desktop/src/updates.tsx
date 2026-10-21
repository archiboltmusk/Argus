// In-app updates from the rolling beta feed (GitHub release "beta",
// latest.json). Updates are signed; the app refuses unsigned bundles.
import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { api } from "./api";

const AUTO_KEY = "updates.auto";

async function install(u: Update, onProgress: (pct: number | null) => void) {
  let total = 0;
  let got = 0;
  await u.downloadAndInstall((e) => {
    if (e.event === "Started") total = e.data.contentLength ?? 0;
    if (e.event === "Progress") { got += e.data.chunkLength; onProgress(total ? Math.round((got / total) * 100) : null); }
  });
  await relaunch();
}

/** Banner shown on launch when a newer beta is out (unless turned off). */
export function UpdateBanner() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [pct, setPct] = useState<number | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getAppSetting(AUTO_KEY).then((v) => (v === "off" ? null : check())).then((u) => u && setUpdate(u)).catch(() => {});
  }, []);

  if (!update) return null;
  return (
    <div className="update-banner" role="status">
      <span>Argus {update.version} is available.</span>
      {error && <span className="small">{error}</span>}
      {pct === undefined ? (
        <>
          <button className="primary" onClick={() => { setPct(null); install(update, setPct).catch((e) => { setError(String(e)); setPct(undefined); }); }}>Update and restart</button>
          <button onClick={() => setUpdate(null)}>Later</button>
        </>
      ) : (
        <span className="small">Downloading{pct !== null ? ` ${pct}%` : "…"}</span>
      )}
    </div>
  );
}

/** Settings section: version, manual check, and the launch-check toggle. */
export function UpdateSettings() {
  const [version, setVersion] = useState("");
  const [auto, setAuto] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [update, setUpdate] = useState<Update | null>(null);

  useEffect(() => {
    getVersion().then(setVersion);
    api.getAppSetting(AUTO_KEY).then((v) => setAuto(v !== "off"));
  }, []);

  const checkNow = async () => {
    setStatus("Checking…");
    try {
      const u = await check();
      setUpdate(u);
      setStatus(u ? `Argus ${u.version} is available.` : "You're on the latest beta.");
    } catch (e) {
      setStatus(`Couldn't check for updates: ${e}`);
    }
  };

  return (
    <section>
      <h3>Updates</h3>
      <p className="muted">Version {version} (beta). Updates download from the Argus beta channel and are signature-checked before install.</p>
      <div className="actions">
        <button onClick={checkNow}>Check for updates</button>
        {update && <button className="primary" onClick={() => { setStatus("Downloading…"); install(update, (p) => setStatus(p !== null ? `Downloading ${p}%` : "Downloading…")).catch((e) => setStatus(String(e))); }}>Update and restart</button>}
      </div>
      {status && <div className="small muted">{status}</div>}
      <label className="check">
        <input type="checkbox" checked={auto} onChange={(e) => { setAuto(e.target.checked); api.setAppSetting(AUTO_KEY, e.target.checked ? "on" : "off"); }} />
        Check for updates when Argus starts
      </label>
    </section>
  );
}
