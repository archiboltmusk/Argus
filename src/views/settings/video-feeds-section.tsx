import { useCallback, useEffect, useState } from "react";
import { useSettings } from "@/lib/settings";
import { useT } from "@/lib/i18n";
import { useView } from "@/lib/view";
import { ModalShell, useModalExit } from "@/components/modal-shell";
import {
  fetchVideoFeed,
  orderLectures,
  type VideoFeedConfig,
  type VideoFeedItem,
} from "@/lib/feeds/video-feed";
import { Section, ToggleRow } from "./shared";

const FIELD =
  "h-10 w-full rounded-lg bg-canvas/70 px-3 text-[13px] text-ink ring-1 ring-edge-soft/60 outline-none focus:ring-accent";

function FeedBrowser({ feed, onClose }: { feed: VideoFeedConfig; onClose: () => void }) {
  const t = useT();
  const view = useView();
  const { closing, close } = useModalExit(onClose);
  const [items, setItems] = useState<VideoFeedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchVideoFeed(feed.url)
      .then((f) => {
        if (!cancelled) setItems(orderLectures(f.items));
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [feed.url]);

  const play = useCallback(
    (item: VideoFeedItem) => {
      close();
      view.openPlayer({
        meta: { id: `feed:${item.id}`, type: "movie", name: item.title, poster: item.thumbnail },
        url: item.url,
        title: item.title,
        subtitle: feed.name,
        notWebReady: true,
      });
    },
    [close, feed.name, view],
  );

  return (
    <ModalShell closing={closing} onDismiss={close} width={560}>
      <div className="flex items-center justify-between gap-3 border-b border-edge-soft/60 px-5 py-4">
        <div className="min-w-0 truncate text-[15px] font-semibold text-ink">{feed.name}</div>
        <button type="button" onClick={close} className="text-[13px] text-ink-subtle hover:text-ink">
          {t("Close")}
        </button>
      </div>
      <div className="min-h-[200px] overflow-y-auto p-2">
        {error && <div className="px-3 py-4 text-[13px] text-red-400">{error}</div>}
        {!error && !items && <div className="px-3 py-4 text-[13px] text-ink-subtle">{t("Loading…")}</div>}
        {items?.length === 0 && (
          <div className="px-3 py-4 text-[13px] text-ink-subtle">{t("No videos here.")}</div>
        )}
        {items?.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => play(item)}
            className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start text-[13.5px] text-ink hover:bg-elevated/50"
          >
            <span className="truncate">{item.title}</span>
            {item.durationSec ? (
              <span className="shrink-0 text-[11.5px] text-ink-subtle">
                {Math.round(item.durationSec / 60)} min
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </ModalShell>
  );
}

export function VideoFeedsSection() {
  const t = useT();
  const { settings, update } = useSettings();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState<VideoFeedConfig | null>(null);
  const valid = /^https?:\/\//i.test(url.trim());

  const add = () => {
    const clean = url.trim();
    update({
      videoFeeds: [
        ...settings.videoFeeds,
        { id: crypto.randomUUID(), name: name.trim() || clean, url: clean },
      ],
    });
    setName("");
    setUrl("");
  };

  return (
    <Section
      title={t("Video feeds")}
      subtitle={t(
        "Lecture series and courses from RSS video podcasts and official YouTube channel or playlist feeds (youtube.com/feeds/videos.xml). Nothing is added for you.",
      )}
    >
      <ToggleRow
        label={t("Video feeds")}
        sub={t("Adds a list of feeds you can browse and play from.")}
        value={settings.videoFeedsEnabled}
        onChange={(videoFeedsEnabled) => update({ videoFeedsEnabled })}
      />
      {settings.videoFeedsEnabled && (
        <div className="flex flex-col gap-2 rounded-xl bg-elevated/30 p-3 ring-1 ring-edge-soft/50">
          {settings.videoFeeds.map((feed) => (
            <div key={feed.id} className="flex items-center justify-between gap-3 text-[13px] text-ink">
              <span className="truncate">{feed.name}</span>
              <span className="flex shrink-0 gap-3">
                <button type="button" className="text-ink-muted hover:text-ink" onClick={() => setOpen(feed)}>
                  {t("Browse")}
                </button>
                <button
                  type="button"
                  className="text-ink-subtle hover:text-red-400"
                  onClick={() =>
                    update({ videoFeeds: settings.videoFeeds.filter((f) => f.id !== feed.id) })
                  }
                >
                  {t("Remove")}
                </button>
              </span>
            </div>
          ))}
          <input className={FIELD} placeholder={t("Name (optional)")} value={name} onChange={(e) => setName(e.target.value)} />
          <input className={FIELD} placeholder={t("Feed URL")} value={url} onChange={(e) => setUrl(e.target.value)} />
          <button
            type="button"
            disabled={!valid}
            onClick={add}
            className="h-10 w-fit rounded-full bg-ink px-5 text-[13px] font-semibold text-canvas transition-opacity disabled:opacity-40"
          >
            {t("Add feed")}
          </button>
        </div>
      )}
      {open && <FeedBrowser feed={open} onClose={() => setOpen(null)} />}
    </Section>
  );
}
