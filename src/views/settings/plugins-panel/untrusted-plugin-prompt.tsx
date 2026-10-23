import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/lib/i18n";
import {
  setUntrustedPluginPrompt,
  type UntrustedPluginInfo,
} from "@/lib/streams/plugins/trust";
import { SButton } from "../ui";

type Pending = { info: UntrustedPluginInfo; settle: (ok: boolean) => void };

/** Answers the install flow's question for a plugin that is unsigned, or signed with a key the user
 * has not accepted before. Mounted with the plugins panel, which is where installs are started. */
export function UntrustedPluginPrompt() {
  const t = useT();
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    setUntrustedPluginPrompt(
      (info) =>
        new Promise<boolean>((resolve) => {
          setPending((prior) => {
            prior?.settle(false);
            return { info, settle: resolve };
          });
        }),
    );
    return () => {
      setUntrustedPluginPrompt(null);
      setPending((prior) => {
        prior?.settle(false);
        return null;
      });
    };
  }, []);

  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      pending.settle(false);
      setPending(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending]);

  if (!pending) return null;
  const { info } = pending;
  const answer = (ok: boolean) => {
    pending.settle(ok);
    setPending(null);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[240] flex items-center justify-center bg-black/60 px-6"
      onClick={() => answer(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-edge bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[17px] font-semibold text-ink">{info.name}</h2>
        <p className="text-[14px] leading-relaxed text-ink-muted">
          {t(
            "Third-party community plugin: runs in sandbox with restricted network access. Install anyway?",
          )}
        </p>
        <dl className="flex flex-col gap-1 text-[13px] text-ink-muted">
          {info.author ? (
            <div>
              <dt className="inline text-ink-subtle">{t("Author")}: </dt>
              <dd className="inline">{info.author}</dd>
            </div>
          ) : null}
          <div>
            <dt className="inline text-ink-subtle">{t("Can reach")}: </dt>
            <dd className="inline break-all">{info.hosts.join(", ")}</dd>
          </div>
          <div>
            <dt className="inline text-ink-subtle">{t("Signature")}: </dt>
            <dd className="inline break-all">
              {info.signer ? info.signer : t("Unsigned")}
            </dd>
          </div>
        </dl>
        <div className="flex justify-end gap-2">
          <SButton onClick={() => answer(false)}>{t("Cancel")}</SButton>
          <SButton variant="primary" onClick={() => answer(true)}>
            {t("Install anyway")}
          </SButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
