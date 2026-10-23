import { useEffect, useState } from "react";
import { ArgusEyeLoader } from "@/components/argus-eye-loader";

export function EyeOverlay({
  visible,
  onDismiss,
}: {
  reduce?: boolean;
  visible: boolean;
  onDismiss: () => void;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      role="presentation"
      aria-hidden
      onPointerDown={(e) => {
        e.preventDefault();
        onDismiss();
      }}
      className="fixed inset-0 z-[200] flex cursor-none select-none items-center justify-center overflow-hidden bg-black"
      style={{
        opacity: visible && ready ? 1 : 0,
        transition: `opacity ${visible ? 900 : 420}ms ease-out`,
        willChange: "opacity",
      }}
    >
      <ArgusEyeLoader className="h-[min(46vh,46vw)] w-[min(46vh,46vw)] text-white/85" />
    </div>
  );
}
