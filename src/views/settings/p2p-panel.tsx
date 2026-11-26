import { useState } from "react";
import { isIPadOS, isIOS, isWeb } from "@/lib/platform";
import { useT } from "@/lib/i18n";
import { useSubTabs } from "./sub-tabs";
import {
  LocalEngineSection,
  P2PPowerToolsSection,
  RemoteServerSection,
  ServerAddressSection,
} from "./player-panel";
import { WebStreamRelaySection } from "./player-panel/web-stream-relay-section";

type Tab = "engine" | "server";

export function P2PPanel() {
  const t = useT();
  const [tab, setTab] = useState<Tab>("engine");
  const tabs = [
    { id: "engine" as const, label: t("Engine") },
    { id: "server" as const, label: t("Server") },
  ];
  useSubTabs(tabs, tab, (id) => setTab(id as Tab));
  return (
    <div key={tab} className="argus-cascade flex flex-col gap-10">
      {tab === "engine" &&
        ((isIOS() || isIPadOS()) && isWeb() ? (
          <p className="max-w-prose text-ink-muted">
            {t(
              "The local P2P engine is unavailable in this build. You can connect a streaming server in the Server tab.",
            )}
          </p>
        ) : (
          <>
            <LocalEngineSection />
            <P2PPowerToolsSection />
          </>
        ))}
      {tab === "server" && (
        <>
          <WebStreamRelaySection />
          <ServerAddressSection />
          <RemoteServerSection />
        </>
      )}
    </div>
  );
}
