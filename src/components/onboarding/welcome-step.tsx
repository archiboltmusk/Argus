import { useState } from "react";
import { isLinuxDesktop, isMacDesktop, isWindowsDesktop } from "@/lib/platform";
import type { PlayerSrc } from "@/lib/view";
import { ArgusMark } from "@/components/icons/argus-mark";
import { useT } from "@/lib/i18n";

export function WelcomeStep({ onPlay }: { onPlay: (source: PlayerSrc) => void }) {
  const t = useT();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [demo, setDemo] = useState<
    "ready" | "playing" | "failed-test" | "recovering" | "recovered" | "error"
  >("ready");
  const demoUrl = `${import.meta.env.BASE_URL}demo/argus-playback.mp4`;

  function play(source: string, title: string, local = false) {
    onPlay({
      meta: { id: `quick-play:${crypto.randomUUID()}`, type: "movie", name: title },
      url: source,
      title,
      notWebReady: local,
      suppressCloudSync: true,
    });
  }

  function playUrl() {
    try {
      const target = new URL(url.trim());
      if (!["http:", "https:"].includes(target.protocol) || target.username || target.password) {
        throw new Error("Invalid media URL");
      }
      setError(null);
      play(target.href, target.hostname);
    } catch {
      setError(t("Enter a valid HTTP or HTTPS media URL."));
    }
  }

  async function pickFile() {
    setPicking(true);
    setError(null);
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const file = await open({
        multiple: false,
        filters: [{ name: t("Video"), extensions: ["mp4", "mkv", "webm", "mov", "avi", "m4v"] }],
      });
      if (typeof file === "string") play(file, file.split(/[\\/]/).pop() || t("Video"), true);
    } catch {
      setError(t("Could not open the video file."));
    } finally {
      setPicking(false);
    }
  }
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-ink">
          <ArgusMark className="h-12 w-12 shrink-0" />
          <span
            className="font-display text-[44px] font-medium leading-none tracking-tight"
            style={{ transform: "translateY(2px)" }}
          >
            Argus
          </span>
        </div>
        <p className="text-[15.5px] leading-relaxed text-ink-muted">
          {t(
            "A client for the Stremio protocol. Two minutes to set up; most of it optional. You stay in control of every key.",
          )}
        </p>
      </div>
      {demo === "ready" ? (
        <button
          type="button"
          onClick={() => setDemo("playing")}
          className="w-fit rounded-md bg-accent px-3 py-2 text-sm text-accent-contrast"
        >
          {t("Play the sample video")}
        </button>
      ) : (
        <div className="space-y-2">
          <video
            key={demo === "failed-test" ? "invalid" : "sample"}
            src={
              demo === "failed-test"
                ? `${import.meta.env.BASE_URL}demo/missing-source.mp4`
                : demoUrl
            }
            autoPlay
            controls
            playsInline
            onError={() => {
              setDemo(demo === "failed-test" ? "recovering" : "error");
            }}
            onPlaying={() => {
              if (demo === "recovering") setDemo("recovered");
            }}
            className="aspect-video w-full rounded-lg bg-black"
            aria-label={t("Argus sample video")}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setDemo("failed-test")}
              disabled={demo === "failed-test"}
              className="rounded border border-edge-soft px-2 py-1 text-xs"
            >
              {t("Simulate a source failure")}
            </button>
            <button
              type="button"
              onClick={() => setDemo("ready")}
              className="rounded border border-edge-soft px-2 py-1 text-xs"
            >
              {t("Close demo")}
            </button>
            {demo === "error" && (
              <span role="alert" className="text-xs">
                {t("The sample video could not play.")}
              </span>
            )}
            {demo === "recovered" && (
              <span role="status" className="text-xs">
                {t("Sample video restored after a simulated failure.")}
              </span>
            )}
          </div>
        </div>
      )}
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          playUrl();
        }}
      >
        <label htmlFor="welcome-media-url" className="text-sm font-medium text-ink">
          {t("Open a media URL")}
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="welcome-media-url"
            type="text"
            inputMode="url"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              setError(null);
            }}
            className="min-w-0 basis-40 grow rounded-md border border-edge bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-muted"
            placeholder="https://"
          />
          <button
            type="submit"
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-contrast transition-colors enabled:hover:brightness-110 disabled:opacity-50"
            disabled={picking || !url.trim()}
          >
            {t("Play URL")}
          </button>
          {(isMacDesktop() || isWindowsDesktop() || isLinuxDesktop()) && (
            <button
              type="button"
              className="rounded-md border border-edge-soft px-3 py-2 text-sm"
              disabled={picking}
              onClick={() => void pickFile()}
            >
              {t("Open a video file")}
            </button>
          )}
        </div>
        <p className="text-xs text-ink-muted">
          {t("Playing now skips setup. You can connect services later in Settings.")}
        </p>
        {error && (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
      </form>
      <div className="grid grid-cols-3 gap-3 pt-2">
        <Bullet title={t("Current")}>
          {t("Trending, in theaters, what's on every streamer.")}
        </Bullet>
        <Bullet title={t("Yours")}>{t("Your Stremio library + addons sync in untouched.")}</Bullet>
        <Bullet title={t("Quiet")}>{t("No telemetry, no servers, no bundled keys.")}</Bullet>
      </div>
      <p className="text-[12.5px] leading-relaxed text-ink-subtle">
        {t(
          "Argus ships with no streaming sources. You are responsible for the addons and sources you add and for following the laws where you live.",
        )}
      </p>
    </div>
  );
}

function Bullet({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-edge-soft bg-canvas/60 p-4">
      <span className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-ink">
        {title}
      </span>
      <span className="text-[12.5px] leading-snug text-ink-muted">{children}</span>
    </div>
  );
}
