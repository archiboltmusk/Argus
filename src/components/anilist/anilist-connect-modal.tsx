import { Check, ChevronDown, ExternalLink, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ModalShell, useModalExit } from "@/components/modal-shell";
import { useT } from "@/lib/i18n";
import {
  ANILIST_CLIENT_ID,
  ANILIST_DEVELOPER_URL,
  ANILIST_PIN_REDIRECT_URI,
  getAnilistClientId,
  setAnilistClientId,
} from "@/lib/anilist/config";
import { useAnilist } from "@/lib/anilist/provider";
import { openUrl } from "@/lib/window";

export function AnilistConnectModal({ onClose }: { onClose: () => void }) {
  const { connectState, beginConnect, submitCode, cancelConnect } = useAnilist();
  const t = useT();
  const [draftCode, setDraftCode] = useState("");
  const [showCustomApp, setShowCustomApp] = useState(false);
  const [customClientId, setCustomClientId] = useState(() => {
    const cur = getAnilistClientId();
    return cur === ANILIST_CLIENT_ID ? "" : cur;
  });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    beginConnect();
  }, [beginConnect]);

  const doneRef = useRef(false);
  const finish = useCallback(() => {
    if (!doneRef.current) cancelConnect();
    onClose();
  }, [cancelConnect, onClose]);
  const { closing, close: onCancel } = useModalExit(finish);

  useEffect(() => {
    if (connectState.kind === "success") {
      doneRef.current = true;
      const id = setTimeout(onCancel, 1400);
      return () => clearTimeout(id);
    }
  }, [connectState.kind, onCancel]);

  const verify = () => {
    if (draftCode.trim()) submitCode(draftCode);
  };

  const applyCustomClientAndReopen = () => {
    setAnilistClientId(customClientId);
    beginConnect();
  };

  const heading =
    connectState.kind === "success"
      ? t("Connected")
      : connectState.kind === "verifying"
        ? t("Verifying")
        : t("Authorize Argus on AniList");

  return (
    <ModalShell closing={closing} onDismiss={onCancel}>
      <div className="flex items-start gap-4 px-6 pt-6">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-ink-subtle">
            {t("Connect AniList")}
          </span>
          <h2 className="text-[17px] font-semibold tracking-tight text-ink">{heading}</h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-ink-subtle transition-colors hover:bg-elevated hover:text-ink"
          aria-label={t("Cancel")}
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6">
        {connectState.kind === "idle" && (
          <p className="flex items-center gap-2 text-[13px] text-ink-muted">
            <Loader2 size={13} className="animate-spin" />
            {t("Opening AniList...")}
          </p>
        )}

        {(connectState.kind === "needs-code" || connectState.kind === "error") && (
          <>
            {connectState.kind === "error" && (
              <div className="flex flex-col gap-1 rounded-md bg-canvas px-4 py-3.5">
                <span className="text-[13.5px] font-semibold text-danger">
                  {t("Couldn't connect to AniList")}
                </span>
                <span className="text-[12.5px] leading-relaxed text-ink-muted">
                  {connectState.message}
                </span>
              </div>
            )}
            <p className="text-[13px] leading-relaxed text-ink-muted">
              {t(
                "A browser tab opened on AniList. Approve Argus there, then copy the token it shows and paste it below.",
              )}
            </p>
            <textarea
              value={draftCode}
              onChange={(e) => setDraftCode(e.target.value)}
              placeholder={t("Paste the token from AniList")}
              autoFocus
              spellCheck={false}
              rows={3}
              className="resize-none rounded-md bg-canvas px-4 py-3 font-mono text-[12.5px] leading-relaxed text-ink outline-none placeholder:font-sans placeholder:text-ink-subtle/55"
            />
            <div className="flex flex-col gap-2 border-t border-edge-soft/60 pt-2">
              <button
                type="button"
                onClick={() => setShowCustomApp((v) => !v)}
                className="inline-flex w-fit items-center gap-1.5 text-[12px] font-medium text-ink-subtle transition-colors hover:text-ink"
              >
                <ChevronDown
                  size={13}
                  className={`transition-transform ${showCustomApp ? "rotate-180" : ""}`}
                />
                {t("Use custom AniList Client ID")}
              </button>
              {showCustomApp && (
                <div className="flex flex-col gap-2 rounded-md bg-canvas p-3 text-[12px] text-ink-muted">
                  <p className="leading-relaxed">
                    {t("Redirect URI:")}{" "}
                    <code className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[11.5px] text-ink">
                      {ANILIST_PIN_REDIRECT_URI}
                    </code>{" "}
                    <button
                      type="button"
                      onClick={() => openUrl(ANILIST_DEVELOPER_URL)}
                      className="inline-flex items-center gap-1 text-accent hover:underline"
                    >
                      {t("AniList Developer Settings")}
                      <ExternalLink size={11} />
                    </button>
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customClientId}
                      onChange={(e) => setCustomClientId(e.target.value)}
                      placeholder={t("Client ID (leave blank for default)")}
                      className="h-8 flex-1 rounded bg-elevated/60 px-2.5 font-mono text-[12px] text-ink outline-none ring-1 ring-edge-soft focus:ring-edge"
                    />
                    <button
                      type="button"
                      onClick={applyCustomClientAndReopen}
                      className="h-8 rounded bg-elevated px-3 text-[12px] font-semibold text-ink hover:bg-raised"
                    >
                      {t("Save & Open")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {connectState.kind === "verifying" && (
          <p className="flex items-center gap-2 text-[13px] text-ink-muted">
            <Loader2 size={13} className="animate-spin" />
            {t("Checking with AniList...")}
          </p>
        )}

        {connectState.kind === "success" && (
          <div className="flex items-center gap-3 rounded-md bg-canvas px-4 py-3.5">
            <Check size={16} strokeWidth={2.4} className="shrink-0 text-success" />
            <span className="text-[13px] text-ink">
              {connectState.session.userName
                ? t("Connected as {username}", { username: connectState.session.userName })
                : t("Connected to AniList")}
            </span>
          </div>
        )}
      </div>

      {(connectState.kind === "needs-code" || connectState.kind === "error") && (
        <div className="flex items-center justify-end gap-2 px-6 pb-6">
          <button
            type="button"
            onClick={beginConnect}
            className="argus-press-pop flex h-9 items-center gap-1.5 rounded-md bg-elevated px-4 text-[12.5px] font-semibold text-ink-muted transition-colors hover:text-ink"
          >
            {t("Open AniList again")}
            <ExternalLink size={12} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            onClick={verify}
            disabled={!draftCode.trim()}
            className="argus-press-pop h-9 rounded-md bg-ink px-4 text-[12.5px] font-semibold text-canvas transition-colors hover:opacity-90 disabled:opacity-40"
          >
            {t("Connect")}
          </button>
        </div>
      )}
    </ModalShell>
  );
}
