import { Zap } from "lucide-react";
import { AddonLogo } from "@/components/addon-logo";
import { useDebridClients } from "@/lib/debrid/registry";
import { useT } from "@/lib/i18n";
import type { ScoredStream } from "@/lib/streams/types";
import { directStreamAvailable } from "@/lib/torrent/stremio-stream";

export function PlayProvenance({
  stream,
  debrids,
  isCached,
  addonLogo,
}: {
  stream: ScoredStream;
  debrids: ReturnType<typeof useDebridClients>;
  isCached: boolean;
  addonLogo: string | null;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <ProvenanceDetails stream={stream} debrids={debrids} isCached={isCached} addonLogo={addonLogo} />
      <StreamExplanation stream={stream} />
    </div>
  );
}

export function StreamExplanation({ stream }: { stream: ScoredStream }) {
  const t = useT();
  if (!Number.isFinite(stream.score)) return null;
  const label = (signal: string): string => {
    switch (signal) {
      case "cached": return t("Ready in a connected debrid cache");
      case "direct url":
      case "direct-free-stream":
      case "easynews-direct":
      case "prelinked-url": return t("Direct playback link available");
      case "preferred-language": return t("Matches your preferred audio language");
      case "language-mismatch": return t("Does not match your preferred audio language");
      case "language-unknown": return t("Audio language is not labeled");
      case "multi-language": return t("Multiple audio languages available");
      case "verified-correct-link": return t("Marked as a working link");
      case "community-verified-pristine": return t("Verified by viewer feedback");
      case "reported-wrong-movie": return t("Reported as the wrong title");
      case "reported-bad-link": return t("Reported as a broken link");
      case "community-feedback": return t("Viewer feedback");
      case "dead-link": return t("Previously marked as broken");
      case "origin-addon": return t("Matches your selected addon");
      case "strong-addon":
      case "trusted-addon": return t("Trusted addon");
      case "web-friendly-stream": return t("Compatible with browser playback");
      case "web-incompatible-format":
      case "webview2-unfriendly": return t("Limited browser playback compatibility");
      case "scam-penalty":
      case "title-says-hires-filename-says-cam": return t("Source details may be unreliable");
      case "size-mismatch": return t("File size does not match the advertised quality");
      case "REMUX": return t("Original disc quality");
      case "CAM penalty":
      case "Telesync penalty":
      case "Telecine penalty":
      case "Screener penalty": return t("Lower quality release source");
      case "Atmos":
      case "TrueHD":
      case "DTS-HD MA":
      case "DD+": return t("Higher quality audio format");
      case "4K":
      case "1080p":
      case "720p":
      case "480p": return t("Video resolution");
      case "DV":
      case "DV+HDR10":
      case "HDR10":
      case "HDR10+": return t("High dynamic range video");
    }
    if (signal.startsWith("addon-priority-")) return t("Your addon priority");
    if (signal.startsWith("group-pref:")) return t("Preferred release group");
    if (signal.startsWith("prev-episode-group:")) return t("Matches the previous episode's release group");
    if (signal.startsWith("bitrate-exceeds-budget:") || signal.startsWith("low-bandwidth-"))
      return t("May exceed your connection speed");
    if (signal.startsWith("year-mismatch:")) return t("Release year does not match");
    if (signal.startsWith("fresh-fake-") || signal.startsWith("new-release-virus-") || signal.startsWith("new-release-no-label-"))
      return t("Release details need caution");
    return t("Additional ranking factors");
  };
  const reasons = (stream.reasons ?? [])
    .filter((reason) => Number.isFinite(reason.delta) && reason.delta !== 0)
    .map((reason) => ({ label: label(reason.signal), delta: reason.delta }));
  return (
    <details
      className="max-w-sm text-[12px] font-normal tracking-normal text-ink-muted"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") event.stopPropagation();
      }}
    >
      <summary className="w-fit cursor-pointer rounded py-1 text-ink-subtle underline-offset-4 hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
        {t("Why this stream?")}
      </summary>
      <div className="mt-1 rounded-lg border border-edge-soft bg-canvas/60 p-3">
        <p className="font-semibold text-ink">{t("Ranking score: {score}", { score: stream.score })}</p>
        <p className="mt-1 text-ink-subtle">{t("Compared with the other available sources.")}</p>
        {reasons.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-1">
            {reasons.map((reason, index) => (
              <li key={index} className="flex items-start justify-between gap-4">
                <span>{reason.label}</span>
                <span className="shrink-0 font-mono tabular-nums">{reason.delta > 0 ? "+" : ""}{reason.delta}</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2">{t("No additional ranking details are available.")}</p>}
      </div>
    </details>
  );
}

function ProvenanceDetails({
  stream,
  debrids,
  isCached,
  addonLogo,
}: {
  stream: ScoredStream;
  debrids: ReturnType<typeof useDebridClients>;
  isCached: boolean;
  addonLogo: string | null;
}) {
  const t = useT();
  const addonChip = (
    <span className="inline-flex items-center gap-1.5">
      <AddonLogo
        addonId={stream.addonId}
        addonName={stream.addonName}
        manifestLogo={addonLogo}
        size="xs"
      />
      <span>{stream.addonName}</span>
    </span>
  );

  if (stream.url) {
    return (
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-ink-subtle">
        <span>{t("via")}</span>
        {addonChip}
      </p>
    );
  }
  if (debrids.length === 0) {
    if (directStreamAvailable(stream)) {
      return (
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-ink-muted">
            {t("Streams from peers")}
          </p>
          <p className="flex items-center gap-1.5 text-[10px] font-medium tracking-[0.18em] text-ink-subtle/70">
            <span>{t("found by")}</span>
            {addonChip}
          </p>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-danger/80">
          {t("No debrid configured")}
        </p>
        <p className="flex items-center gap-1.5 text-[10px] font-medium tracking-[0.18em] text-ink-subtle/80">
          <span>{t("add one in settings")}</span>
          <span aria-hidden>·</span>
          <span>{t("found by")}</span>
          {addonChip}
        </p>
      </div>
    );
  }
  const cached = debrids.find((d) => stream.cached[d.slug]);
  const target = cached ?? debrids[0];
  return (
    <div className="flex flex-col gap-1">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-ink-muted">
        {isCached && <Zap size={10} fill="currentColor" strokeWidth={0} className="text-accent" />}
        {isCached ? (
          <>
            <span>{t("plays via")}</span>
            <span>{target.name}</span>
          </>
        ) : (
          t("uncached on debrid")
        )}
      </p>
      <p className="flex items-center gap-1.5 text-[10px] font-medium tracking-[0.18em] text-ink-subtle/70">
        <span>{t("found by")}</span>
        {addonChip}
      </p>
    </div>
  );
}
