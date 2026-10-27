import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";
import { completedDownloadById, useDownloads } from "@/lib/download/downloads-store";
import { useT } from "@/lib/i18n";
import { useView } from "@/lib/view";
import { useProfiles } from "@/lib/profiles";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}

export function OfflineBanner() {
  const online = useOnline();
  const { view, setView } = useView();
  const items = useDownloads();
  const { activeProfile } = useProfiles();
  const t = useT();
  const routed = useRef(online);
  const completedKey = JSON.stringify([
    activeProfile?.id,
    items.filter((item) => item.status === "done").map((item) => [item.id, item.path, item.kind, item.format]),
  ]);
  const [verified, setVerified] = useState<{ key: string; available: boolean } | null>(null);
  const hasSaved = !online && verified?.key === completedKey && verified.available;

  useEffect(() => {
    if (online) {
      setVerified(null);
      return;
    }
    let current = true;
    const [, candidates] = JSON.parse(completedKey) as [string | null, Array<[string, string, string?, string?]>];
    void (async () => {
      for (const [id] of candidates) {
        if (!current) return;
        try {
          await completedDownloadById(id);
          if (current) setVerified({ key: completedKey, available: true });
          return;
        } catch {
          // Missing files and unavailable native checks must not promise offline access.
        }
      }
      if (current) setVerified({ key: completedKey, available: false });
    })();
    return () => {
      current = false;
    };
  }, [online, completedKey]);

  useEffect(() => {
    if (routed.current || !hasSaved) return;
    routed.current = true;
    setView("downloads");
  }, [hasSaved, setView]);

  if (online) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-50 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-edge-soft bg-elevated/95 py-2 ps-4 pe-2 shadow-[0_8px_28px_-8px_rgba(0,0,0,0.55)] backdrop-blur-md">
        <WifiOff size={14} strokeWidth={2.2} className="text-ink-subtle" />
        <span role="status" className="text-[12.5px] font-medium text-ink-muted">
          {hasSaved ? t("You're offline. Saved downloads are available.") : t("You're offline")}
        </span>
        {hasSaved && view !== "downloads" ? (
          <button
            onClick={() => setView("downloads")}
            className="rounded-full bg-ink px-3 py-1 text-[12px] font-semibold text-canvas transition-opacity hover:opacity-90"
          >
            {t("nav.downloads")}
          </button>
        ) : (
          <span className="w-1.5" />
        )}
      </div>
    </div>
  );
}
