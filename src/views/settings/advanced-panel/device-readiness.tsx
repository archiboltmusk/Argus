import { useEffect, useState } from "react";
import fixture from "@/assets/readiness.webm";
import { probeVideoDecode } from "@/lib/player/device-readiness";
import { useT } from "@/lib/i18n";
export function DeviceReadiness() {
  const t = useT();
  const [decoded, setDecoded] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const network = () => setOnline(navigator.onLine);
    const key = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"].includes(event.key))
        setInput(true);
    };
    window.addEventListener("online", network);
    window.addEventListener("offline", network);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("online", network);
      window.removeEventListener("offline", network);
      window.removeEventListener("keydown", key);
    };
  }, []);
  return (
    <section className="rounded-xl border border-edge p-5 text-ink">
      <h2 className="text-lg font-semibold">{t("Device readiness")}</h2>
      <p className="my-3 text-sm">
        {t(online ? "Network connection detected" : "Offline: saved files remain available")}
      </p>
      <p className="my-3 text-sm">
        {t(
          input
            ? "Navigation input received"
            : "Press an arrow or OK / Enter to check your remote or keyboard.",
        )}
      </p>
      <button
        type="button"
        disabled={busy}
        className="rounded-lg border border-edge px-4 py-3"
        onClick={() => {
          setBusy(true);
          void probeVideoDecode(fixture)
            .then(setDecoded)
            .finally(() => setBusy(false));
        }}
      >
        {busy ? t("Checking…") : t("Test video decoding")}
      </button>
      {decoded !== null && (
        <p role="status" className="mt-3 text-sm">
          {t(
            decoded
              ? "The web player decoded the local test video."
              : "The web player could not decode the local test video.",
          )}
        </p>
      )}
      <p className="mt-3 text-sm text-ink-subtle">
        {t(
          "This checks a small VP8 video, not 4K, HDR or the native decoder. Actual stream formats are checked during playback. Check Downloads for disk space and saved files.",
        )}
      </p>
    </section>
  );
}
