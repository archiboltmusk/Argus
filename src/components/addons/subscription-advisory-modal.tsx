import { useState } from "react";
import { Lock, X } from "lucide-react";
import { ModalShell, useModalExit } from "@/components/modal-shell";
import { useT } from "@/lib/i18n";

export interface SubscriptionAdvisoryProps {
  addonName: string;
  reason?: string;
  onConfirm: (hasSubscription: boolean) => void;
  onCancel: () => void;
}

export function SubscriptionAdvisoryModal({
  addonName,
  reason,
  onConfirm,
  onCancel,
}: SubscriptionAdvisoryProps) {
  const t = useT();
  const { closing, close } = useModalExit(onCancel);
  const [hasSubscription, setHasSubscription] = useState(true);

  return (
    <ModalShell closing={closing} onDismiss={close} width={480} labelledBy="sub-advisory-title">
      <div className="relative flex flex-col gap-4 p-6">
        <button
          type="button"
          onClick={close}
          aria-label={t("Cancel")}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-ink-subtle transition-colors hover:bg-raised hover:text-ink"
        >
          <X size={18} strokeWidth={2.2} />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/30">
            <Lock size={24} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
              {t("Commercial Add-on")}
            </span>
            <h2 id="sub-advisory-title" className="text-[18px] font-bold tracking-tight text-ink truncate">
              {addonName}
            </h2>
          </div>
        </div>

        <div className="rounded-xl border border-edge-soft bg-raised/40 p-3.5 text-[13px] leading-relaxed text-ink-muted">
          <p className="font-medium text-ink">
            {t("Subscription Required")}
          </p>
          <p className="mt-1 text-ink-muted">
            {reason ||
              t(
                "This add-on requires an active paid membership or external subscription. Without a paid account, it returns payment and trial reminders instead of playable streams.",
              )}
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-edge/60 bg-surface/50 p-3 text-[13px] transition hover:border-edge">
          <input
            type="checkbox"
            checked={hasSubscription}
            onChange={(e) => setHasSubscription(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded accent-accent"
          />
          <span className="leading-snug text-ink">
            <strong className="block font-semibold text-ink">
              {t("I have an active paid subscription")}
            </strong>
            <span className="text-[12px] text-ink-subtle">
              {t("Enable playback stream queries for this add-on.")}
            </span>
          </span>
        </label>

        <div className="mt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={close}
            className="h-10 rounded-xl px-4 text-[13.5px] font-semibold text-ink-muted transition hover:bg-raised hover:text-ink"
          >
            {t("Cancel")}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(hasSubscription)}
            className="flex h-10 items-center gap-2 rounded-xl bg-accent px-5 text-[13.5px] font-semibold text-canvas transition-[filter] hover:brightness-105"
          >
            {t("Continue & Install")}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
