import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { directMusicStream } from "@/lib/music/direct-stream";

export function MobileMusicStream({ active }: { active: boolean }) {
  const t = useT();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const audio = audioRef.current;
    return () => audio?.pause();
  }, [active]);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8">
      <h1 className="font-display text-4xl font-semibold">{t("Music")}</h1>
      <p className="text-ink-muted">
        {t(
          "Connected music catalogs and libraries are unavailable on this build. You can play a direct HTTPS audio stream.",
        )}
      </p>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const audio = audioRef.current;
          if (!audio) return;
          try {
            const track = directMusicStream(url);
            setError("");
            audio.src = track.playbackUrl ?? "";
            void audio.play().catch(() => {
              if (audio.src === track.playbackUrl && audio.paused) {
                setError(t("Could not start this audio stream."));
              }
            });
          } catch {
            setError(t("Use a complete HTTPS audio URL without credentials or a fragment."));
          }
        }}
      >
        <label className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
          {t("HTTPS audio address")}
          <input
            className="h-12 rounded-xl border border-edge-soft bg-surface px-3"
            onChange={(event) => setUrl(event.target.value)}
            required
            type="url"
            value={url}
          />
        </label>
        <button
          type="submit"
          className="h-12 rounded-xl bg-accent px-5 font-semibold text-accent-contrast"
        >
          {t("Play stream")}
        </button>
      </form>
      <audio
        ref={audioRef}
        controls
        preload="none"
        className="w-full"
        aria-label={t("Audio stream player")}
      />
      <p role="status" className="text-sm text-ink-muted">
        {error}
      </p>
    </main>
  );
}
