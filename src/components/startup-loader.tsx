import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArgusLoader } from "@/components/argus-loader";

export function StartupLoader({ ready, onComplete }: { ready: boolean; onComplete: () => void }) {
  const [animationReady, setAnimationReady] = useState(false);
  const handleAnimationReady = useCallback(() => setAnimationReady(true), []);
  const host = document.getElementById("argus-boot");

  useEffect(() => {
    if (!host || !ready || !animationReady) return;
    const frame = requestAnimationFrame(onComplete);
    return () => cancelAnimationFrame(frame);
  }, [animationReady, host, onComplete, ready]);

  if (!host) return null;
  // md matches every other full-screen loader (play transition, player), so
  // the boat doesn't visibly shrink when the next loading screen appears.
  return createPortal(<ArgusLoader size="md" onReady={handleAnimationReady} />, host);
}
