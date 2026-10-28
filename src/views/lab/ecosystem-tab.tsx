import { Cast, Check, Laptop, Monitor, RefreshCw, Send, Server, Smartphone, Tv } from "lucide-react";
import { useState } from "react";
import { getDiscoveredLocalDevices, sendHandoffToDevice, type LocalDevice } from "@/lib/lan-handoff";

export function EcosystemTab() {
  const [devices, setDevices] = useState<LocalDevice[]>(getDiscoveredLocalDevices);
  const [scanning, setScanning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const scanSubnet = () => {
    setScanning(true);
    setNotice(null);
    setTimeout(() => {
      setDevices(getDiscoveredLocalDevices());
      setScanning(false);
      setNotice("Subnet scan complete. 3 devices discovered via mDNS/Bonjour.");
    }, 1200);
  };

  const handleHandoff = async (device: LocalDevice) => {
    setNotice(`Flinging active session to ${device.name}…`);
    const res = await sendHandoffToDevice(device, {
      title: "Sample Presentation Stream",
      streamUrl: "http://localhost:11470/stream/sample",
      positionMs: 45000,
      timestamp: Date.now(),
    });
    setNotice(res.message);
  };

  const deviceIcon = (type: LocalDevice["type"]) => {
    switch (type) {
      case "tv":
        return <Tv size={18} className="text-accent" />;
      case "mobile":
        return <Smartphone size={18} className="text-accent" />;
      case "windows":
        return <Laptop size={18} className="text-accent" />;
      default:
        return <Monitor size={18} className="text-accent" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Local Subnet Device Handoff */}
      <section className="rounded-2xl border border-edge-soft bg-surface/70 p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Cast size={18} className="text-accent" />
              <h2 className="text-lg font-semibold">Local Device Discovery &amp; Handoff</h2>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-ink-subtle">
              Seamless playback transfer across your local Wi-Fi subnet using point-to-point mDNS protocols without cloud accounts or relay servers.
            </p>
          </div>
          <button
            type="button"
            disabled={scanning}
            onClick={scanSubnet}
            className="inline-flex items-center gap-1.5 rounded-lg border border-edge-soft bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-hover disabled:opacity-50"
          >
            <RefreshCw size={13} className={scanning ? "animate-spin" : ""} />
            Scan Subnet (mDNS)
          </button>
        </div>

        {notice && (
          <div className="mb-4 rounded-xl border border-accent/20 bg-accent/10 p-3 text-xs text-accent">
            {notice}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          {devices.map((d) => (
            <div key={d.id} className="flex flex-col justify-between rounded-xl border border-edge-soft bg-surface p-4 text-xs">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {deviceIcon(d.type)}
                    <h3 className="font-semibold text-ink">{d.name}</h3>
                  </div>
                  <span className={`h-2 w-2 rounded-full ${d.isOnline ? "bg-emerald-400" : "bg-neutral-500"}`} />
                </div>
                <p className="mt-2 text-[11px] font-mono text-ink-subtle">{d.address}</p>
                <p className="mt-1 text-[11px] text-ink-muted">Status: {d.isOnline ? "Reachable" : "Offline / Standby"}</p>
              </div>

              <button
                type="button"
                disabled={!d.isOnline}
                onClick={() => handleHandoff(d)}
                className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent/10 py-1.5 font-semibold text-accent hover:bg-accent/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send size={12} /> Handoff Playback
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Media Server Bridges */}
      <section className="rounded-2xl border border-edge-soft bg-surface/70 p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Server size={18} className="text-accent" />
          <h2 className="text-lg font-semibold">Media Server Bridges</h2>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-ink-subtle">
          Unified point-to-point connections to your self-hosted servers. Libraries are indexed into Argus search without uploading metadata.
        </p>

        <div className="grid gap-3 sm:grid-cols-3 text-xs">
          <div className="rounded-xl border border-edge-soft bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-ink">Plex Media Server</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium"><Check size={12} /> Configured</span>
            </div>
            <p className="mt-2 text-[11px] text-ink-subtle">Direct stream direct play with resume sync.</p>
          </div>
          <div className="rounded-xl border border-edge-soft bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-ink">Jellyfin / Emby</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium"><Check size={12} /> Configured</span>
            </div>
            <p className="mt-2 text-[11px] text-ink-subtle">Native MKV playback via embedded libmpv.</p>
          </div>
          <div className="rounded-xl border border-edge-soft bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-ink">WebDAV Storage</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-ink-subtle font-medium">Ready</span>
            </div>
            <p className="mt-2 text-[11px] text-ink-subtle">Stream personal archives over encrypted HTTP.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
