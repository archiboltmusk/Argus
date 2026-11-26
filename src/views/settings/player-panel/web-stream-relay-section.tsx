import { useState } from "react";
import { Check, Globe, Loader2, Server, X } from "../icons";
import { SettingRow, ROW_ACTION, ROW_ACTION_PRIMARY } from "../kit";
import {
  getWebCompanionUrl,
  getWebRelayUrl,
  setWebCompanionUrl,
  setWebRelayUrl,
} from "@/lib/stream-proxy";
import { isWeb } from "@/lib/platform";
import { useT } from "@/lib/i18n";

type ProbeResult = "idle" | "checking" | "ok" | "error";

const FIELD =
  "h-11 min-w-[220px] max-w-[420px] flex-1 rounded-[10px] border border-edge-soft bg-elevated px-3.5 text-[15px] text-ink outline-none placeholder:text-ink-subtle/55 focus-visible:border-edge focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function WebStreamRelaySection() {
  const t = useT();
  const [relayDraft, setRelayDraft] = useState(() => getWebRelayUrl());
  const [companionDraft, setCompanionDraft] = useState(() => getWebCompanionUrl());
  const [relayProbe, setRelayProbe] = useState<ProbeResult>("idle");
  const [companionProbe, setCompanionProbe] = useState<ProbeResult>("idle");

  if (!isWeb()) return null;

  const probeEndpoint = async (
    baseUrl: string,
    setState: (s: ProbeResult) => void,
    saveFn: (u: string) => void,
  ) => {
    const clean = baseUrl.trim().replace(/\/+$/, "");
    saveFn(clean);
    if (!clean) {
      setState("idle");
      return;
    }
    setState("checking");
    try {
      const res = await fetch(`${clean}/health`, { signal: AbortSignal.timeout(5000) });
      setState(res.ok ? "ok" : "error");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-[18px] font-semibold tracking-tight text-ink">
          {t("Web stream relay & transcode")}
        </h3>
        <p className="text-[14px] text-ink-muted">
          {t(
            "Configure an edge CORS relay or companion FFmpeg server to play MKV, AC3/DTS, and header-gated streams in a web browser.",
          )}
        </p>
      </div>

      <SettingRow
        icon={<Globe size={18} />}
        label={t("Web CORS & HLS relay URL")}
        desc={t(
          "Cloudflare Worker or HTTP proxy URL (workers/stream-relay) for bypassing browser CORS and forwarding stream headers.",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="url"
            value={relayDraft}
            onChange={(e) => {
              setRelayDraft(e.target.value);
              setRelayProbe("idle");
            }}
            placeholder="https://argus-stream-relay.example.workers.dev"
            spellCheck={false}
            aria-label={t("Web CORS & HLS relay URL")}
            className={FIELD}
          />
          <button
            type="button"
            onClick={() => void probeEndpoint(relayDraft, setRelayProbe, setWebRelayUrl)}
            className={ROW_ACTION_PRIMARY}
          >
            {relayProbe === "checking" && <Loader2 size={15} className="animate-spin" />}
            {relayProbe === "ok" && <Check size={15} />}
            {relayProbe === "error" && <X size={15} />}
            {t("Save & test")}
          </button>
          {relayDraft && (
            <button
              type="button"
              onClick={() => {
                setRelayDraft("");
                setWebRelayUrl("");
                setRelayProbe("idle");
              }}
              className={ROW_ACTION}
            >
              {t("Clear")}
            </button>
          )}
        </div>
      </SettingRow>

      <SettingRow
        icon={<Server size={18} />}
        label={t("Web companion transcode server")}
        desc={t(
          "Self-hosted Argus Companion server URL (companion/server.mjs) for real-time H.264/AAC remuxing and transcoding.",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="url"
            value={companionDraft}
            onChange={(e) => {
              setCompanionDraft(e.target.value);
              setCompanionProbe("idle");
            }}
            placeholder="http://localhost:8787"
            spellCheck={false}
            aria-label={t("Web companion transcode server")}
            className={FIELD}
          />
          <button
            type="button"
            onClick={() => void probeEndpoint(companionDraft, setCompanionProbe, setWebCompanionUrl)}
            className={ROW_ACTION_PRIMARY}
          >
            {companionProbe === "checking" && <Loader2 size={15} className="animate-spin" />}
            {companionProbe === "ok" && <Check size={15} />}
            {companionProbe === "error" && <X size={15} />}
            {t("Save & test")}
          </button>
          {companionDraft && (
            <button
              type="button"
              onClick={() => {
                setCompanionDraft("");
                setWebCompanionUrl("");
                setCompanionProbe("idle");
              }}
              className={ROW_ACTION}
            >
              {t("Clear")}
            </button>
          )}
        </div>
      </SettingRow>
    </div>
  );
}
